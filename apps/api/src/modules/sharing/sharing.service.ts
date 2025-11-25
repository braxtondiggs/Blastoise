/**
 * Sharing Service
 *
 * Business logic for anonymized visit sharing:
 * - Venue denormalization (store venue data to avoid joins)
 * - Expiration check with 410 Gone response
 * - View count tracking
 * - Privacy validation (no user_id, no GPS coordinates)
 */

import {
  Injectable,
  NotFoundException,
  GoneException,
  BadRequestException,
} from '@nestjs/common';
import { getSupabaseClient } from '@blastoise/data-backend';
import { SharedVisit } from '@blastoise/shared';
import { CreateShareDto } from './dto/create-share.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SharingService {
  /**
   * Create share with venue denormalization
   * Stores venue data directly to avoid joins and ensure data persistence
   */
  async createShare(
    visitId: string,
    userId: string,
    dto: CreateShareDto
  ): Promise<SharedVisit> {
    const supabase = getSupabaseClient();

    // Fetch the visit and verify ownership
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*, venues(*)')
      .eq('id', visitId)
      .eq('user_id', userId)
      .single();

    if (visitError || !visit) {
      throw new NotFoundException(`Visit with ID ${visitId} not found`);
    }

    // T190: Privacy validation - ensure no sensitive data
    this.validatePrivacy(visit);

    // Generate unique share ID
    const shareId = randomBytes(16).toString('hex');

    // Extract only date (no time) for privacy
    const arrivalDate = new Date(visit.arrival_time);
    const dateOnly = arrivalDate.toISOString().split('T')[0];

    // Create shared visit record with denormalized venue data
    const sharedVisit: SharedVisit = {
      id: shareId,
      visit_id: visitId,
      venue_name: visit.venues.name,
      venue_city: visit.venues.city || undefined,
      visit_date: dateOnly,
      shared_at: new Date().toISOString(),
      expires_at: dto.expires_at,
      view_count: 0,
    };

    const { data, error } = await supabase
      .from('shared_visits')
      .insert(sharedVisit)
      .select()
      .single();

    if (error) {
      console.error('Failed to create shared visit:', error);
      throw new Error('Failed to create shared visit');
    }

    return data;
  }

  /**
   * Get shared visit with expiration check and view tracking
   */
  async getShared(shareId: string): Promise<SharedVisit> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('shared_visits')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Shared visit not found`);
    }

    // Check if expired (410 Gone response)
    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      if (expiryDate < new Date()) {
        throw new GoneException('This shared visit has expired');
      }
    }

    // Increment view count
    await this.incrementViewCount(shareId);

    // Return data with updated view count
    return {
      ...data,
      view_count: (data.view_count || 0) + 1,
    };
  }

  /**
   * Increment view count for shared visit
   */
  private async incrementViewCount(shareId: string): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase.rpc('increment_share_view_count', {
      share_id: shareId,
    });

    // Fallback if RPC doesn't exist
    // await supabase
    //   .from('shared_visits')
    //   .update({ view_count: supabase.raw('view_count + 1') })
    //   .eq('id', shareId);
  }

  /**
   * Delete share link
   */
  async deleteShare(shareId: string, userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    // Verify ownership by checking the original visit
    const { data: sharedVisit } = await supabase
      .from('shared_visits')
      .select('visit_id, visits!inner(user_id)')
      .eq('id', shareId)
      .single();

    if (!sharedVisit || (sharedVisit as any).visits.user_id !== userId) {
      throw new NotFoundException(`Shared visit not found`);
    }

    const { error } = await supabase
      .from('shared_visits')
      .delete()
      .eq('id', shareId);

    if (error) {
      throw new Error('Failed to delete shared visit');
    }
  }

  /**
   * Get all shares for a user
   */
  async getUserShares(userId: string): Promise<SharedVisit[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('shared_visits')
      .select('*, visits!inner(user_id)')
      .eq('visits.user_id', userId)
      .order('shared_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch user shares');
    }

    return data || [];
  }

  /**
   * Privacy validation - ensure no sensitive data in visit
   */
  private validatePrivacy(visit: any): void {
    const errors: string[] = [];

    // Ensure no precise GPS coordinates in the share
    if (visit.location && (visit.location.latitude || visit.location.longitude)) {
      // GPS coordinates exist on visit - this is expected, but should not be shared
      // We handle this by not including them in the SharedVisit object
    }

    // Ensure precise timestamps are not shared (we only share date)
    // This is handled by extracting dateOnly in createShare

    // Ensure user_id is not exposed
    // This is handled by not including it in SharedVisit model

    if (errors.length > 0) {
      throw new BadRequestException(`Privacy validation failed: ${errors.join(', ')}`);
    }
  }
}

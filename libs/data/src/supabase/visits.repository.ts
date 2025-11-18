import { Injectable } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import { Visit, CreateVisitDto, UpdateVisitDto } from '@blastoise/shared';

@Injectable({
  providedIn: 'root',
})
export class VisitsRepository {
  private supabase = getSupabaseClient();

  async create(visit: CreateVisitDto): Promise<Visit> {
    const { data, error } = await this.supabase
      .from('visits')
      .insert(visit)
      .select()
      .single();

    if (error) throw new Error(`Failed to create visit: ${error.message}`);
    return data as Visit;
  }

  async findById(id: string): Promise<Visit | null> {
    const { data, error } = await this.supabase
      .from('visits')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find visit: ${error.message}`);
    }
    return data as Visit | null;
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Visit[]> {
    const { data, error } = await this.supabase
      .from('visits')
      .select(`
        *,
        venue:venues(*)
      `)
      .eq('user_id', userId)
      .order('arrival_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to find visits: ${error.message}`);

    // Flatten venue metadata into top-level properties
    const visitsWithFlattenedVenues = data?.map((visit: any) => {
      if (visit.venue && visit.venue.metadata) {
        return {
          ...visit,
          venue: {
            ...visit.venue,
            address: visit.venue.metadata.address,
            postal_code: visit.venue.metadata.postal_code,
          }
        };
      }
      return visit;
    }) || [];

    return visitsWithFlattenedVenues as Visit[];
  }

  async update(id: string, updates: Partial<UpdateVisitDto>): Promise<Visit> {
    const { data, error } = await this.supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update visit: ${error.message}`);
    return data as Visit;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('visits').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete visit: ${error.message}`);
  }

  async batchCreate(visits: CreateVisitDto[]): Promise<Visit[]> {
    const { data, error } = await this.supabase
      .from('visits')
      .insert(visits)
      .select();

    if (error) throw new Error(`Failed to batch create visits: ${error.message}`);
    return data as Visit[];
  }

  async countByUserId(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to count visits: ${error.message}`);
    return count || 0;
  }

  async findActiveByUserId(userId: string): Promise<Visit | null> {
    const { data, error } = await this.supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('arrival_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find active visit: ${error.message}`);
    }
    return data as Visit | null;
  }
}

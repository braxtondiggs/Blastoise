import { getSupabaseClient } from './supabase.client';
import { Venue } from '@blastoise/shared';

export class VenuesRepository {
  private supabase = getSupabaseClient();

  async findById(id: string): Promise<Venue | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find venue: ${error.message}`);
    }
    return data as Venue | null;
  }

  async search(query: string, limit = 20): Promise<Venue[]> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) throw new Error(`Failed to search venues: ${error.message}`);
    return data as Venue[];
  }

  async findByType(venueType: 'brewery' | 'winery', limit = 50): Promise<Venue[]> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('venue_type', venueType)
      .limit(limit);

    if (error) throw new Error(`Failed to find venues by type: ${error.message}`);
    return data as Venue[];
  }

  async findAll(limit = 10000): Promise<Venue[]> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .limit(limit);

    if (error) throw new Error(`Failed to find all venues: ${error.message}`);
    return data as Venue[];
  }
}

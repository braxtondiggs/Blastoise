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
    const { data, error} = await this.supabase
      .from('venues')
      .select('*')
      .limit(limit);

    if (error) throw new Error(`Failed to find all venues: ${error.message}`);
    return data as Venue[];
  }

  async create(venue: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> {
    const { data, error } = await this.supabase
      .from('venues')
      .insert(venue)
      .select()
      .single();

    if (error) throw new Error(`Failed to create venue: ${error.message}`);
    return data as Venue;
  }

  /**
   * Find venue by Google Place ID
   * Used for exact matching during Timeline import
   */
  async findByGooglePlaceId(placeId: string): Promise<Venue | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .eq('google_place_id', placeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find venue by Place ID: ${error.message}`);
    }
    return data as Venue | null;
  }

  /**
   * Find venues within proximity radius
   * Uses Haversine formula to calculate distance
   * Note: This is a simplified implementation. For production, use PostGIS.
   */
  async findByProximity(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<Venue[]> {
    // Approximate degrees per meter (varies by latitude, but good enough for 100m)
    // At equator: 1 degree ≈ 111km
    const latDegrees = radiusMeters / 111000;
    const lngDegrees = radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

    // Get venues in bounding box (rough filter)
    const { data, error } = await this.supabase
      .from('venues')
      .select('*')
      .gte('latitude', latitude - latDegrees)
      .lte('latitude', latitude + latDegrees)
      .gte('longitude', longitude - lngDegrees)
      .lte('longitude', longitude + lngDegrees);

    if (error) {
      throw new Error(`Failed to find venues by proximity: ${error.message}`);
    }

    // Filter by exact Haversine distance
    const venues = (data as Venue[]) || [];
    return venues.filter((venue) => {
      const distance = this.haversineDistance(
        latitude,
        longitude,
        venue.latitude,
        venue.longitude
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

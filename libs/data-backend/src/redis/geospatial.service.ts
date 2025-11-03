import { getRedisClient } from './redis.client';
import { Coordinates } from '@blastoise/shared';

export interface VenueProximityResult {
  venueId: string;
  distance: number; // in kilometers
  latitude: number;
  longitude: number;
}

export class GeospatialService {
  private readonly VENUE_GEO_KEY = 'venues:geo';

  /**
   * Add a venue to the geospatial index
   */
  async addVenue(
    venueId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const client = await getRedisClient();
    await client.geoAdd(this.VENUE_GEO_KEY, {
      longitude,
      latitude,
      member: venueId,
    });
  }

  /**
   * Add multiple venues to the geospatial index in batch
   */
  async addVenues(
    venues: Array<{ id: string; latitude: number; longitude: number }>
  ): Promise<void> {
    const client = await getRedisClient();
    const members = venues.map((v) => ({
      longitude: v.longitude,
      latitude: v.latitude,
      member: v.id,
    }));
    await client.geoAdd(this.VENUE_GEO_KEY, members);
  }

  /**
   * Find venues within a radius of a coordinate
   * @param center - Center coordinates
   * @param radiusKm - Radius in kilometers
   * @param limit - Maximum number of results (default 50)
   * @returns Array of venue IDs with distances
   */
  async findNearby(
    center: Coordinates,
    radiusKm: number,
    limit = 50
  ): Promise<VenueProximityResult[]> {
    const client = await getRedisClient();

    try {
      const results: any = await client.geoSearch(
        this.VENUE_GEO_KEY,
        { longitude: center.longitude, latitude: center.latitude },
        { radius: radiusKm, unit: 'km' },
        {
          WITHCOORD: true,
          WITHDIST: true,
          COUNT: limit,
        } as any
      );

      if (!results || results.length === 0) {
        return [];
      }

      return results.map((result: any) => ({
        venueId: result.member || result,
        distance: result.distance ? parseFloat(result.distance) : 0,
        latitude: result.coordinates?.latitude || 0,
        longitude: result.coordinates?.longitude || 0,
      }));
    } catch (error) {
      console.error('Redis geoSearch error:', error);
      return [];
    }
  }

  /**
   * Check if a coordinate is within a certain distance of any venue
   * @param coords - Coordinates to check
   * @param radiusMeters - Geofence radius in meters (default 150)
   * @returns Nearest venue if within radius, null otherwise
   */
  async checkGeofence(
    coords: Coordinates,
    radiusMeters = 150
  ): Promise<VenueProximityResult | null> {
    const radiusKm = radiusMeters / 1000;
    const nearby = await this.findNearby(coords, radiusKm, 1);

    if (nearby.length > 0 && nearby[0].distance * 1000 <= radiusMeters) {
      return nearby[0];
    }

    return null;
  }

  /**
   * Get the distance between a coordinate and a venue
   */
  async getDistance(
    venueId: string,
    coords: Coordinates
  ): Promise<number | null> {
    const client = await getRedisClient();

    try {
      const distance = await client.geoDist(
        this.VENUE_GEO_KEY,
        venueId,
        `${coords.longitude},${coords.latitude}`,
        'km'
      );
      return distance;
    } catch (error) {
      console.error('Error getting distance:', error);
      return null;
    }
  }

  /**
   * Remove a venue from the geospatial index
   */
  async removeVenue(venueId: string): Promise<void> {
    const client = await getRedisClient();
    await client.zRem(this.VENUE_GEO_KEY, venueId);
  }

  /**
   * Clear all venues from the geospatial index
   */
  async clearAll(): Promise<void> {
    const client = await getRedisClient();
    await client.del(this.VENUE_GEO_KEY);
  }

  /**
   * Get total number of venues in the index
   */
  async count(): Promise<number> {
    const client = await getRedisClient();
    return client.zCard(this.VENUE_GEO_KEY);
  }
}

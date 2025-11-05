/**
 * Tests for distance utility functions including:
 * - Haversine distance calculation
 * - Unit conversions (km, meters, miles)
 * - Distance formatting
 * - Radius checking
 * - Sorting and finding nearest venues
 * - Bearing calculations
 */

import {
  calculateDistance,
  calculateDistanceMeters,
  calculateDistanceMiles,
  formatDistance,
  isWithinRadius,
  findNearest,
  sortByDistance,
  calculateBearing,
  getCompassDirection,
} from './distance.utils';
import type { Coordinates } from '../types/geolocation.types';

describe('Distance Utilities', () => {
  // Test coordinates
  const bend: Coordinates = { latitude: 44.0521, longitude: -121.3153 }; // Bend, OR
  const portland: Coordinates = { latitude: 45.5231, longitude: -122.6765 }; // Portland, OR
  const seattle: Coordinates = { latitude: 47.6062, longitude: -122.3321 }; // Seattle, WA

  describe('T169: Haversine Distance Calculation', () => {
    it('should calculate distance between two coordinates', () => {
      const distance = calculateDistance(bend, portland);

      // Distance from Bend to Portland is approximately 160-165 km
      expect(distance).toBeGreaterThan(150);
      expect(distance).toBeLessThan(170);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(bend, bend);
      expect(distance).toBe(0);
    });

    it('should calculate distance symmetrically', () => {
      const distance1 = calculateDistance(bend, portland);
      const distance2 = calculateDistance(portland, bend);

      expect(distance1).toBeCloseTo(distance2, 5);
    });

    it('should calculate short distances accurately (< 1 km)', () => {
      const nearby: Coordinates = {
        latitude: 44.0521,
        longitude: -121.3143, // ~0.1 km away
      };

      const distance = calculateDistance(bend, nearby);
      expect(distance).toBeLessThan(1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should calculate long distances accurately (> 1000 km)', () => {
      const newYork: Coordinates = { latitude: 40.7128, longitude: -74.006 };
      const distance = calculateDistance(bend, newYork);

      // Distance from Bend, OR to New York is approximately 3900-4000 km
      expect(distance).toBeGreaterThan(3800);
      expect(distance).toBeLessThan(4100);
    });

    it('should handle coordinates at the equator', () => {
      const equator1: Coordinates = { latitude: 0, longitude: 0 };
      const equator2: Coordinates = { latitude: 0, longitude: 1 };

      const distance = calculateDistance(equator1, equator2);

      // 1 degree at the equator is approximately 111 km
      expect(distance).toBeGreaterThan(110);
      expect(distance).toBeLessThan(112);
    });

    it('should handle coordinates near the poles', () => {
      const northPole: Coordinates = { latitude: 89, longitude: 0 };
      const nearPole: Coordinates = { latitude: 89, longitude: 90 };

      const distance = calculateDistance(northPole, nearPole);

      // Distance should be relatively small near the pole
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200);
    });

    it('should handle crossing the international date line', () => {
      const west: Coordinates = { latitude: 0, longitude: 179 };
      const east: Coordinates = { latitude: 0, longitude: -179 };

      const distance = calculateDistance(west, east);

      // 2 degrees at the equator
      expect(distance).toBeGreaterThan(220);
      expect(distance).toBeLessThan(224);
    });

    it('should handle negative coordinates', () => {
      const southAmerica: Coordinates = { latitude: -33.4489, longitude: -70.6693 }; // Santiago, Chile
      const africa: Coordinates = { latitude: -33.9249, longitude: 18.4241 }; // Cape Town, South Africa

      const distance = calculateDistance(southAmerica, africa);

      // Trans-Atlantic distance should be > 9000 km
      expect(distance).toBeGreaterThan(9000);
      expect(distance).toBeLessThan(11000);
    });
  });

  describe('Unit Conversions', () => {
    it('should convert kilometers to meters', () => {
      const meters = calculateDistanceMeters(bend, portland);
      const km = calculateDistance(bend, portland);

      expect(meters).toBeCloseTo(km * 1000, 0);
    });

    it('should convert kilometers to miles', () => {
      const miles = calculateDistanceMiles(bend, portland);
      const km = calculateDistance(bend, portland);

      expect(miles).toBeCloseTo(km * 0.621371, 2);
    });

    it('should handle small distances in meters', () => {
      const nearby: Coordinates = {
        latitude: 44.0521,
        longitude: -121.3143,
      };

      const meters = calculateDistanceMeters(bend, nearby);
      expect(meters).toBeGreaterThan(0);
      expect(meters).toBeLessThan(1000);
    });

    it('should handle large distances in miles', () => {
      const newYork: Coordinates = { latitude: 40.7128, longitude: -74.006 };
      const miles = calculateDistanceMiles(bend, newYork);

      // Approximately 2400-2500 miles
      expect(miles).toBeGreaterThan(2300);
      expect(miles).toBeLessThan(2600);
    });
  });

  describe('Distance Formatting', () => {
    it('should format short distances in meters (< 1 km)', () => {
      const formatted = formatDistance(0.5);
      expect(formatted).toBe('500 m');
    });

    it('should format medium distances with one decimal (1-10 km)', () => {
      const formatted = formatDistance(5.4);
      expect(formatted).toBe('5.4 km');
    });

    it('should format long distances as whole numbers (> 10 km)', () => {
      const formatted = formatDistance(15.7);
      expect(formatted).toBe('16 km');
    });

    it('should format very short distances in meters', () => {
      const formatted = formatDistance(0.05);
      expect(formatted).toBe('50 m');
    });

    it('should format imperial distances in feet (< 0.1 mi)', () => {
      const formatted = formatDistance(0.08, 'imperial'); // ~0.05 miles = 264 feet
      expect(formatted).toContain('ft');
    });

    it('should format imperial distances in miles with decimal', () => {
      const formatted = formatDistance(5, 'imperial'); // ~3.1 miles
      expect(formatted).toMatch(/\d+\.\d+ mi/);
    });

    it('should format long imperial distances as whole numbers', () => {
      const formatted = formatDistance(20, 'imperial'); // ~12 miles
      expect(formatted).toMatch(/\d+ mi$/);
      expect(formatted).not.toContain('.');
    });

    it('should handle zero distance', () => {
      const formatted = formatDistance(0);
      expect(formatted).toBe('0 m');
    });
  });

  describe('Radius Checking', () => {
    it('should return true for point within radius', () => {
      const nearby: Coordinates = {
        latitude: 44.0521,
        longitude: -121.3143,
      };

      const within = isWithinRadius(bend, nearby, 1); // 1 km radius
      expect(within).toBe(true);
    });

    it('should return false for point outside radius', () => {
      const within = isWithinRadius(bend, portland, 50); // 50 km radius
      expect(within).toBe(false);
    });

    it('should handle point exactly at radius boundary', () => {
      const distance = calculateDistance(bend, portland);
      const within = isWithinRadius(bend, portland, distance);

      expect(within).toBe(true);
    });

    it('should return true for identical coordinates', () => {
      const within = isWithinRadius(bend, bend, 0.001);
      expect(within).toBe(true);
    });

    it('should handle large radius values', () => {
      const within = isWithinRadius(bend, seattle, 10000); // 10,000 km radius
      expect(within).toBe(true);
    });
  });

  describe('Finding Nearest Venue', () => {
    const venues = [
      { id: '1', name: 'Portland Brewery', latitude: 45.5231, longitude: -122.6765 },
      { id: '2', name: 'Eugene Brewery', latitude: 44.0521, longitude: -123.0868 },
      { id: '3', name: 'Seattle Brewery', latitude: 47.6062, longitude: -122.3321 },
    ];

    it('should find the nearest venue', () => {
      const nearest = findNearest(bend, venues);

      expect(nearest).toBeDefined();
      expect(nearest?.id).toBe('2'); // Eugene is closest to Bend (same latitude)
    });

    it('should return null for empty venue list', () => {
      const nearest = findNearest(bend, []);
      expect(nearest).toBeNull();
    });

    it('should return the only venue if list has one element', () => {
      const nearest = findNearest(bend, [venues[0]]);
      expect(nearest?.id).toBe('1');
    });

    it('should handle venues at same distance', () => {
      const equidistantVenues = [
        { id: '1', latitude: 44.0621, longitude: -121.3153 },
        { id: '2', latitude: 44.0421, longitude: -121.3153 },
      ];

      const nearest = findNearest(bend, equidistantVenues);
      expect(nearest).toBeDefined();
      expect(['1', '2']).toContain(nearest?.id);
    });
  });

  describe('Sorting by Distance', () => {
    const venues = [
      { id: '1', name: 'Portland', latitude: 45.5231, longitude: -122.6765 },
      { id: '2', name: 'Eugene', latitude: 44.0521, longitude: -123.0868 },
      { id: '3', name: 'Seattle', latitude: 47.6062, longitude: -122.3321 },
    ];

    it('should sort venues by distance', () => {
      const sorted = sortByDistance(bend, venues);

      expect(sorted.length).toBe(3);
      expect(sorted[0].id).toBe('2'); // Eugene (closest)
      expect(sorted[2].id).toBe('3'); // Seattle (farthest)
    });

    it('should include distance_km property', () => {
      const sorted = sortByDistance(bend, venues);

      sorted.forEach((venue) => {
        expect(venue.distance_km).toBeDefined();
        expect(typeof venue.distance_km).toBe('number');
        expect(venue.distance_km).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain ascending distance order', () => {
      const sorted = sortByDistance(bend, venues);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].distance_km).toBeGreaterThanOrEqual(sorted[i - 1].distance_km);
      }
    });

    it('should handle empty venue list', () => {
      const sorted = sortByDistance(bend, []);
      expect(sorted).toEqual([]);
    });

    it('should handle single venue', () => {
      const sorted = sortByDistance(bend, [venues[0]]);

      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe('1');
      expect(sorted[0].distance_km).toBeDefined();
    });
  });

  describe('Bearing Calculations', () => {
    it('should calculate bearing from Bend to Portland (North)', () => {
      const bearing = calculateBearing(bend, portland);

      // Portland is northwest of Bend
      expect(bearing).toBeGreaterThan(290);
      expect(bearing).toBeLessThan(330);
    });

    it('should calculate bearing due north (0 degrees)', () => {
      const north: Coordinates = { latitude: 45, longitude: -121.3153 };
      const bearing = calculateBearing(bend, north);

      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should calculate bearing due east (90 degrees)', () => {
      const east: Coordinates = { latitude: 44.0521, longitude: -120 };
      const bearing = calculateBearing(bend, east);

      expect(bearing).toBeCloseTo(90, 0);
    });

    it('should calculate bearing due south (180 degrees)', () => {
      const south: Coordinates = { latitude: 43, longitude: -121.3153 };
      const bearing = calculateBearing(bend, south);

      expect(bearing).toBeCloseTo(180, 0);
    });

    it('should calculate bearing due west (270 degrees)', () => {
      const west: Coordinates = { latitude: 44.0521, longitude: -123 };
      const bearing = calculateBearing(bend, west);

      expect(bearing).toBeCloseTo(270, 0);
    });

    it('should return bearing in 0-360 range', () => {
      const bearing = calculateBearing(bend, portland);

      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('Compass Direction', () => {
    it('should return N for bearing 0', () => {
      expect(getCompassDirection(0)).toBe('N');
    });

    it('should return NE for bearing 45', () => {
      expect(getCompassDirection(45)).toBe('NE');
    });

    it('should return E for bearing 90', () => {
      expect(getCompassDirection(90)).toBe('E');
    });

    it('should return SE for bearing 135', () => {
      expect(getCompassDirection(135)).toBe('SE');
    });

    it('should return S for bearing 180', () => {
      expect(getCompassDirection(180)).toBe('S');
    });

    it('should return SW for bearing 225', () => {
      expect(getCompassDirection(225)).toBe('SW');
    });

    it('should return W for bearing 270', () => {
      expect(getCompassDirection(270)).toBe('W');
    });

    it('should return NW for bearing 315', () => {
      expect(getCompassDirection(315)).toBe('NW');
    });

    it('should handle bearing 360 as N', () => {
      expect(getCompassDirection(360)).toBe('N');
    });

    it('should round bearings to nearest direction', () => {
      expect(getCompassDirection(22)).toBe('N'); // Closer to N than NE
      expect(getCompassDirection(23)).toBe('NE'); // Closer to NE than N
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small coordinate differences', () => {
      const coord1: Coordinates = { latitude: 44.0521, longitude: -121.3153 };
      const coord2: Coordinates = { latitude: 44.0521001, longitude: -121.3153001 };

      const distance = calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.001);
    });

    it('should handle coordinates at maximum precision', () => {
      const coord1: Coordinates = { latitude: 44.052123456789, longitude: -121.315312345678 };
      const coord2: Coordinates = { latitude: 44.052198765432, longitude: -121.315387654321 };

      const distance = calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      expect(isNaN(distance)).toBe(false);
    });

    it('should handle antipodal points (opposite sides of Earth)', () => {
      const point1: Coordinates = { latitude: 44, longitude: -121 };
      const point2: Coordinates = { latitude: -44, longitude: 59 }; // Opposite side

      const distance = calculateDistance(point1, point2);

      // Half of Earth's circumference is approximately 20,000 km
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });
  });
});

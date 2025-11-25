/**
 * Tests for share link generation and anonymization validation.
 * Ensures no user data, GPS coordinates, or precise timestamps are leaked.
 */

import { createHttpFactory, HttpMethod, SpectatorHttp } from '@ngneat/spectator/jest';
import { ShareService, ShareLinkResponse, SharedVisitData } from './share.service';

describe('ShareService', () => {
  let spectator: SpectatorHttp<ShareService>;
  const createHttp = createHttpFactory(ShareService);

  beforeEach(() => {
    spectator = createHttp();
  });

  describe('Share Link Generation', () => {
    it('should generate a share link with no expiration', () => {
      const visitId = 'visit-123';
      const mockResponse: ShareLinkResponse = {
        shareId: 'share-abc123',
        shareUrl: 'https://app.blastoise.com/shared/share-abc123',
        expiresAt: null,
      };

      spectator.service.generateShareLink(visitId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.shareId).toBe('share-abc123');
        expect(response.shareUrl).toContain('/shared/');
        expect(response.expiresAt).toBeNull();
      });

      const req = spectator.expectOne('/api/v1/visits/visit-123/share', HttpMethod.POST);
      expect(req.request.body).toEqual({
        visitId: visitId,
        expiresInDays: null,
      });

      req.flush({
        success: true,
        data: mockResponse,
      });
    });

    it('should generate a share link with 7-day expiration', () => {
      const visitId = 'visit-456';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const mockResponse: ShareLinkResponse = {
        shareId: 'share-def456',
        shareUrl: 'https://app.blastoise.com/shared/share-def456',
        expiresAt: expiresAt,
      };

      spectator.service.generateShareLink(visitId, 7).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.expiresAt).toBe(expiresAt);
      });

      const req = spectator.expectOne('/api/v1/visits/visit-456/share', HttpMethod.POST);
      expect(req.request.body.expiresInDays).toBe(7);

      req.flush({
        success: true,
        data: mockResponse,
      });
    });

    it('should generate a share link with custom expiration (30 days)', () => {
      const visitId = 'visit-789';
      const mockResponse: ShareLinkResponse = {
        shareId: 'share-ghi789',
        shareUrl: 'https://app.blastoise.com/shared/share-ghi789',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      spectator.service.generateShareLink(visitId, 30).subscribe((response) => {
        expect(response.shareId).toBeDefined();
        expect(response.expiresAt).toBeDefined();
      });

      const req = spectator.expectOne('/api/v1/visits/visit-789/share', HttpMethod.POST);
      req.flush({
        success: true,
        data: mockResponse,
      });
    });

    it('should handle API errors when generating share link', () => {
      const visitId = 'visit-error';

      spectator.service.generateShareLink(visitId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = spectator.expectOne('/api/v1/visits/visit-error/share', HttpMethod.POST);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle unauthorized errors (401)', () => {
      const visitId = 'visit-unauth';

      spectator.service.generateShareLink(visitId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        },
      });

      const req = spectator.expectOne('/api/v1/visits/visit-unauth/share', HttpMethod.POST);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('getSharedVisit', () => {
    it('should fetch shared visit data', () => {
      const shareId = 'share-123';
      const mockData: SharedVisitData = {
        shareId: 'share-123',
        venueName: 'Anchor Brewing',
        venueCity: 'San Francisco',
        venueState: 'CA',
        visitDate: '2025-10-30',
        createdAt: '2025-10-30T10:00:00Z',
        expiresAt: null,
        viewCount: 5,
      };

      spectator.service.getSharedVisit(shareId).subscribe((data) => {
        expect(data).toEqual(mockData);
        expect(data.venueName).toBe('Anchor Brewing');
        expect(data.viewCount).toBe(5);
      });

      const req = spectator.expectOne('/api/v1/shared/share-123', HttpMethod.GET);
      req.flush({
        success: true,
        data: mockData,
      });
    });

    it('should handle 404 for non-existent share', () => {
      const shareId = 'share-notfound';

      spectator.service.getSharedVisit(shareId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = spectator.expectOne('/api/v1/shared/share-notfound', HttpMethod.GET);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 410 for expired share', () => {
      const shareId = 'share-expired';

      spectator.service.getSharedVisit(shareId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(410);
        },
      });

      const req = spectator.expectOne('/api/v1/shared/share-expired', HttpMethod.GET);
      req.flush('Gone', { status: 410, statusText: 'Gone' });
    });
  });

  describe('Anonymization Validation', () => {
    it('should validate clean shared data (no sensitive info)', () => {
      const validData: SharedVisitData = {
        shareId: 'share-123',
        venueName: 'Stone Brewing',
        venueCity: 'Escondido',
        venueState: 'CA',
        visitDate: '2025-11-01',
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 10,
      };

      const isValid = spectator.service.validateSharedData(validData);
      expect(isValid).toBe(true);
    });

    it('should reject data with user_id field', () => {
      const invalidData = {
        shareId: 'share-456',
        venueName: 'Russian River Brewing',
        venueCity: 'Santa Rosa',
        venueState: 'CA',
        visitDate: '2025-11-01',
        user_id: 'user-secret-123', // SECURITY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 3,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data with latitude coordinates', () => {
      const invalidData = {
        shareId: 'share-789',
        venueName: 'Sierra Nevada',
        venueCity: 'Chico',
        venueState: 'CA',
        visitDate: '2025-11-01',
        latitude: 39.7285, // PRIVACY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 7,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data with longitude coordinates', () => {
      const invalidData = {
        shareId: 'share-abc',
        venueName: 'Lagunitas',
        venueCity: 'Petaluma',
        venueState: 'CA',
        visitDate: '2025-11-01',
        longitude: -121.8375, // PRIVACY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 12,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data with coordinates object', () => {
      const invalidData = {
        shareId: 'share-def',
        venueName: 'Bear Republic',
        venueCity: 'Healdsburg',
        venueState: 'CA',
        visitDate: '2025-11-01',
        coordinates: { lat: 38.6104, lng: -122.8692 }, // PRIVACY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 4,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data with email patterns', () => {
      const invalidData = {
        shareId: 'share-ghi',
        venueName: 'Firestone Walker',
        venueCity: 'Paso Robles',
        venueState: 'CA',
        visitDate: '2025-11-01',
        contact: 'user@example.com', // PRIVACY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 8,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data with location.lat field', () => {
      const invalidData = {
        shareId: 'share-jkl',
        venueName: 'Deschutes Brewery',
        venueCity: 'Bend',
        venueState: 'OR',
        visitDate: '2025-11-01',
        location: { lat: 44.0582 }, // PRIVACY VIOLATION
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 6,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should reject data missing required fields', () => {
      const invalidData = {
        shareId: 'share-mno',
        // Missing venueName, venueCity, visitDate
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 2,
      };

      const isValid = spectator.service.validateSharedData(invalidData as SharedVisitData);
      expect(isValid).toBe(false);
    });

    it('should accept data with only date (no precise time)', () => {
      const validData: SharedVisitData = {
        shareId: 'share-pqr',
        venueName: 'New Belgium',
        venueCity: 'Fort Collins',
        venueState: 'CO',
        visitDate: '2025-11-01', // Date only, no time
        createdAt: '2025-11-01T14:00:00Z',
        expiresAt: null,
        viewCount: 15,
      };

      const isValid = spectator.service.validateSharedData(validData);
      expect(isValid).toBe(true);
      // Verify no time component in visitDate
      expect(validData.visitDate).not.toContain('T');
      expect(validData.visitDate).not.toContain(':');
    });
  });

  describe('shareViaChannel', () => {
    it('should use Web Share API if available', async () => {
      const shareUrl = 'https://app.blastoise.com/shared/share-123';
      const venueName = 'Test Brewery';

      // Mock navigator.share
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
        configurable: true,
      });

      const result = await spectator.service.shareViaChannel(shareUrl, venueName);

      expect(result).toBe(true);
      expect(mockShare).toHaveBeenCalledWith({
        title: `Visit to ${venueName}`,
        text: `Check out my visit to ${venueName}!`,
        url: shareUrl,
      });
    });

    it('should fallback to clipboard if Web Share API fails', async () => {
      const shareUrl = 'https://app.blastoise.com/shared/share-456';
      const venueName = 'Another Brewery';

      // Mock navigator.share to fail
      const mockShare = jest.fn().mockRejectedValue(new Error('User cancelled'));
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
        configurable: true,
      });

      // Mock clipboard
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const result = await spectator.service.shareViaChannel(shareUrl, venueName);

      expect(result).toBe(false); // Web Share failed
      expect(mockShare).toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy URL to clipboard using Clipboard API', async () => {
      const shareUrl = 'https://app.blastoise.com/shared/share-789';

      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const result = await spectator.service.copyToClipboard(shareUrl);

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(shareUrl);
    });

    it('should handle clipboard API errors gracefully', async () => {
      const shareUrl = 'https://app.blastoise.com/shared/share-error';

      const mockWriteText = jest.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const result = await spectator.service.copyToClipboard(shareUrl);

      expect(result).toBe(false);
      expect(mockWriteText).toHaveBeenCalledWith(shareUrl);
    });
  });

  describe('buildShareUrl', () => {
    it('should build full share URL from share ID', () => {
      const shareId = 'share-abc123';
      const url = spectator.service.buildShareUrl(shareId);

      expect(url).toContain('/shared/');
      expect(url).toContain(shareId);
      expect(url).toMatch(/^https?:\/\//);
    });

    it('should use current window origin', () => {
      const shareId = 'share-def456';
      const url = spectator.service.buildShareUrl(shareId);

      expect(url).toBe(`${window.location.origin}/shared/${shareId}`);
    });
  });
});

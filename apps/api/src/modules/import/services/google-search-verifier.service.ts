/**
 * Tier 3 Verification Service
 * Uses Google Search for edge-case venue verification
 */

import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { VerificationCacheService } from './verification-cache.service';

export interface Tier3VerificationResult {
  verified: boolean;
  confidence: number;
  venue_type?: 'brewery' | 'winery';
  keywords_found?: string[];
}

@Injectable()
export class GoogleSearchVerifierService {
  private readonly logger = new Logger(GoogleSearchVerifierService.name);

  // User agent rotation pool
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ];

  private currentUserAgentIndex = 0;
  private lastRequestTime = 0;

  // Simple error tracking
  private consecutiveFailures = 0;

  constructor(
    private readonly cacheService: VerificationCacheService
  ) {
    this.logger.log('GoogleSearchVerifierService initialized with 500ms delay + user agent rotation');
  }

  /**
   * T068: Verify venue using Google Search
   * Searches for place name + address and looks for brewery/winery keywords
   */
  async verifyVenue(
    placeName: string,
    address?: string
  ): Promise<Tier3VerificationResult> {
    try {
      // Check cache first (60-day TTL)
      const cached = await this.cacheService.getTier3Result(placeName);
      if (cached) {
        this.logger.debug(`Tier 3 cache hit for "${placeName}"`);
        return cached as Tier3VerificationResult;
      }

      this.logger.debug(`Tier 3 Google search for "${placeName}"`);

      // Wait 500ms between requests to avoid rate limiting
      await this.enforceRateLimit();

      // Construct search query
      const query = address
        ? `${placeName} ${address} brewery winery`
        : `${placeName} brewery winery`;

      // Fetch search results HTML
      const html = await this.searchGoogle(query);

      if (!html) {
        // Don't cache failed fetches - might work later
        return { verified: false, confidence: 0 };
      }

      // Simple keyword matching in HTML
      const verification = this.detectKeywords(html);

      // Cache result (60 days) - only cache successful verifications
      if (verification.verified && verification.venue_type) {
        // TypeScript type guard: we know venue_type exists when verified=true
        await this.cacheService.cacheTier3Result(placeName, {
          verified: verification.verified,
          confidence: verification.confidence,
          venue_type: verification.venue_type as 'brewery' | 'winery',
        });
      }

      if (verification.verified) {
        this.logger.log(
          `Tier 3 verified "${placeName}" as ${verification.venue_type} (keywords: ${verification.keywords_found?.join(', ')})`
        );
      }

      return verification;
    } catch (error) {
      this.logger.error(`Tier 3 verification failed for "${placeName}": ${error}`);
      return { verified: false, confidence: 0 };
    }
  }

  /**
   * Perform Google search with user agent rotation
   */
  private async searchGoogle(query: string): Promise<string | null> {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      // Rotate user agent
      const userAgent = this.userAgents[this.currentUserAgentIndex];
      this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        this.consecutiveFailures++;

        // 🚨 FLAG: Google blocking requests
        if (this.consecutiveFailures >= 3) {
          this.logger.error(
            `🚨 GOOGLE SEARCH BLOCKED: ${this.consecutiveFailures} consecutive ${response.status} errors!`
          );

          // Send to Sentry
          Sentry.captureMessage('Google Search blocking detected', {
            level: 'error',
            tags: {
              service: 'google_search',
              tier: '2.5',
              http_status: response.status.toString(),
            },
            extra: {
              consecutiveFailures: this.consecutiveFailures,
              query,
            },
          });
        } else {
          this.logger.warn(`Google search returned ${response.status} for query: ${query}`);
        }

        return null;
      }

      // Reset on success
      this.consecutiveFailures = 0;
      return await response.text();
    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 3) {
        this.logger.error(`🚨 GOOGLE SEARCH ERROR: ${this.consecutiveFailures} consecutive failures!`);
        Sentry.captureException(error, {
          tags: {
            service: 'google_search',
            tier: '2.5',
          },
        });
      } else {
        this.logger.warn(`Failed to fetch Google search results: ${error}`);
      }

      return null;
    }
  }

  /**
   * Detect brewery/winery keywords in HTML
   * Returns verification result with confidence score
   */
  private detectKeywords(html: string): Tier3VerificationResult {
    const htmlLower = html.toLowerCase();

    const breweryKeywords = [
      'brewery',
      'brewing',
      'brewpub',
      'tap room',
      'taproom',
      'craft beer',
      'microbrewery'
    ];

    const wineryKeywords = [
      'winery',
      'vineyard',
      'tasting room',
      'wine tasting',
      'vintner',
      'wine cellar',
      'wine estate'
    ];

    const foundBreweryKeywords: string[] = [];
    const foundWineryKeywords: string[] = [];

    // Count brewery keywords
    for (const keyword of breweryKeywords) {
      if (htmlLower.includes(keyword)) {
        foundBreweryKeywords.push(keyword);
      }
    }

    // Count winery keywords
    for (const keyword of wineryKeywords) {
      if (htmlLower.includes(keyword)) {
        foundWineryKeywords.push(keyword);
      }
    }

    // Determine venue type based on keyword counts
    const breweryScore = foundBreweryKeywords.length;
    const wineryScore = foundWineryKeywords.length;

    if (breweryScore === 0 && wineryScore === 0) {
      return { verified: false, confidence: 0 };
    }

    if (breweryScore > wineryScore) {
      return {
        verified: true,
        confidence: Math.min(breweryScore / 5, 0.9), // Cap at 0.9 for Tier 3
        venue_type: 'brewery',
        keywords_found: foundBreweryKeywords.slice(0, 3), // Return top 3 keywords
      };
    } else {
      return {
        verified: true,
        confidence: Math.min(wineryScore / 5, 0.9), // Cap at 0.9 for Tier 3
        venue_type: 'winery',
        keywords_found: foundWineryKeywords.slice(0, 3), // Return top 3 keywords
      };
    }
  }

  /**
   * Enforce 500ms delay between requests
   * Prevents Google from rate-limiting or blocking
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < 500) {
      const delayNeeded = 500 - timeSinceLastRequest;
      await this.sleep(delayNeeded);
    }

    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Tier 2.5: Search by address only (no keywords added)
   * Used when we have coordinates but no name from Tier 1/2
   * Lets Google surface what's at that address naturally
   */
  async searchByAddress(
    formattedAddress: string
  ): Promise<Tier3VerificationResult> {
    try {
      // Check cache first (7-day TTL for address searches)
      const cacheKey = `address-search:${formattedAddress}`;
      const cached = await this.cacheService.get<Tier3VerificationResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for address search: ${formattedAddress}`);
        return cached;
      }

      this.logger.debug(`Tier 2.5 Google search for address: "${formattedAddress}"`);

      // Wait 500ms between requests to avoid rate limiting
      await this.enforceRateLimit();

      // Search ONLY the address (no "brewery" or "winery" keywords)
      // This avoids false positives from nearby breweries
      const html = await this.searchGoogle(formattedAddress);

      if (!html) {
        return { verified: false, confidence: 0 };
      }

      // Detect keywords in search results
      const verification = this.detectKeywords(html);

      // Cache result (7 days - shorter TTL for address searches)
      await this.cacheService.set(cacheKey, verification, 7 * 24 * 60 * 60);

      if (verification.verified) {
        this.logger.log(
          `Tier 2.5 found ${verification.venue_type} at address: ${formattedAddress} (confidence: ${verification.confidence.toFixed(2)})`
        );
      }

      return verification;
    } catch (error) {
      this.logger.error(`Address search failed for "${formattedAddress}": ${error}`);
      return { verified: false, confidence: 0 };
    }
  }
}

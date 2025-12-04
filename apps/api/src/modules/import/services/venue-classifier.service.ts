/**
 * VenueClassifierService
 * Tier 1 keyword-based classification for breweries and wineries
 */

import { Injectable, Logger } from '@nestjs/common';
import { VenueType } from '@blastoise/shared';

interface ClassificationResult {
  is_brewery_or_winery: boolean;
  venue_type: VenueType | null;
  confidence: number; // 0.0 to 1.0
  matched_keywords: string[];
}

@Injectable()
export class VenueClassifierService {
  private readonly logger = new Logger(VenueClassifierService.name);

  /**
   * Keyword constants for Tier 1 classification
   */
  private readonly BREWERY_KEYWORDS = [
    'brew',
    'brewery',
    'brewhouse',
    'brewing',
    'brewpub',
    'taproom',
    'beer',
    'ale',
    'ipa',
    'lager',
    'stout',
    'porter',
    'craft beer',
    'microbrewery',
  ];

  private readonly WINERY_KEYWORDS = [
    'wine',
    'winery',
    'vineyard',
    'vino',
    'tasting room',
    'cellar',
    'estate',
    'chateau',
  ];

  private readonly EXCLUDE_KEYWORDS = [
    'restaurant',
    'bar',
    'grill',
    'cafe',
    'pub', // Generic pub without "brewpub"
    'hotel',
    'liquor',
    'store',
    'shop',
    'market',
    'gas station',
    'grocery',
  ];

  /**
   * Classify place as brewery/winery with confidence score
   * Returns classification result with venue type and confidence
   * Can handle missing names (returns low/no confidence)
   */
  classify(name: string | null, address?: string): ClassificationResult {
    // Handle missing name - can't classify without text
    if (!name && !address) {
      return {
        is_brewery_or_winery: false,
        venue_type: null,
        confidence: 0,
        matched_keywords: [],
      };
    }

    const searchText = this.prepareSearchText(name || '', address);

    // Check for exclusion keywords first
    const excludeMatches = this.matchKeywords(searchText, this.EXCLUDE_KEYWORDS);
    if (excludeMatches.length > 0) {
      this.logger.debug(`Excluded "${name || 'coordinate-only entry'}" due to keywords: ${excludeMatches.join(', ')}`);
      return {
        is_brewery_or_winery: false,
        venue_type: null,
        confidence: 0,
        matched_keywords: [],
      };
    }

    // Match brewery keywords
    const breweryMatches = this.matchKeywords(searchText, this.BREWERY_KEYWORDS);
    const breweryScore = breweryMatches.length;

    // Match winery keywords
    const wineryMatches = this.matchKeywords(searchText, this.WINERY_KEYWORDS);
    const wineryScore = wineryMatches.length;

    // No matches
    if (breweryScore === 0 && wineryScore === 0) {
      return {
        is_brewery_or_winery: false,
        venue_type: null,
        confidence: 0,
        matched_keywords: [],
      };
    }

    // Determine venue type and confidence
    const venueType = this.inferVenueType(breweryScore, wineryScore);
    const matchedKeywords = venueType === 'brewery' ? breweryMatches : wineryMatches;
    const maxScore = Math.max(breweryScore, wineryScore);

    // Confidence scoring:
    // - 1 match: 0.3-0.5 (low)
    // - 2 matches: 0.6-0.7 (medium)
    // - 3+ matches: 0.8-1.0 (high)
    let confidence = 0;
    if (maxScore === 1) {
      confidence = 0.4;
    } else if (maxScore === 2) {
      confidence = 0.65;
    } else {
      confidence = Math.min(0.8 + (maxScore - 3) * 0.05, 1.0);
    }

    this.logger.debug(
      `Classified "${name}" as ${venueType} (confidence: ${confidence.toFixed(2)}, keywords: ${matchedKeywords.join(', ')})`
    );

    return {
      is_brewery_or_winery: true,
      venue_type: venueType,
      confidence,
      matched_keywords: matchedKeywords,
    };
  }

  /**
   * Infer venue type (brewery vs winery) based on keyword counts
   */
  private inferVenueType(breweryScore: number, wineryScore: number): VenueType {
    // If tied, default to brewery (more common in Timeline data)
    return breweryScore >= wineryScore ? 'brewery' : 'winery';
  }

  /**
   * Helper: Prepare search text (combine name and address, lowercase, remove special chars)
   */
  private prepareSearchText(name: string, address?: string): string {
    const combined = address ? `${name} ${address}` : name;
    return combined.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  }

  /**
   * Helper: Match keywords in search text
   * Returns array of matched keywords
   */
  private matchKeywords(searchText: string, keywords: string[]): string[] {
    const matches: string[] = [];

    for (const keyword of keywords) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(searchText)) {
        matches.push(keyword);
      }
    }

    return matches;
  }
}

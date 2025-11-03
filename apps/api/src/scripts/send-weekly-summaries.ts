/**
 * T222: Weekly Visit Summary Notification Script
 *
 * Sends weekly visit summary notifications to users.
 * Should be run via cron job (e.g., every Monday morning).
 *
 * Usage:
 *   ts-node src/scripts/send-weekly-summaries.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 *   WEB_APP_URL - Web app URL for notification links (default: http://localhost:4200)
 *
 * Phase 7: Notifications & Observability
 */

import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  notification_settings?: {
    weekly_summary?: boolean;
  };
}

interface Visit {
  id: string;
  venue_id: string;
  arrived_at: string;
  departed_at: string | null;
}

interface Venue {
  id: string;
  name: string;
  venue_type: string;
}

interface WeeklySummary {
  userId: string;
  email: string;
  visitCount: number;
  uniqueVenues: number;
  favoriteVenue: string | null;
  totalHours: number;
  breweryCount: number;
  wineryCount: number;
}

/**
 * Get date range for last week (Monday-Sunday)
 */
function getLastWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days back to last Monday
  const daysBackToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysBackToMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);

  // Last Sunday is 6 days after last Monday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { start: lastMonday, end: lastSunday };
}

/**
 * Calculate total visit duration in hours
 */
function calculateTotalHours(visits: Visit[]): number {
  let totalMinutes = 0;

  for (const visit of visits) {
    if (!visit.departed_at) continue;

    const arrived = new Date(visit.arrived_at);
    const departed = new Date(visit.departed_at);
    const durationMs = departed.getTime() - arrived.getTime();
    totalMinutes += durationMs / (1000 * 60);
  }

  return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
}

/**
 * Find the most visited venue
 */
function findFavoriteVenue(visits: Visit[], venues: Map<string, Venue>): string | null {
  const venueCounts = new Map<string, number>();

  // Count visits per venue
  for (const visit of visits) {
    const count = venueCounts.get(visit.venue_id) || 0;
    venueCounts.set(visit.venue_id, count + 1);
  }

  // Find venue with most visits
  let maxCount = 0;
  let favoriteVenueId: string | null = null;

  for (const [venueId, count] of venueCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      favoriteVenueId = venueId;
    }
  }

  if (!favoriteVenueId) return null;

  const venue = venues.get(favoriteVenueId);
  return venue ? venue.name : null;
}

/**
 * Count visits by venue type
 */
function countByType(visits: Visit[], venues: Map<string, Venue>): { breweryCount: number; wineryCount: number } {
  let breweryCount = 0;
  let wineryCount = 0;

  for (const visit of visits) {
    const venue = venues.get(visit.venue_id);
    if (!venue) continue;

    if (venue.venue_type === 'brewery') {
      breweryCount++;
    } else if (venue.venue_type === 'winery') {
      wineryCount++;
    }
  }

  return { breweryCount, wineryCount };
}

/**
 * Generate weekly summary for a user
 */
async function generateWeeklySummary(
  supabase: any,
  userId: string,
  email: string,
  weekRange: { start: Date; end: Date }
): Promise<WeeklySummary | null> {
  // Get visits for the week
  const { data: visits, error: visitsError } = await supabase
    .from('visits')
    .select('*')
    .eq('user_id', userId)
    .gte('arrived_at', weekRange.start.toISOString())
    .lte('arrived_at', weekRange.end.toISOString())
    .order('arrived_at', { ascending: false });

  if (visitsError || !visits || visits.length === 0) {
    return null; // No visits this week
  }

  // Get unique venue IDs
  const venueIds = [...new Set(visits.map((v: Visit) => v.venue_id))];

  // Fetch venue details
  const { data: venuesData } = await supabase
    .from('venues')
    .select('*')
    .in('id', venueIds);

  const venues = new Map<string, Venue>();
  if (venuesData) {
    venuesData.forEach((venue: Venue) => venues.set(venue.id, venue));
  }

  // Calculate statistics
  const totalHours = calculateTotalHours(visits);
  const favoriteVenue = findFavoriteVenue(visits, venues);
  const { breweryCount, wineryCount } = countByType(visits, venues);

  return {
    userId,
    email,
    visitCount: visits.length,
    uniqueVenues: venueIds.length,
    favoriteVenue,
    totalHours,
    breweryCount,
    wineryCount,
  };
}

/**
 * Format summary into email-friendly text
 */
function formatSummary(summary: WeeklySummary, webAppUrl: string): string {
  const lines = [
    `🍻 Your Weekly Visit Summary`,
    ``,
    `You visited ${summary.visitCount} ${summary.visitCount === 1 ? 'venue' : 'venues'} last week!`,
    ``,
    `📍 ${summary.uniqueVenues} unique ${summary.uniqueVenues === 1 ? 'location' : 'locations'}`,
    `⏱️  ${summary.totalHours} ${summary.totalHours === 1 ? 'hour' : 'hours'} spent`,
  ];

  if (summary.breweryCount > 0) {
    lines.push(`🍺 ${summary.breweryCount} ${summary.breweryCount === 1 ? 'brewery' : 'breweries'}`);
  }

  if (summary.wineryCount > 0) {
    lines.push(`🍷 ${summary.wineryCount} ${summary.wineryCount === 1 ? 'winery' : 'wineries'}`);
  }

  if (summary.favoriteVenue) {
    lines.push(``, `⭐ Your favorite: ${summary.favoriteVenue}`);
  }

  lines.push(``, `View your timeline: ${webAppUrl}/visits`);

  return lines.join('\n');
}

/**
 * Send email notification (placeholder - integrate with your email service)
 */
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, Postmark, etc.)
  console.log(`\n📧 Would send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log(`\n---\n`);
}

/**
 * Main script execution
 */
async function main() {
  console.log('🚀 Starting weekly summary notification script...\n');

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:4200';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get last week's date range
  const weekRange = getLastWeekRange();
  console.log(`📅 Generating summaries for: ${weekRange.start.toLocaleDateString()} - ${weekRange.end.toLocaleDateString()}\n`);

  // Get all users with weekly_summary preference enabled
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, notification_settings')
    .not('email', 'is', null);

  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('ℹ️  No users found with email addresses');
    return;
  }

  console.log(`👥 Found ${users.length} users\n`);

  // Process each user
  let sentCount = 0;
  let skippedCount = 0;

  for (const user of users as User[]) {
    // Check if user has weekly summaries enabled (default: false)
    const weeklySummaryEnabled = user.notification_settings?.weekly_summary ?? false;

    if (!weeklySummaryEnabled) {
      skippedCount++;
      continue;
    }

    try {
      // Generate summary
      const summary = await generateWeeklySummary(supabase, user.id, user.email, weekRange);

      if (!summary) {
        console.log(`⏭️  Skipping ${user.email}: No visits last week`);
        skippedCount++;
        continue;
      }

      // Format and send email
      const subject = `🍻 Your Weekly Visit Summary - ${summary.visitCount} ${summary.visitCount === 1 ? 'visit' : 'visits'}`;
      const body = formatSummary(summary, webAppUrl);

      await sendEmail(user.email, subject, body);
      sentCount++;

    } catch (error) {
      console.error(`❌ Failed to process user ${user.email}:`, error);
    }
  }

  console.log(`\n✅ Weekly summary script complete!`);
  console.log(`📧 Sent: ${sentCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

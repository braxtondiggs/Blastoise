/**
 * Date Utilities
 * Functions for date manipulation and timestamp rounding (privacy protection)
 */

/**
 * Round timestamp to nearest interval (for privacy)
 * Default: 15 minutes
 */
export function roundTimestamp(
  timestamp: Date | string,
  intervalMinutes = 15
): Date {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const ms = date.getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  const rounded = Math.round(ms / intervalMs) * intervalMs;
  return new Date(rounded);
}

/**
 * Round timestamp to ISO string
 */
export function roundTimestampToISO(
  timestamp: Date | string,
  intervalMinutes = 15
): string {
  return roundTimestamp(timestamp, intervalMinutes).toISOString();
}

/**
 * Get date only (YYYY-MM-DD) from timestamp
 */
export function getDateOnly(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toISOString().split('T')[0];
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Calculate duration between two timestamps in minutes
 */
export function calculateDurationMinutes(
  startTime: Date | string,
  endTime: Date | string
): number {
  const start =
    typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }

  const years = Math.floor(diffDays / 365);
  return `${years}y ago`;
}

/**
 * Format date to display format (e.g., "Jan 15, 2025")
 */
export function formatDisplayDate(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time to display format (e.g., "2:30 PM")
 */
export function formatDisplayTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if timestamp is today
 */
export function isToday(timestamp: Date | string): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const today = new Date();
  return getDateOnly(date) === getDateOnly(today);
}

/**
 * Check if timestamp is yesterday
 */
export function isYesterday(timestamp: Date | string): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateOnly(date) === getDateOnly(yesterday);
}

/**
 * Group timestamps by date
 */
export function groupByDate<T>(
  items: T[],
  dateGetter: (item: T) => Date | string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = getDateOnly(dateGetter(item));
    const group = groups.get(dateKey) || [];
    group.push(item);
    groups.set(dateKey, group);
  }

  return groups;
}

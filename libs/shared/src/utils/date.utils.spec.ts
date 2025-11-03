import {
  roundTimestamp,
  roundTimestampToISO,
  getDateOnly,
  formatDuration,
  calculateDurationMinutes,
  formatRelativeTime,
  formatDisplayDate,
  formatDisplayTime,
  isToday,
  isYesterday,
  groupByDate,
} from './date.utils';

describe('Date Utils', () => {
  describe('T113: Timestamp Rounding for Privacy', () => {
    it('should round timestamp to nearest 15 minutes (default)', () => {
      // Test timestamp: 2025-01-15 14:37:30 UTC
      const input = new Date('2025-01-15T14:37:30.000Z');
      const rounded = roundTimestamp(input);

      // Should round to 2025-01-15 14:45:00 (37.5 min is closer to 45 than 30)
      expect(rounded.getUTCMinutes()).toBe(45);
      expect(rounded.getUTCSeconds()).toBe(0);
      expect(rounded.getUTCMilliseconds()).toBe(0);
    });

    it('should round timestamp up to nearest 15 minutes', () => {
      // Test timestamp: 2025-01-15 14:38:00 (closer to 14:45)
      const input = new Date('2025-01-15T14:38:00.000Z');
      const rounded = roundTimestamp(input);

      // Should round up to 2025-01-15 14:45:00
      expect(rounded.getUTCMinutes()).toBe(45);
      expect(rounded.getUTCSeconds()).toBe(0);
    });

    it('should round timestamp down to nearest 15 minutes', () => {
      // Test timestamp: 2025-01-15 14:36:00 (closer to 14:30)
      const input = new Date('2025-01-15T14:36:00.000Z');
      const rounded = roundTimestamp(input);

      // Should round down to 2025-01-15 14:30:00
      expect(rounded.getUTCMinutes()).toBe(30);
    });

    it('should handle exact 15-minute boundaries', () => {
      const input = new Date('2025-01-15T14:45:00.000Z');
      const rounded = roundTimestamp(input);

      // Should stay at 14:45
      expect(rounded.getTime()).toBe(input.getTime());
    });

    it('should support custom rounding intervals', () => {
      const input = new Date('2025-01-15T14:37:00.000Z');

      // Round to nearest 30 minutes
      const rounded30 = roundTimestamp(input, 30);
      expect(rounded30.getUTCMinutes()).toBe(30);

      // Round to nearest 5 minutes
      const rounded5 = roundTimestamp(input, 5);
      expect(rounded5.getUTCMinutes()).toBe(35);

      // Round to nearest 60 minutes (hour)
      const rounded60 = roundTimestamp(input, 60);
      expect(rounded60.getUTCMinutes()).toBe(0);
      expect(rounded60.getUTCHours()).toBe(15); // 14:37 rounds to 15:00 (closer than 14:00)
    });

    it('should work with string timestamps', () => {
      const input = '2025-01-15T14:37:30.000Z';
      const rounded = roundTimestamp(input);

      expect(rounded.getUTCMinutes()).toBe(45);
      expect(rounded.getUTCSeconds()).toBe(0);
    });

    it('should return ISO string when using roundTimestampToISO', () => {
      const input = new Date('2025-01-15T14:37:30.000Z');
      const roundedISO = roundTimestampToISO(input);

      expect(typeof roundedISO).toBe('string');
      expect(roundedISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify it's properly rounded
      const parsed = new Date(roundedISO);
      expect(parsed.getUTCMinutes()).toBe(45);
    });

    it('should prevent timing attacks by removing precise timestamps', () => {
      // Both should round to same 15-minute interval despite being seconds apart
      // Let's use times that will round to the same value
      const input3 = new Date('2025-01-15T14:30:10.000Z');
      const input4 = new Date('2025-01-15T14:37:00.000Z');
      const rounded3 = roundTimestampToISO(input3);
      const rounded4 = roundTimestampToISO(input4);
      expect(rounded3).toBe(rounded4); // Both round to 14:30
    });

    it('should handle edge case: midnight', () => {
      const input = new Date('2025-01-15T00:07:00.000Z');
      const rounded = roundTimestamp(input);

      // Should round to 00:00
      expect(rounded.getUTCHours()).toBe(0);
      expect(rounded.getUTCMinutes()).toBe(0);
    });

    it('should handle edge case: end of day', () => {
      const input = new Date('2025-01-15T23:52:00.000Z');
      const rounded = roundTimestamp(input);

      // Should round to 23:45
      expect(rounded.getUTCHours()).toBe(23);
      expect(rounded.getUTCMinutes()).toBe(45);
    });

    it('should handle edge case: rounding across day boundary', () => {
      const input = new Date('2025-01-15T23:58:00.000Z');
      const rounded = roundTimestamp(input);

      // Should round up to next day 00:00
      expect(rounded.getUTCDate()).toBe(16);
      expect(rounded.getUTCHours()).toBe(0);
      expect(rounded.getUTCMinutes()).toBe(0);
    });
  });

  describe('getDateOnly', () => {
    it('should extract date only in YYYY-MM-DD format', () => {
      const input = new Date('2025-01-15T14:37:30.000Z');
      const dateOnly = getDateOnly(input);

      expect(dateOnly).toBe('2025-01-15');
    });

    it('should work with string timestamps', () => {
      const input = '2025-01-15T14:37:30.000Z';
      const dateOnly = getDateOnly(input);

      expect(dateOnly).toBe('2025-01-15');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(1)).toBe('1m');
      expect(formatDuration(59)).toBe('59m');
    });

    it('should format hours only', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(180)).toBe('3h');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(65)).toBe('1h 5m');
      expect(formatDuration(125)).toBe('2h 5m');
      expect(formatDuration(195)).toBe('3h 15m');
    });
  });

  describe('calculateDurationMinutes', () => {
    it('should calculate duration between two timestamps', () => {
      const start = new Date('2025-01-15T14:00:00.000Z');
      const end = new Date('2025-01-15T15:30:00.000Z');

      expect(calculateDurationMinutes(start, end)).toBe(90);
    });

    it('should work with string timestamps', () => {
      const start = '2025-01-15T14:00:00.000Z';
      const end = '2025-01-15T15:30:00.000Z';

      expect(calculateDurationMinutes(start, end)).toBe(90);
    });

    it('should round to nearest minute', () => {
      const start = new Date('2025-01-15T14:00:00.000Z');
      const end = new Date('2025-01-15T14:00:45.000Z'); // 45 seconds

      expect(calculateDurationMinutes(start, end)).toBe(1); // Rounds to 1 minute
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times', () => {
      const now = new Date();

      const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatRelativeTime(justNow)).toBe('just now');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should format dates in the past', () => {
      const now = new Date();

      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2w ago');
    });

    it('should format yesterday specially', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(yesterday)).toBe('yesterday');
    });
  });

  describe('formatDisplayDate', () => {
    it('should format date for display', () => {
      const date = new Date('2025-01-15T14:37:30.000Z');
      const formatted = formatDisplayDate(date);

      expect(formatted).toMatch(/Jan 15, 2025/);
    });
  });

  describe('formatDisplayTime', () => {
    it('should format time for display', () => {
      const time = new Date('2025-01-15T14:37:00.000Z');
      const formatted = formatDisplayTime(time);

      // Should be in 12-hour format with AM/PM
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const now = new Date();
      expect(isToday(now)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const now = new Date();
      expect(isYesterday(now)).toBe(false);
    });
  });

  describe('groupByDate', () => {
    interface TestItem {
      id: string;
      timestamp: Date;
    }

    it('should group items by date', () => {
      const items: TestItem[] = [
        { id: '1', timestamp: new Date('2025-01-15T14:00:00.000Z') },
        { id: '2', timestamp: new Date('2025-01-15T16:00:00.000Z') },
        { id: '3', timestamp: new Date('2025-01-16T10:00:00.000Z') },
        { id: '4', timestamp: new Date('2025-01-16T12:00:00.000Z') },
      ];

      const grouped = groupByDate(items, (item) => item.timestamp);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2025-01-15')?.length).toBe(2);
      expect(grouped.get('2025-01-16')?.length).toBe(2);
    });

    it('should handle empty array', () => {
      const grouped = groupByDate([], (item: TestItem) => item.timestamp);
      expect(grouped.size).toBe(0);
    });
  });
});

import {
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

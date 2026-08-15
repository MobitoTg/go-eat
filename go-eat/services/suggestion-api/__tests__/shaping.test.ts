import { formatDistance, formatName, formatReviewCount, formatRating, formatCuisineLabel } from '../src/shaping/format.js';

/**
 * T036: Display formatting — name truncation, rating, review-count abbreviation, distance in both unit systems.
 *
 * FR-002: The response must include display-ready strings, not raw provider data.
 * All truncation, abbreviation, and unit conversion happens at shaping time, never in the widget.
 *
 * This ensures the widget can render a string verbatim without additional logic.
 */

describe('Display formatting (FR-002)', () => {
  describe('formatName', () => {
    it('returns name as-is if ≤60 characters', () => {
      const name = 'Joe\'s Pizza';
      expect(formatName(name)).toBe(name);
    });

    it('truncates to 60 characters and appends ellipsis if longer', () => {
      const longName = 'A'.repeat(70);
      const formatted = formatName(longName);
      expect(formatted).toHaveLength(63); // 60 + '...'
      expect(formatted).toBe('A'.repeat(60) + '...');
    });

    it('trims whitespace before truncating', () => {
      const name = '  Joe\'s Pizza  ';
      expect(formatName(name)).toBe('Joe\'s Pizza');
    });

    it('handles emoji and multi-byte characters correctly', () => {
      // "café" is 5 characters despite looking shorter
      const name = 'Café Français'.repeat(6); // ~78 chars
      const formatted = formatName(name);
      expect(formatted.length).toBeLessThanOrEqual(63);
    });
  });

  describe('formatCuisineLabel', () => {
    it('returns label as-is if ≤30 characters', () => {
      const label = 'French';
      expect(formatCuisineLabel(label)).toBe(label);
    });

    it('truncates to the 30-character contract budget, including the ellipsis', () => {
      // contracts/suggestion-api.yaml caps cuisineLabel at maxLength: 30 — the ellipsis must fit
      // inside that budget, not be appended past it.
      const longLabel = 'A'.repeat(40);
      const formatted = formatCuisineLabel(longLabel);
      expect(formatted.length).toBeLessThanOrEqual(30);
      expect(formatted).toBe('A'.repeat(27) + '...');
    });

    it('maps provider place types to readable labels', () => {
      // Example mapping (actual implementation may vary)
      const testCases = [
        { input: 'restaurant', expected: 'Restaurant' },
        { input: 'cafe', expected: 'Café' },
        { input: 'bakery', expected: 'Bakery' },
      ];

      for (const { input, expected } of testCases) {
        expect(formatCuisineLabel(input)).toBe(expected);
      }
    });

    it('falls back to "Restaurant" for unknown types', () => {
      const unknown = 'unknown_type_xyz';
      const formatted = formatCuisineLabel(unknown);
      expect(formatted).toBe('Restaurant');
    });
  });

  describe('formatRating', () => {
    it('formats 4.5 as "4.5 ⭐"', () => {
      expect(formatRating(4.5)).toBe('4.5 ⭐');
    });

    it('formats 5.0 as "5.0 ⭐"', () => {
      expect(formatRating(5)).toBe('5.0 ⭐');
    });

    it('formats 3.2 as "3.2 ⭐"', () => {
      expect(formatRating(3.2)).toBe('3.2 ⭐');
    });

    it('handles edge case of 0 rating', () => {
      expect(formatRating(0)).toBe('0.0 ⭐');
    });

    it('rounds to one decimal place', () => {
      expect(formatRating(4.456)).toBe('4.5 ⭐');
      expect(formatRating(4.444)).toBe('4.4 ⭐');
    });

    it('throws on invalid rating outside [0, 5]', () => {
      expect(() => formatRating(-1)).toThrow();
      expect(() => formatRating(6)).toThrow();
    });
  });

  describe('formatReviewCount', () => {
    it('returns exact count for small numbers (<1k)', () => {
      expect(formatReviewCount(1)).toBe('1');
      expect(formatReviewCount(100)).toBe('100');
      expect(formatReviewCount(999)).toBe('999');
    });

    it('abbreviates 1k–999k to "X.Xk" format', () => {
      expect(formatReviewCount(1000)).toBe('1.0k');
      expect(formatReviewCount(1500)).toBe('1.5k');
      expect(formatReviewCount(10000)).toBe('10.0k');
      expect(formatReviewCount(123456)).toBe('123.5k');
    });

    it('abbreviates 1M+ to "X.Xm" format', () => {
      expect(formatReviewCount(1000000)).toBe('1.0m');
      expect(formatReviewCount(1500000)).toBe('1.5m');
      expect(formatReviewCount(10000000)).toBe('10.0m');
    });

    it('always shows exactly one decimal place in the abbreviated range', () => {
      expect(formatReviewCount(2000)).toBe('2.0k');
      expect(formatReviewCount(2000000)).toBe('2.0m');
    });
  });

  describe('formatDistance', () => {
    describe('imperial (miles)', () => {
      it('formats 100 meters as "328 ft"', () => {
        expect(formatDistance(100, 'imperial')).toBe('328 ft');
      });

      it('formats 1 km as "0.6 mi"', () => {
        expect(formatDistance(1000, 'imperial')).toBe('0.6 mi');
      });

      it('formats 5 km as "3.1 mi"', () => {
        expect(formatDistance(5000, 'imperial')).toBe('3.1 mi');
      });

      it('rounds to one decimal place for miles', () => {
        expect(formatDistance(4700, 'imperial')).toBe('2.9 mi');
      });

      it('uses feet for distances <0.1 miles', () => {
        expect(formatDistance(150, 'imperial')).toMatch(/\d+ ft/);
      });
    });

    describe('metric (kilometers)', () => {
      it('formats 100 meters as "100 m"', () => {
        expect(formatDistance(100, 'metric')).toBe('100 m');
      });

      it('formats 1 km as "1.0 km"', () => {
        expect(formatDistance(1000, 'metric')).toBe('1.0 km');
      });

      it('formats 5 km as "5.0 km"', () => {
        expect(formatDistance(5000, 'metric')).toBe('5.0 km');
      });

      it('rounds to one decimal place for kilometers', () => {
        expect(formatDistance(5456, 'metric')).toBe('5.5 km');
      });

      it('uses meters for distances <1 km', () => {
        expect(formatDistance(500, 'metric')).toMatch(/\d+ m/);
      });
    });

    it('throws on invalid unit', () => {
      expect(() => formatDistance(1000, 'invalid' as never)).toThrow();
    });

    it('throws on negative distance', () => {
      expect(() => formatDistance(-100, 'metric')).toThrow();
    });
  });

  describe('integration: formatted suggestion display', () => {
    it('produces display-ready strings for a typical restaurant', () => {
      const name = 'The Kitchen at Brooklyn Fare';
      const types: string[] = ['restaurant', 'fine_dining'];
      const rating = 4.7;
      const reviewCount = 2345;
      const distanceMeters = 800;

      const display = {
        name: formatName(name),
        cuisine: formatCuisineLabel(types[0] ?? 'restaurant'),
        rating: formatRating(rating),
        reviews: formatReviewCount(reviewCount),
        distance: formatDistance(distanceMeters, 'imperial'),
      };

      // Verify all are strings and non-empty
      expect(display.name).toMatch(/Brooklyn Fare/); // Not truncated
      expect(display.cuisine).toBe('Restaurant');
      expect(display.rating).toBe('4.7 ⭐');
      expect(display.reviews).toBe('2.3k');
      expect(display.distance).toBe('0.5 mi');
    });
  });
});

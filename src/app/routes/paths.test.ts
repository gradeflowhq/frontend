import { describe, expect, it } from 'vitest';

import { PATHS } from '@app/routes/paths';

describe('PATHS', () => {
  it('has correct static routes', () => {
    expect(PATHS.HOME).toBe('/');
    expect(PATHS.LOGIN).toBe('/login');
    expect(PATHS.REGISTER).toBe('/register');
    expect(PATHS.ASSESSMENTS).toBe('/assessments');
    expect(PATHS.SETTINGS).toBe('/settings');
  });

  describe('assessment', () => {
    const routes = PATHS.assessment('abc-123');

    it('builds overview path', () => {
      expect(routes.overview).toBe('/assessments/abc-123/overview');
    });

    it('builds submissions path', () => {
      expect(routes.submissions).toBe('/assessments/abc-123/submissions');
    });

    it('builds questions path', () => {
      expect(routes.questions).toBe('/assessments/abc-123/questions');
    });

    it('builds rules path', () => {
      expect(routes.rules).toBe('/assessments/abc-123/rules');
    });

    it('builds results index path', () => {
      expect(routes.results.index).toBe('/assessments/abc-123/results');
    });

    it('builds results statistics path', () => {
      expect(routes.results.statistics).toBe('/assessments/abc-123/results/statistics');
    });

    it('encodes student id in student path', () => {
      const path = routes.results.student('user@email.com');
      expect(path).toBe('/assessments/abc-123/results/students/user%40email.com');
    });

    it('encodes stat id in statistic path', () => {
      const path = routes.results.statistic('Q 1');
      expect(path).toBe('/assessments/abc-123/results/statistics/Q%201');
    });
  });
});

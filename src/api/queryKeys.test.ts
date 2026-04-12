import { describe, expect, it } from 'vitest';

import { QK } from '@api/queryKeys';

describe('QK', () => {
  describe('auth', () => {
    it('has stable me key', () => {
      expect(QK.auth.me).toEqual(['auth', 'me']);
    });
  });

  describe('assessments', () => {
    it('has stable list key', () => {
      expect(QK.assessments.list).toEqual(['assessments', 'list']);
    });

    it('item key includes id', () => {
      expect(QK.assessments.item('a1')).toEqual(['assessment', 'a1']);
    });

    it('members key includes id', () => {
      expect(QK.assessments.members('a1')).toEqual(['assessments', 'a1', 'members']);
    });
  });

  describe('submissions', () => {
    it('list key includes assessmentId', () => {
      expect(QK.submissions.list('a1')).toEqual(['submissions', 'a1']);
    });

    it('source key includes assessmentId', () => {
      expect(QK.submissions.source('a1')).toEqual(['submissions', 'a1', 'source']);
    });

    it('config key includes assessmentId', () => {
      expect(QK.submissions.config('a1')).toEqual(['submissions', 'a1', 'config']);
    });
  });

  describe('grading', () => {
    it('csv key includes assessmentId and roundingBase', () => {
      expect(QK.grading.csv('a1', 5)).toEqual(['grading', 'csv', 'a1', 5]);
    });

    it('jobStatus key includes jobId', () => {
      expect(QK.grading.jobStatus('j1')).toEqual(['jobs', 'status', 'j1']);
    });
  });

  describe('canvas', () => {
    it('courses key includes baseUrl', () => {
      expect(QK.canvas.courses('https://canvas.example.com')).toEqual([
        'canvas', 'courses', 'https://canvas.example.com',
      ]);
    });
  });
});

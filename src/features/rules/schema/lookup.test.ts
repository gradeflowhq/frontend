import { describe, expect, it } from 'vitest';

import {
  findSchemaKeyByType,
  friendlyRuleLabel,
  getRuleTargetQids,
  isMultiTargetRule,
  isRuleObject,
  prettifyKey,
} from '@features/rules/schema/lookup';

describe('friendlyRuleLabel', () => {
  it('strips QuestionRule suffix and splits camelCase', () => {
    expect(friendlyRuleLabel('TextMatchQuestionRule')).toBe('Text Match');
  });

  it('strips MultiQuestionRule suffix', () => {
    expect(friendlyRuleLabel('AllOrNothingMultiQuestionRule')).toBe('All Or Nothing');
  });

  it('strips bare Rule suffix', () => {
    expect(friendlyRuleLabel('CompositeRule')).toBe('Composite');
  });

  it('returns the raw key when stripping leaves empty string', () => {
    expect(friendlyRuleLabel('Rule')).toBe('Rule');
  });

  it('returns "Unknown rule" for empty string', () => {
    expect(friendlyRuleLabel('')).toBe('Unknown rule');
  });

  it('returns "Unknown rule" for null/undefined', () => {
    expect(friendlyRuleLabel(null)).toBe('Unknown rule');
    expect(friendlyRuleLabel(undefined)).toBe('Unknown rule');
  });

  it('coerces non-string input', () => {
    expect(friendlyRuleLabel(123)).toBe('123');
  });
});

describe('prettifyKey', () => {
  it('replaces underscores with spaces and title-cases', () => {
    expect(prettifyKey('text_match')).toBe('Text Match');
  });

  it('title-cases single word', () => {
    expect(prettifyKey('single')).toBe('Single');
  });

  it('handles empty string', () => {
    expect(prettifyKey('')).toBe('');
  });
});

describe('findSchemaKeyByType', () => {
  const defs = {
    TextMatchQuestionRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    },
    AllOrNothingMultiQuestionRule: {
      properties: {
        type: { default: 'ALL_OR_NOTHING' },
      },
    },
  } as never;

  it('finds by const value', () => {
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH')).toBe('TextMatchQuestionRule');
  });

  it('finds by default value', () => {
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING')).toBe('AllOrNothingMultiQuestionRule');
  });

  it('returns null for unknown type', () => {
    expect(findSchemaKeyByType(defs, 'UNKNOWN')).toBeNull();
  });

  it('filters by requireQuestionId=true', () => {
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH', true)).toBe('TextMatchQuestionRule');
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING', true)).toBeNull();
  });

  it('filters by requireQuestionId=false', () => {
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING', false)).toBe('AllOrNothingMultiQuestionRule');
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH', false)).toBeNull();
  });
});

describe('isRuleObject', () => {
  const defs = {
    TextMatchQuestionRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        question_id: { type: 'string' },
      },
    },
  } as never;

  it('returns true for valid rule object', () => {
    expect(isRuleObject({ type: 'TEXT_MATCH', question_id: 'Q1' }, defs)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRuleObject(null, defs)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isRuleObject('string', defs)).toBe(false);
  });

  it('returns false for missing type', () => {
    expect(isRuleObject({ question_id: 'Q1' }, defs)).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(isRuleObject({ type: 'UNKNOWN' }, defs)).toBe(false);
  });
});

describe('isMultiTargetRule', () => {
  it('returns true for null', () => {
    expect(isMultiTargetRule(null)).toBe(true);
  });

  it('returns true for non-object', () => {
    expect(isMultiTargetRule('string')).toBe(true);
  });

  it('returns true for object without question_id', () => {
    expect(isMultiTargetRule({ type: 'ALL_OR_NOTHING' })).toBe(true);
  });

  it('returns false for object with string question_id', () => {
    expect(isMultiTargetRule({ type: 'TEXT_MATCH', question_id: 'Q1' })).toBe(false);
  });

  it('returns true for non-string question_id', () => {
    expect(isMultiTargetRule({ question_id: 123 })).toBe(true);
  });
});

describe('getRuleTargetQids', () => {
  it('extracts single question_id', () => {
    expect(getRuleTargetQids({ question_id: 'Q1' })).toEqual(['Q1']);
  });

  it('extracts question_ids array', () => {
    const qids = getRuleTargetQids({ question_ids: ['Q1', 'Q2'] });
    expect(qids.sort()).toEqual(['Q1', 'Q2']);
  });

  it('extracts from assumptions (ASSUMPTION_SET_MULTI)', () => {
    const rule = {
      assumptions: [
        { rules: [{ question_id: 'Q1' }, { question_id: 'Q2' }] },
      ],
    };
    expect(getRuleTargetQids(rule).sort()).toEqual(['Q1', 'Q2']);
  });

  it('extracts from then_rules and else_rules (CONDITIONAL)', () => {
    const rule = {
      if_rules: [{ question_id: 'Q_IGNORED' }],
      then_rules: [{ question_id: 'Q1' }],
      else_rules: [{ question_id: 'Q2' }],
    };
    const qids = getRuleTargetQids(rule);
    expect(qids).not.toContain('Q_IGNORED');
    expect(qids.sort()).toEqual(['Q1', 'Q2']);
  });

  it('deduplicates across paths', () => {
    const rule = {
      question_id: 'Q1',
      question_ids: ['Q1', 'Q2'],
    };
    const qids = getRuleTargetQids(rule);
    expect(qids.sort()).toEqual(['Q1', 'Q2']);
  });

  it('returns empty for rule with no targets', () => {
    expect(getRuleTargetQids({ type: 'SOME_RULE' })).toEqual([]);
  });
});

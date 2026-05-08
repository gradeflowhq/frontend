import { describe, expect, it } from 'vitest';

import {
  findSchemaKeyByType,
  friendlyRuleLabel,
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
        scope: { default: 'question' },
        question_id: { type: 'string' },
      },
    },
    AllOrNothingMultiQuestionRule: {
      properties: {
        type: { default: 'ALL_OR_NOTHING' },
        scope: { default: 'global' },
      },
    },
  } as never;

  it('finds by const value and scope', () => {
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH', 'question')).toBe('TextMatchQuestionRule');
  });

  it('finds by default value and scope', () => {
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING', 'global')).toBe('AllOrNothingMultiQuestionRule');
  });

  it('returns null for unknown type', () => {
    expect(findSchemaKeyByType(defs, 'UNKNOWN', 'question')).toBeNull();
  });

  it('filters by question scope', () => {
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH', 'question')).toBe('TextMatchQuestionRule');
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING', 'question')).toBeNull();
  });

  it('filters by global scope', () => {
    expect(findSchemaKeyByType(defs, 'ALL_OR_NOTHING', 'global')).toBe('AllOrNothingMultiQuestionRule');
    expect(findSchemaKeyByType(defs, 'TEXT_MATCH', 'global')).toBeNull();
  });
});

describe('isRuleObject', () => {
  const defs = {
    TextMatchQuestionRule: {
      properties: {
        type: { const: 'TEXT_MATCH' },
        scope: { default: 'question' },
        question_id: { type: 'string' },
      },
    },
  } as never;

  it('returns true for valid rule object', () => {
    expect(isRuleObject({ type: 'TEXT_MATCH', scope: 'question', question_id: 'Q1' }, defs)).toBe(true);
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

  it('returns false for missing scope', () => {
    expect(isRuleObject({ type: 'TEXT_MATCH', question_id: 'Q1' }, defs)).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(isRuleObject({ type: 'UNKNOWN', scope: 'question' }, defs)).toBe(false);
  });
});

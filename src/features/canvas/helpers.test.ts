import { describe, expect, it } from 'vitest';

import { buildUserIdMap, mapCanvasId, parseCsvGrades, pickValue } from '@features/canvas/helpers';

describe('pickValue', () => {
  it('returns raw by default', () => {
    expect(pickValue(10, 8)).toBe(8);
  });

  it('returns rounded when useRounded is true', () => {
    expect(pickValue(10, 8, true)).toBe(10);
  });

  it('falls back to raw when rounded is undefined', () => {
    expect(pickValue(undefined, 8, true)).toBe(8);
  });

  it('falls back to rounded when raw is undefined', () => {
    expect(pickValue(10, undefined)).toBe(10);
  });

  it('returns undefined when both are undefined', () => {
    expect(pickValue(undefined, undefined)).toBeUndefined();
  });
});

describe('parseCsvGrades', () => {
  it('parses CSV with standard headers', () => {
    const csv = 'student_id,total_points,total_max_points\nalice,85,100\nbob,90,100';
    const rows = parseCsvGrades(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].studentId).toBe('alice');
    expect(rows[0].totalPoints).toBe(85);
    expect(rows[0].totalMaxPoints).toBe(100);
  });

  it('filters out rows with empty student IDs', () => {
    const csv = 'student_id,total_points\nalice,85\n,90';
    const rows = parseCsvGrades(csv);
    expect(rows).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(parseCsvGrades('')).toEqual([]);
  });

  it('parses rounded columns', () => {
    const csv = 'student_id,rounded_total_points\nalice,85.5';
    const rows = parseCsvGrades(csv);
    expect(rows[0].roundedTotalPoints).toBe(85.5);
  });
});

describe('buildUserIdMap', () => {
  it('maps all Canvas user identifiers to canvas ID', () => {
    const users = [
      {
        id: 42,
        login_id: 'alice',
        sis_user_id: 'SIS001',
        integration_id: null,
        email: 'alice@school.edu',
        name: 'Alice Smith',
        sortable_name: 'Smith, Alice',
        short_name: 'Alice',
      },
    ];
    const idMap = buildUserIdMap(users as never[]);
    expect(idMap['42']).toBe('42');
    expect(idMap['alice']).toBe('42');
    expect(idMap['sis001']).toBe('42'); // normalized lowercase
    expect(idMap['alice@school.edu']).toBe('42');
  });

  it('handles multiple users', () => {
    const users = [
      { id: 1, login_id: 'alice', sis_user_id: null, integration_id: null, email: null, name: null, sortable_name: null, short_name: null },
      { id: 2, login_id: 'bob', sis_user_id: null, integration_id: null, email: null, name: null, sortable_name: null, short_name: null },
    ];
    const idMap = buildUserIdMap(users as never[]);
    expect(idMap['alice']).toBe('1');
    expect(idMap['bob']).toBe('2');
  });
});

describe('mapCanvasId', () => {
  const idMap = { alice: '42', bob: '99' };

  it('maps raw ID through idMap', () => {
    expect(mapCanvasId('Alice', {}, idMap)).toBe('42');
  });

  it('uses decrypted ID when available', () => {
    expect(mapCanvasId('encrypted_key', { encrypted_key: 'Bob' }, idMap)).toBe('99');
  });

  it('returns undefined for unknown ID', () => {
    expect(mapCanvasId('unknown', {}, idMap)).toBeUndefined();
  });
});

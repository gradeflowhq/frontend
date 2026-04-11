import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosCreateMock, postMock, getMock } = vi.hoisted(() => ({
  axiosCreateMock: vi.fn(),
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
  },
}));

import { createCanvasClient, parseCanvasBaseUrl } from './canvasClient';

describe('parseCanvasBaseUrl', () => {
  it('accepts valid http and https URLs and trims trailing slashes', () => {
    expect(parseCanvasBaseUrl('https://canvas.example.com///')).toBe('https://canvas.example.com');
    expect(parseCanvasBaseUrl('http://local.canvas/')).toBe('http://local.canvas');
  });

  it('rejects empty values and URLs without an http protocol', () => {
    expect(parseCanvasBaseUrl('   ')).toBeNull();
    expect(parseCanvasBaseUrl('canvas.example.com')).toBeNull();
    expect(parseCanvasBaseUrl('ftp://canvas.example.com')).toBeNull();
  });
});

describe('createCanvasClient', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    axiosCreateMock.mockReset();
    axiosCreateMock.mockReturnValue({
      post: postMock,
      get: getMock,
    });
  });

  it('sends top-level params when creating an assignment group', async () => {
    postMock.mockResolvedValue({
      data: {
        id: 1,
        name: 'Midterm Exams',
        group_weight: 30,
      },
    });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    expect(axiosCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'X-Host': 'canvas.example.com',
        }),
        timeout: expect.any(Number),
      }),
    );

    await client.createAssignmentGroup('42', 'Midterm Exams', 30);

    expect(postMock).toHaveBeenCalledWith('/api/v1/courses/42/assignment_groups', {
      name: 'Midterm Exams',
      group_weight: 30,
    });
  });
});
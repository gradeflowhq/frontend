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

import { createCanvasClient } from './canvasClient';

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

    await client.createAssignmentGroup('42', 'Midterm Exams', 30);

    expect(postMock).toHaveBeenCalledWith('/api/v1/courses/42/assignment_groups', {
      name: 'Midterm Exams',
      group_weight: 30,
    });
  });
});
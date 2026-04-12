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

  it('findAssignmentByName returns case-insensitive match', async () => {
    getMock.mockResolvedValue({
      data: [
        { id: 1, name: 'Homework 1' },
        { id: 2, name: '  Final Exam  ' },
      ],
    });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    const result = await client.findAssignmentByName('10', '  final exam ');
    expect(result).toEqual({ id: 2, name: '  Final Exam  ' });
  });

  it('findAssignmentByName returns null when no match', async () => {
    getMock.mockResolvedValue({ data: [{ id: 1, name: 'Quiz 1' }] });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    const result = await client.findAssignmentByName('10', 'Nonexistent');
    expect(result).toBeNull();
  });

  it('createAssignment applies default submission_types, grading_type, published', async () => {
    postMock.mockResolvedValue({ data: { id: 99, name: 'HW' } });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    await client.createAssignment('10', { name: 'HW', points_possible: 50 });

    expect(postMock).toHaveBeenCalledWith('/api/v1/courses/10/assignments', {
      assignment: {
        submission_types: ['none'],
        grading_type: 'points',
        published: true,
        name: 'HW',
        points_possible: 50,
      },
    });
  });

  it('createAssignment allows overriding defaults', async () => {
    postMock.mockResolvedValue({ data: { id: 100, name: 'Lab' } });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    await client.createAssignment('10', {
      name: 'Lab',
      grading_type: 'percent',
      published: false,
      submission_types: ['online_upload'],
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/courses/10/assignments', {
      assignment: {
        submission_types: ['online_upload'],
        grading_type: 'percent',
        published: false,
        name: 'Lab',
      },
    });
  });

  it('getProgress extracts pathname from full Canvas URL', async () => {
    getMock.mockResolvedValue({ data: { id: 5, workflow_state: 'completed' } });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    await client.getProgress('https://canvas.example.com/api/v1/progress/123');
    expect(getMock).toHaveBeenCalledWith('/api/v1/progress/123');
  });

  it('getProgress uses relative path as-is when not a valid URL', async () => {
    getMock.mockResolvedValue({ data: { id: 5, workflow_state: 'running' } });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    await client.getProgress('/api/v1/progress/456');
    expect(getMock).toHaveBeenCalledWith('/api/v1/progress/456');
  });

  it('listAllCourseUsers paginates until a short page is returned', async () => {
    // First page: 100 items (full page → continue)
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    // Second page: 30 items (short page → stop)
    const shortPage = Array.from({ length: 30 }, (_, i) => ({ id: 101 + i }));

    getMock
      .mockResolvedValueOnce({ data: fullPage })
      .mockResolvedValueOnce({ data: shortPage });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    const users = await client.listAllCourseUsers('10');
    expect(users).toHaveLength(130);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('pagination stops on empty page', async () => {
    getMock.mockResolvedValueOnce({ data: [] });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    const courses = await client.listAllCourses();
    expect(courses).toHaveLength(0);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('omits group_weight when not provided to createAssignmentGroup', async () => {
    postMock.mockResolvedValue({ data: { id: 5, name: 'Uncategorized' } });

    const client = createCanvasClient({
      canvasBaseUrl: 'https://canvas.example.com',
      token: 'test-token',
    });

    await client.createAssignmentGroup('10', 'Uncategorized');
    expect(postMock).toHaveBeenCalledWith('/api/v1/courses/10/assignment_groups', {
      name: 'Uncategorized',
    });
  });
});
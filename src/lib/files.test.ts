import { afterEach, describe, expect, it, vi } from 'vitest';

import { sanitizeFilenamePart, saveBlob, saveTextFile } from './files';

describe('saveBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an anchor element, triggers download, and cleans up', () => {
    const fakeUrl = 'blob:http://localhost/fake-uuid';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy, remove: removeSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    const blob = new Blob(['test'], { type: 'text/plain' });
    saveBlob(blob, 'output.txt');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe(fakeUrl);
    expect(anchor.download).toBe('output.txt');
    expect(document.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeUrl);
  });

  it('wraps text content in a blob when saving text files', async () => {
    const fakeUrl = 'blob:http://localhost/fake-json';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy, remove: removeSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    saveTextFile('{"ok":true}', 'output.json', 'application/json;charset=utf-8');

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0] ?? [];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/json;charset=utf-8');
    await expect((blob as Blob).text()).resolves.toBe('{"ok":true}');
    expect(anchor.download).toBe('output.json');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
  });
});

describe('sanitizeFilenamePart', () => {
  it('normalizes unsafe filename characters', () => {
    expect(sanitizeFilenamePart(' Midterm Exam #1 ', 'fallback')).toBe('midterm-exam-1');
  });

  it('falls back when no safe characters remain', () => {
    expect(sanitizeFilenamePart('***', 'assessment')).toBe('assessment');
  });
});

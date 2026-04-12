import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveBlob } from './files';

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
});

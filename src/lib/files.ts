export const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const saveTextFile = (
  content: string,
  filename: string,
  mediaType = 'text/plain;charset=utf-8',
) => {
  saveBlob(new Blob([content], { type: mediaType }), filename);
};

export const sanitizeFilenamePart = (value: string | null | undefined, fallback: string) => {
  const sanitized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || fallback;
};
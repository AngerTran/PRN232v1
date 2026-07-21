const CLOUDINARY_UPLOAD = '/upload/';

export function resolveManuscriptFileName(url: string, preferredName?: string | null): string {
  const preferred = preferredName?.trim();
  if (preferred) return preferred;
  try {
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    return name || 'ban-thao';
  } catch {
    return 'ban-thao';
  }
}

/** Tải file qua fetch + blob để giữ tên gốc (thuộc tính download không hoạt động với URL cross-origin). */
export async function downloadManuscriptFile(url: string, preferredName?: string | null): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Không có liên kết bản thảo.');
  }

  const filename = resolveManuscriptFileName(trimmed, preferredName);
  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Không thể tải bản thảo (${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** @deprecated Dùng downloadManuscriptFile — fl_attachment gây HTTP 400 trên raw upload. */
export function buildManuscriptDownloadUrl(url: string, _preferredName?: string | null): string {
  return url.trim();
}

/** Chương 0 = bản thảo đề xuất series (không lấy bản thảo chương sản xuất). */
export function getProposalChapter<T extends { number: number }>(chapters: T[]): T | undefined {
  return chapters.find(c => c.number === 0);
}

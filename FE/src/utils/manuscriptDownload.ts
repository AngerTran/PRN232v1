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

export function buildManuscriptDownloadUrl(url: string, preferredName?: string | null): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const filename = resolveManuscriptFileName(trimmed, preferredName);
  if (!trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }

  const markerIdx = trimmed.indexOf(CLOUDINARY_UPLOAD);
  if (markerIdx === -1) {
    return trimmed;
  }

  const insertAt = markerIdx + CLOUDINARY_UPLOAD.length;
  const afterUpload = trimmed.slice(insertAt);
  if (afterUpload.startsWith('fl_attachment:') || afterUpload.includes('/fl_attachment:')) {
    return trimmed;
  }

  const attachmentFlag = `fl_attachment:${encodeAttachmentFilename(filename)}`;
  return `${trimmed.slice(0, insertAt)}${attachmentFlag}/${afterUpload}`;
}

function encodeAttachmentFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/'/g, '%27');
}

/** Chương 0 = bản thảo đề xuất series (không lấy bản thảo chương sản xuất). */
export function getProposalChapter<T extends { number: number }>(chapters: T[]): T | undefined {
  return chapters.find(c => c.number === 0);
}

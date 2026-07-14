import { useLocation } from 'react-router';

/** Đường dẫn xem series/chương theo role (mangaka vs board). */
export function useSeriesContentPaths(seriesId?: string) {
  const { pathname } = useLocation();
  const isBoard = pathname.startsWith('/board/');

  if (isBoard) {
    const seriesBase = seriesId ? `/board/approved-series/${seriesId}` : '/board/approved-series';
    return {
      isBoard: true as const,
      seriesBase,
      chaptersList: seriesId ? `${seriesBase}/chapters` : '/board/approved-series',
      chapterDetail: (chapterId: string) => `/board/chapters/${chapterId}`,
      reader: seriesId ? `${seriesBase}/read` : undefined,
      breadcrumbRoot: { label: 'Series Đã Nhận', href: '/board/approved-series' },
      seriesCrumbLabel: (title: string) => title,
    };
  }

  const seriesBase = seriesId ? `/mangaka/series/${seriesId}` : '/mangaka/series';
  return {
    isBoard: false as const,
    seriesBase,
    chaptersList: seriesId ? `${seriesBase}/chapters` : '/mangaka/chapters',
    chapterDetail: (chapterId: string) => `/mangaka/chapters/${chapterId}`,
    reader: seriesId ? `${seriesBase}/read` : undefined,
    breadcrumbRoot: { label: 'Series của tôi', href: '/mangaka/series' },
    seriesCrumbLabel: (title: string) => title,
  };
}

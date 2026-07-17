import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, ImageOff, Rows3, ZoomIn, ZoomOut } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Chapter, Series } from '../../types/domain';
import { getSeries, getSeriesChapters } from '../../services/seriesApi';
import { getChapterPages, type WorkspacePageItem } from '../../services/workspaceApi';

interface BookPage {
  chapter: Chapter;
  page: WorkspacePageItem;
}

export default function SeriesReaderPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialChapterId = searchParams.get('chapter');
  const { setPageMeta } = usePageMeta();
  const isBoardReader = location.pathname.startsWith('/board/');
  const backHref = isBoardReader
    ? `/board/approved-series/${seriesId}/chapters`
    : `/mangaka/series/${seriesId}/chapters`;
  const [series, setSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookPages, setBookPages] = useState<BookPage[]>([]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<'book' | 'vertical'>('book');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jumpedToChapter, setJumpedToChapter] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    let active = true;

    async function loadBook() {
      setLoading(true);
      setError('');
      try {
        const [seriesItem, chapterItems] = await Promise.all([
          getSeries(seriesId!),
          getSeriesChapters(seriesId!),
        ]);
        // Board xem nội dung sản xuất (bỏ chapter 0 bản thảo đề xuất).
        const filtered = isBoardReader
          ? chapterItems.filter(c => c.number > 0)
          : chapterItems;
        const orderedChapters = [...filtered].sort((a, b) => a.number - b.number);
        const pageLists = await Promise.all(
          orderedChapters.map(chapter => getChapterPages(chapter.id).catch(() => []))
        );
        const pages = orderedChapters.flatMap((chapter, index) =>
          [...pageLists[index]]
            .sort((a, b) => a.pageNumber - b.pageNumber)
            .map(page => ({ chapter, page }))
        );

        if (!active) return;
        setSeries(seriesItem);
        setChapters(orderedChapters);
        setBookPages(pages);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không thể tải bộ manga.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBook();
    return () => {
      active = false;
    };
  }, [seriesId, isBoardReader]);

  useEffect(() => {
    setJumpedToChapter(false);
  }, [initialChapterId, seriesId]);

  useEffect(() => {
    if (jumpedToChapter || !initialChapterId || bookPages.length === 0) return;
    const start = bookPages.findIndex(item => item.chapter.id === initialChapterId);
    if (start >= 0) {
      setSpreadIndex(start);
      setJumpedToChapter(true);
    }
  }, [initialChapterId, bookPages, jumpedToChapter]);

  useEffect(() => {
    if (!series) return;
    setPageMeta({
      title: `Đọc ${series.title}`,
      breadcrumb: isBoardReader
        ? [
            { label: 'Series Đã Nhận', href: '/board/approved-series' },
            { label: series.title, href: `/board/approved-series/${series.id}` },
            { label: 'Chương', href: `/board/approved-series/${series.id}/chapters` },
            { label: 'Đọc truyện' },
          ]
        : [
            { label: 'Series của tôi', href: '/mangaka/series' },
            { label: series.title, href: `/mangaka/series/${series.id}` },
            { label: 'Chương', href: `/mangaka/series/${series.id}/chapters` },
            { label: 'Đọc truyện' },
          ],
    });
  }, [series, isBoardReader, setPageMeta]);

  const currentPage = bookPages[spreadIndex];
  const nextPage = bookPages[spreadIndex + 1];
  const canGoBack = spreadIndex > 0;
  const canGoNext = spreadIndex + 2 < bookPages.length;

  const chapterStarts = useMemo(
    () => chapters.map(chapter => ({
      chapter,
      index: bookPages.findIndex(item => item.chapter.id === chapter.id),
    })).filter(item => item.index >= 0),
    [chapters, bookPages]
  );

  const goBack = () => setSpreadIndex(index => Math.max(0, index - 2));
  const goNext = () => setSpreadIndex(index => Math.min(Math.max(0, bookPages.length - 1), index + 2));

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Đọc trái → phải: ← trang trước, → trang sau
      if (event.key === 'ArrowLeft') goBack();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [bookPages.length]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang đóng thành cuốn manga...</div>;
  }

  if (!series || error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Không thể mở manga"
          description={error || 'Series này không tồn tại.'}
          action={
            <Button variant="outline" onClick={() => navigate(isBoardReader ? '/board/approved-series' : '/mangaka/series')}>
              Quay lại series
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#171717] text-white">
      <header className="border-b border-white/10 bg-[#202020]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => navigate(backHref)}>
            <ArrowLeft size={16} /> Quay lại
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{series.title}</p>
            <p className="text-xs text-white/50">
              {currentPage
                ? `Chương ${currentPage.chapter.number}${currentPage.chapter.title ? `: ${currentPage.chapter.title}` : ''}`
                : 'Chưa có nội dung'}
            </p>
          </div>
          <select
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white outline-none"
            value={currentPage?.chapter.id ?? ''}
            onChange={event => {
              const target = chapterStarts.find(item => item.chapter.id === event.target.value);
              if (target) setSpreadIndex(target.index);
            }}
          >
            {chapterStarts.map(({ chapter }) => (
              <option key={chapter.id} value={chapter.id} className="text-black">
                Chương {chapter.number}: {chapter.title}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5">
            <button
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                mode === 'book' ? 'bg-white text-black' : 'text-white/65 hover:text-white'
              }`}
              onClick={() => setMode('book')}
            >
              <BookOpen size={14} /> Cuốn manga
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                mode === 'vertical' ? 'bg-white text-black' : 'text-white/65 hover:text-white'
              }`}
              onClick={() => setMode('vertical')}
            >
              <Rows3 size={14} /> Cuộn dọc
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-white/15 bg-white/5">
            <button className="p-2 text-white/70 hover:text-white disabled:opacity-30"
              disabled={zoom <= 0.7} onClick={() => setZoom(value => Math.max(0.7, value - 0.1))}>
              <ZoomOut size={16} />
            </button>
            <span className="w-12 text-center text-xs text-white/60">{Math.round(zoom * 100)}%</span>
            <button className="p-2 text-white/70 hover:text-white disabled:opacity-30"
              disabled={zoom >= 1.3} onClick={() => setZoom(value => Math.min(1.3, value + 0.1))}>
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </header>

      {bookPages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={<ImageOff size={24} />} title="Chưa có trang manga"
            description="Hãy tải trang lên các chương trước khi mở chế độ đọc." />
        </div>
      ) : mode === 'vertical' ? (
        <VerticalReader pages={bookPages} zoom={zoom} />
      ) : (
        <>
          <main className="flex flex-1 items-center justify-center overflow-auto px-4 py-8">
            <div
              className="relative flex origin-center items-stretch justify-center shadow-[0_24px_80px_rgba(0,0,0,0.65)] transition-transform"
              style={{ transform: `scale(${zoom})` }}
            >
              <BookLeaf item={currentPage} side="left" />
              <div className="hidden w-px bg-black shadow-[0_0_16px_6px_rgba(0,0,0,0.45)] md:block" />
              <BookLeaf item={nextPage} side="right" />
            </div>
          </main>

          <footer className="border-t border-white/10 bg-[#202020] px-4 py-3">
            <div className="mx-auto flex max-w-xl items-center justify-center gap-4">
              <Button variant="outline" disabled={!canGoBack} onClick={goBack}>
                <ChevronLeft size={18} /> Trang trước
              </Button>
              <span className="min-w-20 text-center text-xs text-white/50">
                {Math.min(spreadIndex + 1, bookPages.length)} / {bookPages.length}
              </span>
              <Button variant="outline" disabled={!canGoNext} onClick={goNext}>
                Trang sau <ChevronRight size={18} />
              </Button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

function VerticalReader({ pages, zoom }: { pages: BookPage[]; zoom: number }) {
  return (
    <main className="flex-1 overflow-auto px-3 py-8">
      <div className="mx-auto space-y-2 transition-[max-width]" style={{ maxWidth: `${800 * zoom}px` }}>
        {pages.map((item, index) => {
          const source = item.page.imageUrl ?? item.page.thumbnailUrl;
          const startsChapter = index === 0 || pages[index - 1].chapter.id !== item.chapter.id;
          return (
            <section key={item.page.id}>
              {startsChapter && (
                <div className="pb-5 pt-10 text-center first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                    Chương {item.chapter.number}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{item.chapter.title}</h2>
                </div>
              )}
              <figure className="overflow-hidden rounded-sm bg-white/5 shadow-2xl">
                {source ? (
                  <img src={source} alt="" loading="lazy" className="block h-auto w-full" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center text-white/35">
                    <ImageOff size={28} />
                  </div>
                )}
              </figure>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function BookLeaf({ item, side }: { item?: BookPage; side: 'left' | 'right' }) {
  const source = item?.page.imageUrl ?? item?.page.thumbnailUrl;
  // Mobile: luôn hiện trang trái (trang chính của spread); trang phải chỉ hiện từ md trở lên.
  return (
    <figure className={`${side === 'right' ? 'hidden md:flex' : 'flex'} aspect-[3/4] h-[68vh] max-h-[820px] min-h-[420px] flex-col overflow-hidden bg-[#f7f3e9]`}>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {source ? (
          <img src={source} alt="" className="h-full w-full object-contain" />
        ) : (
          <ImageOff size={28} className="text-black/25" />
        )}
      </div>
    </figure>
  );
}

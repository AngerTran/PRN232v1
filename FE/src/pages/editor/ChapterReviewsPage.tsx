import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { ChapterReviewCard } from '../../app/components/ui/editor';
import type { Chapter, Series } from '../../types/domain';
import { getSeriesChapters } from '../../services/seriesApi';
import { getEditorAssignedSeries } from '../../services/editorApi';

interface SeriesReviewGroup {
  series: Series;
  chapters: Chapter[];
}

export default function ChapterReviewsPage() {
  usePageMeta({ title: 'Chapter Reviews' });
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadReviews() {
      setIsLoading(true);
      setError(null);

      try {
        const series = await getEditorAssignedSeries();
        const chapterGroups = await Promise.all(
          series.map(item => getSeriesChapters(item.id).catch(() => []))
        );

        if (isActive) {
          setSeriesList(series);
          setChapters(chapterGroups.flat());
        }
      } catch (err) {
        if (isActive) {
          setSeriesList([]);
          setChapters([]);
          setError(err instanceof Error ? err.message : 'Không thể tải chapter reviews từ backend.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      isActive = false;
    };
  }, []);

  const seriesById = useMemo(
    () => new Map(seriesList.map(series => [series.id, series])),
    [seriesList]
  );

  const chaptersToReview = useMemo(
    () => chapters.filter(chapter => chapter.status === 'Review'),
    [chapters]
  );

  const groups = useMemo(() => {
    const bySeries = new Map<string, Chapter[]>();
    for (const chapter of chaptersToReview) {
      const list = bySeries.get(chapter.seriesId) ?? [];
      list.push(chapter);
      bySeries.set(chapter.seriesId, list);
    }

    const result: SeriesReviewGroup[] = [];
    for (const [seriesId, seriesChapters] of bySeries) {
      const series = seriesById.get(seriesId);
      if (!series) continue;
      result.push({
        series,
        chapters: [...seriesChapters].sort((a, b) => a.number - b.number),
      });
    }

    result.sort((a, b) => a.series.title.localeCompare(b.series.title, 'vi'));
    return result;
  }, [chaptersToReview, seriesById]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chapter Reviews</h1>
        <p className="text-muted-foreground mt-1">
          {chaptersToReview.length} chapter cần review
          {groups.length > 0 ? ` · ${groups.length} series` : ''}
        </p>
      </div>

      {isLoading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            Đang tải chapter reviews...
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="py-12 text-center text-destructive">
            {error}
          </div>
        </Card>
      ) : groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map(({ series, chapters: seriesChapters }) => (
            <section key={series.id} className="space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted border border-border/80">
                  {series.coverUrl ? (
                    <img
                      src={series.coverUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <BookOpen className="h-4 w-4 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold truncate">{series.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {seriesChapters.length} chapter cần review
                    {series.mangakaName ? ` · ${series.mangakaName}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {seriesChapters.map(chapter => (
                  <ChapterReviewCard
                    key={chapter.id}
                    chapter={chapter}
                    seriesTitle={series.title}
                    coverUrl={series.coverUrl}
                    onReview={() => navigate(`/editor/chapters/${chapter.id}/review`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            Không có chapter nào cần review
          </div>
        </Card>
      )}
    </div>
  );
}

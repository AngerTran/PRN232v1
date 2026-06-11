import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../app/components/ui/card';
import { ChapterReviewCard } from '../../app/components/ui/editor';
import type { Chapter, Series } from '../../types/domain';
import { getSeriesChapters, getVisibleSeries } from '../../services/seriesApi';

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
        const series = await getVisibleSeries();
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

  const seriesTitleById = useMemo(
    () => new Map(seriesList.map(series => [series.id, series.title])),
    [seriesList]
  );
  const chaptersToReview = chapters.filter(chapter => chapter.status === 'Review' || chapter.status === 'In Progress');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chapter Reviews</h1>
        <p className="text-muted-foreground mt-1">
          {chaptersToReview.length} chapters cần review
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
      ) : chaptersToReview.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chaptersToReview.map(chapter => (
            <ChapterReviewCard
              key={chapter.id}
              chapter={chapter}
              seriesTitle={seriesTitleById.get(chapter.seriesId)}
              onReview={() => navigate(`/editor/chapters/${chapter.id}/review`)}
            />
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

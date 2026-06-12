import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { SeriesSummaryCard, ChapterReviewCard } from '../../app/components/ui/editor';
import type { Chapter, Series } from '../../types/domain';
import { getStoredUser } from '../../services/authApi';
import { getSeriesChapters } from '../../services/seriesApi';
import { getEditorAssignedSeries } from '../../services/editorApi';
import {
  BookOpen,
  FileText,
  Clock,
  AlertTriangle,
  Shield,
} from 'lucide-react';

export default function EditorDashboardPage() {
  usePageMeta({ title: 'Editor Dashboard' });
  const navigate = useNavigate();
  const editor = getStoredUser();
  const [assignedSeries, setAssignedSeries] = useState<Series[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const series = await getEditorAssignedSeries();
        const chapterGroups = await Promise.all(
          series.map(item => getSeriesChapters(item.id).catch(() => []))
        );

        if (isActive) {
          setAssignedSeries(series);
          setChapters(chapterGroups.flat());
        }
      } catch (err) {
        if (isActive) {
          setAssignedSeries([]);
          setChapters([]);
          setError(err instanceof Error ? err.message : 'Không thể tải editor dashboard từ backend.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const atRiskSeries = assignedSeries.filter(series => series.isAtRisk);
  const chaptersToReview = chapters.filter(chapter => chapter.status === 'Review' || chapter.status === 'In Progress');

  // Summary stats
  const pendingReviews = chaptersToReview.length;
  const revisionRequests = chapters.filter(chapter => chapter.status === 'Review').length;
  const upcomingDeadlines = chapters.filter(chapter => {
    const days = Math.ceil((new Date(chapter.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;
  const seriesTitleById = useMemo(
    () => new Map(assignedSeries.map(series => [series.id, series.title])),
    [assignedSeries]
  );

  // Get chapters for display
  const chaptersNeedReview = chaptersToReview.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Chào mừng trở lại, {editor?.name ?? 'Editor'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bạn đang phụ trách <span className="font-medium text-foreground">{assignedSeries.length} series</span>.{' '}
            Có <span className="font-medium text-foreground">{pendingReviews} chapter</span> cần review.
            {atRiskSeries.length > 0 && (
              <span className="text-orange-600 font-medium">
                {' '}Cảnh báo: {atRiskSeries.length} series đang At Risk.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="py-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Series Phụ Trách</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedSeries.length}</div>
            <p className="text-xs text-muted-foreground">Series đang theo dõi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews}</div>
            <p className="text-xs text-muted-foreground">Chapters chờ review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deadline Sắp Tới</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">Trong 7 ngày tới</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yêu Cầu Sửa</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revisionRequests}</div>
            <p className="text-xs text-muted-foreground">Chapters cần revision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{atRiskSeries.length}</div>
            <p className="text-xs text-muted-foreground">Series cần bảo vệ</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Chapters Cần Review</h2>
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Đang tải chapters...
            </CardContent>
          </Card>
        ) : chaptersNeedReview.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chaptersNeedReview.map(chapter => (
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
            <CardContent className="py-8 text-center text-muted-foreground">
              Không có chapter nào cần review
            </CardContent>
          </Card>
        )}
      </div>

      {/* At Risk Series */}
      {atRiskSeries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-orange-600">
            ⚠️ Series At Risk - Cần Chú Ý
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {atRiskSeries.map(series => (
              <SeriesSummaryCard
                key={series.id}
                series={series}
                onClick={() => navigate(`/editor/series/${series.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned Series */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Series Đang Phụ Trách</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignedSeries.slice(0, 6).map(series => (
            <SeriesSummaryCard
              key={series.id}
              series={series}
              onClick={() => navigate(`/editor/series/${series.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

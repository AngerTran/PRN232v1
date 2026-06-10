import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, FileText, BarChart2, Send, Plus, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, Tab, TabPanel } from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import ChapterCard from '../../components/ui/ChapterCard';
import RankingTrend from '../../components/ui/RankingTrend';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Chapter, Series } from '../../types/domain';
import { getSeries, getSeriesChapters, submitSeriesForReview } from '../../services/seriesApi';

export default function SeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();
  const [tab, setTab] = useState('chapters');
  const [series, setSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Series-level editorial submissions and ranking history are not yet exposed
  // by the backend, so these sections render their empty states for now.
  const submissions: never[] = [];
  const ranking = null;

  useEffect(() => {
    if (!seriesId) return;

    let active = true;
    async function loadSeriesDetail() {
      setLoading(true);
      setError('');

      try {
        const seriesItem = await getSeries(seriesId);
        const chapterItems = await getSeriesChapters(seriesId).catch(err => {
          if (active) {
            setError(err instanceof Error ? `Không thể tải chapters: ${err.message}` : 'Không thể tải chapters từ backend.');
          }
          return [];
        });

        if (!active) return;
        setSeries({ ...seriesItem, chaptersCount: chapterItems.length });
        setChapters(chapterItems);
      } catch (err) {
        if (active) {
          setSeries(null);
          setChapters([]);
          setError(err instanceof Error ? err.message : 'Không thể tải series từ backend.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSeriesDetail();

    return () => {
      active = false;
    };
  }, [seriesId]);

  useEffect(() => {
    if (series) {
      setPageMeta({
        title: series.title,
        breadcrumb: [{ label: 'Series của tôi', href: '/mangaka/series' }, { label: series.title }],
      });
    }
  }, [series?.id]);

  const handleSubmitForReview = async () => {
    if (!series) return;
    const confirmed = await confirm({
      title: 'Gửi xét duyệt',
      message: (
        <>
          Gửi series <span className="font-semibold text-foreground">{series.title}</span> đến hội đồng xét duyệt?
        </>
      ),
      confirmText: 'Gửi duyệt',
    });
    if (!confirmed) return;

    setSubmitting(true);
    setError('');
    try {
      const updated = await submitSeriesForReview(series.id);
      setSeries(prev => prev ? { ...prev, status: updated.status } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi series để xét duyệt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Dang tai series...</div>;
  }

  if (!series) {
    return (
      <div className="p-6">
        <EmptyState title="Không tìm thấy series" description="Series này không tồn tại hoặc đã bị xóa." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {series.status === 'Submitted' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Series đang chờ hội đồng xét duyệt.
        </div>
      )}

      {series.status === 'Cancelled' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Series đã bị hội đồng từ chối.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="w-28 h-36 rounded-xl overflow-hidden shrink-0 bg-muted shadow-md">
          <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap mb-2">
            <h1 className="text-2xl font-bold leading-tight">{series.title}</h1>
            <Badge status={series.status} size="md" />
            {series.isAtRisk && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">NGUY CƠ</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mb-3">{series.genre} · {series.targetAudience} · {series.publishingType}</p>
          <p className="text-sm text-foreground/80 leading-relaxed mb-4 max-w-2xl line-clamp-3">{series.synopsis}</p>
          <div className="flex items-center gap-4 flex-wrap">
            {series.currentRank > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Xếp hạng</span>
                <span className="font-bold text-lg text-foreground">#{series.currentRank}</span>
              </div>
            )}
            {series.voteScore > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Phiếu bầu</span>
                <span className="font-bold text-lg text-foreground">{series.voteScore.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Chương</span>
              <span className="font-bold text-lg text-foreground">{series.chaptersCount}</span>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              {series.status === 'Draft' && (
                <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmitForReview}>
                  <Send size={14} /> Gửi xét duyệt
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/chapters`)}>
                <FileText size={14} /> Chương
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/read`)}>
                <BookOpen size={14} /> Đọc toàn bộ
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/chapters/create`)}>
                <Plus size={14} /> Chương mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <Tab value="overview"><BookOpen size={14} className="inline mr-1.5" />Tổng quan</Tab>
          <Tab value="chapters"><FileText size={14} className="inline mr-1.5" />Chương ({chapters.length})</Tab>
          {ranking && <Tab value="ranking"><BarChart2 size={14} className="inline mr-1.5" />Xếp hạng</Tab>}
          <Tab value="submissions"><Send size={14} className="inline mr-1.5" />Nộp bài ({submissions.length})</Tab>
        </TabsList>

        <TabPanel value="overview" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>Tóm tắt</CardTitle></CardHeader>
              <p className="text-sm text-foreground/80 leading-relaxed">{series.synopsis}</p>
            </Card>
            {series.mainCharacters && (
              <Card>
                <CardHeader><CardTitle>Nhân vật chính</CardTitle></CardHeader>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{series.mainCharacters}</p>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Chi tiết Series</CardTitle></CardHeader>
              <dl className="space-y-3">
                {[
                  { label: 'Trạng thái', value: <Badge status={series.status} /> },
                  { label: 'Thể loại', value: series.genre },
                  { label: 'Đối tượng độc giả', value: series.targetAudience },
                  { label: 'Lịch xuất bản', value: series.publishingType },
                  { label: 'Tổng số chương', value: series.chaptersCount },
                  { label: 'Ngày tạo', value: series.createdAt },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <dt className="text-muted-foreground font-medium">{label}</dt>
                    <dd className="font-semibold text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="chapters" className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{chapters.length} chương</p>
            <Button variant="primary" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/chapters/create`)}>
              <Plus size={14} /> Thêm chương
            </Button>
          </div>
          {chapters.length === 0 ? (
            <EmptyState title="Chưa có chương nào" description="Tạo chương đầu tiên để bắt đầu." />
          ) : (
            <div className="space-y-2">
              {chapters.sort((a, b) => a.number - b.number).map(ch => (
                <ChapterCard key={ch.id} chapter={ch} seriesId={series.id} />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="ranking" className="mt-5">
          {ranking ? <RankingTrend ranking={ranking} /> : <EmptyState title="Chưa có dữ liệu xếp hạng" description="Series phải được xuất bản để có dữ liệu xếp hạng." />}
        </TabPanel>

        <TabPanel value="submissions" className="mt-5">
          {submissions.length === 0 ? (
            <EmptyState title="Chưa có nộp bài" description="Chưa có bài nộp biên tập nào cho series này." />
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quyết định</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Phản hồi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground">{sub.submittedDate}</td>
                        <td className="px-5 py-3"><Badge status={sub.status} /></td>
                        <td className="px-5 py-3 text-sm font-medium">{sub.boardDecision ?? '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs max-w-xs truncate hidden md:table-cell">{sub.feedback ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

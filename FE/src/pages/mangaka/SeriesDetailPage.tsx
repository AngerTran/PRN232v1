import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, BookOpen, FileText, BarChart2, Send, Plus, CheckCircle2, Pencil, FileDown, Tags, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getStoredUser } from '../../services/authApi';
import { Tabs, TabsList, Tab, TabPanel } from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ChapterCard from '../../components/ui/ChapterCard';
import RankingTrend from '../../components/ui/RankingTrend';
import EmptyState from '../../components/ui/EmptyState';
import SeriesTeamCard from '../../components/series/SeriesTeamCard';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import type { Chapter, Series, SeriesRanking } from '../../types/domain';
import {
  getSeries,
  getSeriesChapters,
  getSeriesStats,
  getSeriesRankingTrend,
  getSeriesTeam,
  mapUiStatusToApi,
  isSeriesSubmitted,
  canMangakaProduceOnSeries,
  SERIES_PRODUCTION_LOCK_HINT,
  SERIES_SUBMISSION_STATUS_HINT,
  submitSeriesForReview,
  markSeriesCompleted,
  upsertSeriesProposalManuscript,
  type SeriesStats,
  type SeriesTeam,
} from '../../services/seriesApi';
import {
  createSeriesTaskPriceProposal,
  getSeriesTaskPriceTable,
  type TaskPriceItem,
} from '../../services/taskPricingApi';
import { formatVnd, formatVndInput, parseVndInput } from '../../utils/formatCurrency';
import { getTaskTypeLabel, setTaskTypeLabelsFromCatalog } from '../../utils/taskTypes';

export default function SeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setPageMeta } = usePageMeta();
  const confirm = useConfirm();
  const user = getStoredUser();
  const isEditorView = user?.role === 'editor' && location.pathname.startsWith('/editor/');
  const isMangakaView = !isEditorView;

  const [tab, setTab] = useState('overview');
  const [series, setSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [submissionStats, setSubmissionStats] = useState<SeriesStats | null>(null);
  const [submissionStatsLoading, setSubmissionStatsLoading] = useState(false);
  const [ranking, setRanking] = useState<SeriesRanking | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [team, setTeam] = useState<SeriesTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [priceTable, setPriceTable] = useState<TaskPriceItem[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalNote, setProposalNote] = useState('');
  const [proposalDraft, setProposalDraft] = useState<Record<string, string>>({});
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [replacingManuscript, setReplacingManuscript] = useState(false);
  const manuscriptInputRef = useRef<HTMLInputElement>(null);

  const showRankingTab = series
    ? !['Draft', 'Submitted', 'Cancelled'].includes(series.status)
    : false;
  const canProduce = series ? canMangakaProduceOnSeries(series.status) : false;
  const productionLockHint = series ? SERIES_PRODUCTION_LOCK_HINT[series.status] : undefined;
  const isAssignedEditor = Boolean(isEditorView && series && user && series.editorId === user.id);
  const productionChapters = chapters.filter(c => c.number > 0);
  // Sau khi board lên lịch, series Completed → Publishing nên mất cờ "đã báo".
  // Coi đã báo nếu còn nhãn Completed hoặc đã có chương xuất bản.
  const hasPublishedChapter = productionChapters.some(c => c.status === 'Published');
  const alreadyReportedReady =
    isAssignedEditor && (series?.status === 'Completed' || hasPublishedChapter);
  const canMarkReadyForPublish =
    isAssignedEditor && canProduce && !alreadyReportedReady;
  const canEditProfile = isMangakaView && series && (series.status === 'Draft' || series.status === 'Cancelled');
  // Bản thảo đề xuất (chapter 0) — mangaka được thay file mọi lúc.
  const canReplaceManuscript = Boolean(isMangakaView && series);
  const waitingForBoardEditor = isMangakaView && series && canProduce && !series.editorId;
  const proposalChapter = chapters.find(c => c.number === 0) ?? chapters.find(c => Boolean(c.description?.trim()));
  const manuscriptUrl = proposalChapter?.description?.trim() || null;
  const manuscriptName = proposalChapter?.manuscriptFileName?.trim() || null;

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
        const productionOnly = chapterItems.filter(c => c.number > 0);
        setSeries({ ...seriesItem, chaptersCount: productionOnly.length });
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
    setTab('overview');
  }, [seriesId]);

  useEffect(() => {
    if (!seriesId) return;
    let active = true;
    setTeamLoading(true);
    getSeriesTeam(seriesId)
      .then(data => {
        if (active) setTeam(data);
      })
      .catch(() => {
        if (active) setTeam(null);
      })
      .finally(() => {
        if (active) setTeamLoading(false);
      });
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

  useEffect(() => {
    if (!seriesId || !series || !isSeriesSubmitted(series.status) || tab !== 'submissions') {
      setSubmissionStats(null);
      return;
    }

    let active = true;
    setSubmissionStatsLoading(true);
    getSeriesStats(seriesId)
      .then(stats => {
        if (active) setSubmissionStats(stats);
      })
      .catch(() => {
        if (active) setSubmissionStats(null);
      })
      .finally(() => {
        if (active) setSubmissionStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [seriesId, series?.status, tab]);

  useEffect(() => {
    if (!seriesId || !series || tab !== 'ranking' || !showRankingTab) {
      setRanking(null);
      return;
    }

    let active = true;
    setRankingLoading(true);
    getSeriesRankingTrend(seriesId, mapUiStatusToApi(series.status))
      .then(data => {
        if (active) setRanking(data);
      })
      .catch(() => {
        if (active) setRanking(null);
      })
      .finally(() => {
        if (active) setRankingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [seriesId, series?.status, tab, showRankingTab]);

  useEffect(() => {
    if (!seriesId) return;
    let active = true;
    setPriceLoading(true);
    getSeriesTaskPriceTable(seriesId)
      .then(table => {
        if (!active) return;
        setPriceTable(table.items);
        setTaskTypeLabelsFromCatalog(table.items);
        setProposalDraft(
          Object.fromEntries(table.items.map(i => [i.taskType, formatVndInput(String(i.price))]))
        );
      })
      .catch(() => {
        if (active) {
          setPriceTable([]);
          setProposalDraft({});
        }
      })
      .finally(() => {
        if (active) setPriceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [seriesId]);

  const handleSubmitPriceProposal = async () => {
    if (!seriesId || priceTable.length === 0) return;
    setSubmittingProposal(true);
    try {
      await createSeriesTaskPriceProposal(seriesId, {
        note: proposalNote.trim() || undefined,
        items: priceTable.map(item => ({
          taskType: item.taskType,
          price: parseVndInput(proposalDraft[item.taskType] ?? String(item.price)),
        })),
      });
      setProposalOpen(false);
      setProposalNote('');
      const table = await getSeriesTaskPriceTable(seriesId);
      setPriceTable(table.items);
      setProposalDraft(
        Object.fromEntries(table.items.map(i => [i.taskType, formatVndInput(String(i.price))]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi đề xuất giá.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleReplaceManuscript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!seriesId || !canReplaceManuscript) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setReplacingManuscript(true);
    setError('');
    try {
      const updated = await upsertSeriesProposalManuscript(seriesId, file, proposalChapter?.id);
      setChapters(prev => {
        const others = prev.filter(c => c.id !== updated.id && c.number !== 0);
        return [...others, updated].sort((a, b) => a.number - b.number);
      });
      toast.success(`Đã cập nhật bản thảo: ${updated.manuscriptFileName || file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể thay bản thảo.';
      setError(message);
      toast.error(message);
    } finally {
      setReplacingManuscript(false);
    }
  };

  const handleMarkReadyForPublish = async () => {
    if (!series) return;
    const confirmed = await confirm({
      title: 'Báo sẵn sàng xuất bản',
      variant: 'success',
      message: (
        <>
          Báo Board Lead rằng{' '}
          <span className="font-semibold text-foreground">{series.title}</span>{' '}
          đã sẵn sàng để lên lịch xuất bản?
          <br />
          <span className="text-xs mt-1 inline-block">
            Chỉ báo <strong className="font-medium text-foreground">một lần</strong>. Sau đó vẫn làm thêm chương;
            Board vẫn xem và dời lịch XB được. Không cần bấm lại khi có chương mới.
          </span>
        </>
      ),
      confirmText: 'Báo sẵn sàng XB',
    });
    if (!confirmed) return;

    setCompleting(true);
    setError('');
    try {
      const updated = await markSeriesCompleted(series.id);
      setSeries(prev => prev ? { ...prev, status: updated.status } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể báo sẵn sàng xuất bản.');
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!series) return;
    const confirmed = await confirm({
      title: 'Gửi xét duyệt',
      variant: 'submit',
      message: (
        <>
          Bạn sắp gửi series{' '}
          <span className="font-semibold text-foreground">{series.title}</span>{' '}
          đến hội đồng xét duyệt.
          <br />
          <span className="text-xs mt-1 inline-block">
            Ba board cố định sẽ nhận thông báo và có <strong className="text-foreground font-medium">48 giờ</strong> để bỏ phiếu.
            Series chuyển sang <strong className="text-foreground font-medium">Chờ xét duyệt</strong> và tạm khóa chỉnh sửa hồ sơ cho đến khi có kết quả.
          </span>
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
    return <div className="p-6 text-sm text-muted-foreground">Đang tải series...</div>;
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

      {isMangakaView && productionLockHint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {productionLockHint}
        </div>
      )}

      {series.status === 'Submitted' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Series đang chờ 3 board cố định xét duyệt (hạn 48 giờ) — mọi thao tác sản xuất tạm khóa.
        </div>
      )}

      {series.status === 'Cancelled' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Series đã bị hội đồng từ chối.
        </div>
      )}

      {isEditorView && series && !series.editorId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bạn chưa được hội đồng phân công phụ trách series này. Series được gán sẽ xuất hiện ở{' '}
          <button type="button" className="font-semibold underline" onClick={() => navigate('/editor/series')}>
            Series phụ trách
          </button>
          .
        </div>
      )}

      {waitingForBoardEditor && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Series đã được duyệt — hội đồng sẽ phân công biên tập viên theo dõi tiến độ sản xuất.
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
              {canEditProfile && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/edit`)}>
                  <Pencil size={14} /> Chỉnh sửa hồ sơ
                </Button>
              )}
              {isMangakaView && series.status === 'Draft' && (
                <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmitForReview}>
                  <Send size={14} /> Gửi xét duyệt
                </Button>
              )}
              {canMarkReadyForPublish && (
                <Button variant="primary" size="sm" loading={completing} onClick={handleMarkReadyForPublish}>
                  <CheckCircle2 size={14} /> Báo sẵn sàng XB
                </Button>
              )}
              {alreadyReportedReady && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Đã báo Board Lead — không cần bấm lại khi có chương mới"
                >
                  <CheckCircle2 size={14} /> Đã báo sẵn sàng XB
                </Button>
              )}
              {isMangakaView && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/chapters`)}>
                    <FileText size={14} /> Chương
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/read`)}>
                    <BookOpen size={14} /> Đọc toàn bộ
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!canProduce}
                    onClick={() => navigate(`/mangaka/series/${series.id}/chapters/create`)}
                  >
                    <Plus size={14} /> Chương mới
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <Tab value="overview"><BookOpen size={14} className="inline mr-1.5" />Tổng quan</Tab>
          <Tab value="chapters"><FileText size={14} className="inline mr-1.5" />Chương ({productionChapters.length})</Tab>
          <Tab value="pricing"><Tags size={14} className="inline mr-1.5" />Giá thù lao</Tab>
          {showRankingTab && <Tab value="ranking"><BarChart2 size={14} className="inline mr-1.5" />Xếp hạng</Tab>}
          <Tab value="submissions"><Send size={14} className="inline mr-1.5" />Nộp series</Tab>
        </TabsList>

        <TabPanel value="overview" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Cột trái: tóm tắt + chi tiết + bản thảo */}
            <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
              <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-foreground/[0.03] to-transparent">
                <CardTitle className="mb-0">Nội dung series</CardTitle>
              </div>

              <div className="px-5 py-4 space-y-5">
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="h-3.5 w-1 rounded-full bg-primary shrink-0" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tóm tắt
                    </h4>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line rounded-xl bg-muted/30 px-3.5 py-3 min-h-[4.5rem]">
                    {series.synopsis?.trim() || 'Chưa có tóm tắt.'}
                  </p>
                </section>

                <section className="pt-1">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="h-3.5 w-1 rounded-full bg-foreground/35 shrink-0" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Chi tiết series
                    </h4>
                  </div>
                  <dl className="rounded-xl border border-border/70 divide-y divide-border/60 overflow-hidden">
                    {[
                      { label: 'Trạng thái', value: <Badge status={series.status} /> },
                      { label: 'Thể loại', value: series.genre },
                      { label: 'Đối tượng độc giả', value: series.targetAudience },
                      { label: 'Lịch xuất bản', value: series.publishingType },
                      { label: 'Tổng số chương', value: series.chaptersCount },
                      { label: 'Ngày tạo', value: series.createdAt },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center gap-3 text-sm px-3.5 py-2.5 bg-card">
                        <dt className="text-muted-foreground font-medium">{label}</dt>
                        <dd className="font-semibold text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="h-3.5 w-1 rounded-full bg-amber-500 shrink-0" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bản thảo
                    </h4>
                  </div>
                  <input
                    ref={manuscriptInputRef}
                    type="file"
                    accept=".pdf,.zip,.cbz,application/pdf,application/zip"
                    className="hidden"
                    onChange={handleReplaceManuscript}
                  />
                  {manuscriptUrl ? (
                    <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{manuscriptName || 'File bản thảo'}</p>
                          <p className="text-xs text-muted-foreground">Đính kèm khi mangaka gửi duyệt</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={manuscriptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={manuscriptName || undefined}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
                        >
                          <FileDown size={14} />
                          Tải bản thảo
                        </a>
                        {canReplaceManuscript && (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={replacingManuscript}
                            onClick={() => manuscriptInputRef.current?.click()}
                          >
                            <Upload size={14} />
                            Thay file
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/25 px-3.5 py-3.5 text-sm text-muted-foreground">
                      {canReplaceManuscript ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>Chưa có file — tải lên bản thảo đề xuất (PDF/ZIP).</span>
                          <Button
                            variant="outline"
                            size="sm"
                            loading={replacingManuscript}
                            onClick={() => manuscriptInputRef.current?.click()}
                          >
                            <Upload size={14} />
                            Tải bản thảo
                          </Button>
                        </div>
                      ) : (
                        'Không có file đính kèm'
                      )}
                    </div>
                  )}
                </section>
              </div>
            </Card>

            {/* Cột phải: đội ngũ */}
            <Card padding="none" className="overflow-hidden border-border/80 shadow-sm">
              <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-foreground/[0.03] to-transparent">
                <CardTitle className="mb-0">Đội ngũ series</CardTitle>
              </div>
              <div className="px-5 py-4">
                <SeriesTeamCard team={team} loading={teamLoading} embedded />
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="pricing" className="mt-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bảng giá task theo series</CardTitle>
              {isMangakaView && (
                <Button variant="primary" size="sm" onClick={() => setProposalOpen(true)}>
                  Đề xuất chỉnh giá
                </Button>
              )}
            </CardHeader>
            <div className="px-6 pb-6">
              {priceLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải bảng giá…</p>
              ) : priceTable.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu bảng giá cho series này.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {priceTable.map(item => (
                    <div key={item.taskType} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{item.displayName ?? getTaskTypeLabel(item.taskType)}</p>
                      <p className="font-semibold mt-1">{formatVnd(item.price)}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Trợ lý trao đổi trực tiếp với bạn. Khi bạn đề xuất chỉnh giá, Admin sẽ duyệt hoặc từ chối kèm lý do.
              </p>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="chapters" className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{productionChapters.length} chương</p>
            {isMangakaView && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canProduce}
                onClick={() => navigate(`/mangaka/series/${series.id}/chapters/create`)}
              >
                <Plus size={14} /> Thêm chương
              </Button>
            )}
          </div>
          {productionChapters.length === 0 ? (
            <EmptyState
              title="Chưa có chương nào"
              description={canProduce ? 'Tạo chương đầu tiên để bắt đầu.' : (productionLockHint ?? 'Chưa thể tạo chương.')}
            />
          ) : (
            <div className="space-y-2">
              {productionChapters.sort((a, b) => a.number - b.number).map(ch => (
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  seriesId={series.id}
                  chapterDetailPath={
                    isAssignedEditor
                      ? chapterId => `/editor/chapters/${chapterId}/review`
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="ranking" className="mt-5">
          {rankingLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải xếp hạng...</p>
          ) : ranking ? (
            <div className="space-y-4">
              {ranking.isAtRisk && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Series đang ở vùng nguy hiểm (hạng #{ranking.currentRank}). Hãy theo dõi thông báo từ hội đồng.
                </div>
              )}
              <RankingTrend ranking={ranking} />
              <Button variant="outline" size="sm" onClick={() => navigate(`/mangaka/series/${series.id}/ranking`)}>
                Xem chi tiết xếp hạng
              </Button>
            </div>
          ) : (
            <EmptyState
              title="Chưa có dữ liệu xếp hạng"
              description="Hội đồng cần nhập dữ liệu bình chọn độc giả sau khi series xuất bản."
            />
          )}
        </TabPanel>

        <TabPanel value="submissions" className="mt-5">
          {!isSeriesSubmitted(series.status) ? (
            <EmptyState
              title="Series chưa được nộp"
              description="Gửi series cho 3 board cố định xét duyệt (hạn 48 giờ)."
              action={
                <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmitForReview}>
                  <Send size={14} /> Gửi xét duyệt
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Trạng thái nộp series</CardTitle></CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge status={series.status} size="md" />
                    <p className="text-sm text-foreground/80">{SERIES_SUBMISSION_STATUS_HINT[series.status]}</p>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground font-medium">Ngày tạo</dt>
                      <dd className="font-semibold mt-1">{series.createdAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Cập nhật gần nhất</dt>
                      <dd className="font-semibold mt-1">{series.updatedAt}</dd>
                    </div>
                  </dl>
                </div>
              </Card>

              {submissionStatsLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải thống kê duyệt...</p>
              ) : submissionStats ? (
                <Card>
                  <CardHeader><CardTitle>Thống kê hội đồng</CardTitle></CardHeader>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground font-medium">Tổng vote</dt>
                      <dd className="font-bold text-lg mt-1">{submissionStats.boardVoteCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Đồng ý</dt>
                      <dd className="font-bold text-lg mt-1 text-green-700">{submissionStats.approveVotes}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Từ chối</dt>
                      <dd className="font-bold text-lg mt-1 text-red-700">{submissionStats.rejectVotes}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Lịch xuất bản</dt>
                      <dd className="font-bold text-lg mt-1">{submissionStats.scheduleCount}</dd>
                    </div>
                  </dl>
                </Card>
              ) : null}
            </div>
          )}
        </TabPanel>
      </Tabs>

      <Modal open={proposalOpen} onClose={() => setProposalOpen(false)} size="lg" title="Đề xuất chỉnh giá task">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nhập mức giá đề xuất cho từng loại task. Admin sẽ duyệt trước khi trở thành bảng giá chính thức.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {priceTable.map(item => (
              <label key={item.taskType} className="text-sm">
                <p className="mb-1 text-muted-foreground">{item.displayName ?? getTaskTypeLabel(item.taskType)}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-border px-3 py-2"
                  value={proposalDraft[item.taskType] ?? ''}
                  onChange={e =>
                    setProposalDraft(prev => ({
                      ...prev,
                      [item.taskType]: formatVndInput(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div>
            <p className="text-sm mb-1 text-muted-foreground">Ghi chú cho Admin (tuỳ chọn)</p>
            <textarea
              rows={3}
              value={proposalNote}
              onChange={e => setProposalNote(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Lý do chỉnh giá, phạm vi áp dụng..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProposalOpen(false)}>Hủy</Button>
            <Button variant="primary" loading={submittingProposal} onClick={() => void handleSubmitPriceProposal()}>
              Gửi đề xuất
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

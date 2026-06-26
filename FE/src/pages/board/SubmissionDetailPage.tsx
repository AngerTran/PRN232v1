import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, CheckCircle, XCircle, Download, FileText, User } from 'lucide-react';
import { clsx } from 'clsx';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { SubmissionStatusBadge } from '../../app/components/ui/board';
import type { BoardSubmissionStatus, Series } from '../../types/domain';
import { getSeries, getSeriesChapters } from '../../services/seriesApi';
import {
  listBoardVotes,
  castBoardVote,
  claimSeriesReview,
  getBoardVoteProgress,
  BOARD_VOTES_REQUIRED,
  BOARD_CLAIMS_REQUIRED,
  type BoardDecision,
  type BoardVote,
  type BoardVoteProgress,
} from '../../services/boardApi';
import { getStoredUser } from '../../services/authApi';

function mapStatus(status: string): BoardSubmissionStatus {
  switch (status) {
    case 'Approved':
    case 'In Progress':
    case 'Published':
    case 'Completed':
      return 'Approved';
    case 'Cancelled':
      return 'Rejected';
    case 'Submitted':
      return 'Pending Review';
    default:
      return 'Pending Review';
  }
}

function manuscriptFileName(url: string): string {
  try {
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    return name || 'ban-thao';
  } catch {
    return 'ban-thao';
  }
}

const inputClass =
  'w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-xl text-foreground cursor-default';

export default function SubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [series, setSeries] = useState<Series | null>(null);
  const [votes, setVotes] = useState<BoardVote[]>([]);
  const [voteProgress, setVoteProgress] = useState<BoardVoteProgress | null>(null);
  const [manuscriptUrl, setManuscriptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<BoardDecision | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [wantLead, setWantLead] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const seriesId = submissionId ?? '';

  useEffect(() => {
    if (!seriesId) return;
    let isActive = true;
    setLoading(true);
    Promise.all([
      getSeries(seriesId),
      listBoardVotes(seriesId).catch(() => []),
      getBoardVoteProgress(seriesId).catch(() => null),
      getSeriesChapters(seriesId).catch(() => []),
    ])
      .then(([s, v, progress, chapters]) => {
        if (!isActive) return;
        setSeries(s);
        setVotes(v);
        setVoteProgress(progress);
        const proposal = chapters.find(c => c.number === 0) ?? chapters.find(c => c.description);
        setManuscriptUrl(proposal?.description?.trim() || null);

        const currentUserId = getStoredUser()?.id;
        const myVote = currentUserId ? v.find(vote => vote.boardMemberId === currentUserId) : undefined;
        if (myVote) {
          setSubmitted(true);
          setDecision(myVote.decision === 'reject' ? 'reject' : 'approve');
          setReason(myVote.comment ?? '');
        } else {
          setSubmitted(false);
          setDecision(null);
          setReason('');
        }
      })
      .catch(err => {
        if (isActive) setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ series.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [seriesId]);

  useEffect(() => {
    if (series) {
      setPageMeta({
        title: series.title,
        breadcrumb: [
          { label: 'Duyệt Series', href: '/board/submissions' },
          { label: series.title },
        ],
      });
    }
  }, [series, setPageMeta]);

  const approveVotes = voteProgress?.approveVotes ?? votes.filter(v => v.decision === 'approve').length;
  const rejectVotes = voteProgress?.rejectVotes ?? votes.filter(v => v.decision === 'reject').length;
  const votedBoardMembers = voteProgress?.votedBoardMembers ?? votes.length;
  const requiredVotes = voteProgress?.requiredVotes ?? BOARD_VOTES_REQUIRED;
  const quorumMet = voteProgress?.quorumMet ?? false;
  const isPendingReview = series?.status === 'Submitted';
  const claimedBoardMembers = voteProgress?.claimedBoardMembers ?? 0;
  const requiredClaims = voteProgress?.requiredClaims ?? BOARD_CLAIMS_REQUIRED;
  const currentUserHasClaimed = voteProgress?.currentUserHasClaimed ?? false;
  const canClaim = voteProgress?.canClaim ?? false;
  const canClaimAsLead = voteProgress?.canClaimAsLead ?? false;
  const claimsFull = voteProgress?.claimsFull ?? false;
  const hasLead = voteProgress?.hasLead ?? false;
  const leadBoardMemberName = voteProgress?.leadBoardMemberName;
  const currentUserIsLead = voteProgress?.currentUserIsLead ?? false;
  const myDecision = submitted ? decision : null;

  const handleClaimReview = async () => {
    if (!seriesId) return;
    setClaiming(true);
    setError('');
    try {
      await claimSeriesReview(seriesId, wantLead);
      const progress = await getBoardVoteProgress(seriesId).catch(() => null);
      if (progress) setVoteProgress(progress);
      setWantLead(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận xét duyệt series.');
    } finally {
      setClaiming(false);
    }
  };
  const genres = series?.genres?.length ? series.genres : (series?.genre ? series.genre.split(',').map(g => g.trim()) : []);

  const handleSubmitVote = async () => {
    if (!decision || !seriesId) return;
    setSubmitting(true);
    setError('');
    try {
      await castBoardVote(seriesId, decision, reason.trim() || undefined);
      const [refreshedVotes, refreshedSeries, refreshedProgress] = await Promise.all([
        listBoardVotes(seriesId).catch(() => votes),
        getSeries(seriesId).catch(() => series),
        getBoardVoteProgress(seriesId).catch(() => voteProgress),
      ]);
      setVotes(refreshedVotes);
      if (refreshedSeries) setSeries(refreshedSeries);
      if (refreshedProgress) setVoteProgress(refreshedProgress);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận phiếu bầu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải hồ sơ series...</div>;
  }

  if (!series) {
    return (
      <div className="p-6">
        <Card>
          <p className="py-12 text-center text-muted-foreground">{error || 'Không tìm thấy series này.'}</p>
        </Card>
      </div>
    );
  }

  const votePanel = (
    <Card>
      <CardHeader>
        <CardTitle>Xét duyệt series</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reviewer đã nhận</span>
            <span className="font-semibold">{claimedBoardMembers}/{requiredClaims}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tiến độ hội đồng</span>
            <span className="font-semibold">{votedBoardMembers}/{requiredVotes}</span>
          </div>
          <div className="flex gap-4 font-semibold">
            <span className="text-green-700">✓ {approveVotes}</span>
            <span className="text-red-600">✗ {rejectVotes}</span>
          </div>
          {isPendingReview && (
            <p className="text-muted-foreground pt-1">
              {hasLead && (
                <span className="block mb-1">
                  Phụ trách chính: <span className="font-semibold text-foreground">{leadBoardMemberName}</span>
                  {currentUserIsLead && <span className="text-primary"> (bạn)</span>}
                </span>
              )}
              {quorumMet
                ? `Đủ ${requiredVotes} phiếu — hệ thống đã quyết định theo đa số.`
                : currentUserHasClaimed
                  ? `Cần ${requiredVotes} phiếu board để quyết định.`
                  : `Đọc hồ sơ và bản thảo, sau đó nhận xét duyệt để được bỏ phiếu.`}
            </p>
          )}
        </div>

        {!isPendingReview ? (
          <div className="text-center py-4">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-sm">Series đã có quyết định</p>
            <p className="text-xs text-muted-foreground mt-1">
              {series.status === 'Cancelled' ? 'Từ chối' : 'Đã duyệt'}
            </p>
          </div>
        ) : !currentUserHasClaimed ? (
          <div className="space-y-3">
            {claimsFull ? (
              <p className="text-sm text-center text-muted-foreground py-2">
                Đã đủ {requiredClaims} reviewer. Series không còn trên tab chung — xem tại Series Đã Nhận.
              </p>
            ) : canClaim ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Bạn có thể xem thông tin và tải bản thảo trước. Khi sẵn sàng, nhận series để giữ chỗ reviewer ({claimedBoardMembers}/{requiredClaims}).
                </p>
                {hasLead ? (
                  <p className="text-xs text-muted-foreground">
                    Phụ trách chính: <span className="font-semibold">{leadBoardMemberName}</span>
                  </p>
                ) : (
                  <label className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={wantLead}
                      onChange={e => setWantLead(e.target.checked)}
                      disabled={!canClaimAsLead}
                    />
                    <span className="text-sm">
                      <span className="font-semibold block">Nhận làm phụ trách chính</span>
                      <span className="text-muted-foreground text-xs">
                        Chịu trách nhiệm lên lịch xuất bản sau khi series được duyệt (mỗi series chỉ 1 người).
                      </span>
                    </span>
                  </label>
                )}
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  loading={claiming}
                  disabled={claiming}
                  onClick={handleClaimReview}
                >
                  Nhận xét duyệt series
                </Button>
              </>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-2">
                Bạn có lời mời đang chờ — hãy xử lý trong mục Lời mời xét duyệt.
              </p>
            )}
          </div>
        ) : submitted ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
            <p className="font-medium text-sm">Đã ghi nhận phiếu bầu</p>
            <p className="text-xs text-muted-foreground">
              Quyết định: <span className="font-semibold">{myDecision === 'approve' ? 'Phê duyệt' : 'Từ chối'}</span>
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
              Thay đổi phiếu
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(
                [
                  { val: 'approve' as const, label: 'Phê duyệt', icon: <CheckCircle size={16} />, active: 'border-green-500 bg-green-50 text-green-700' },
                  { val: 'reject' as const, label: 'Từ chối', icon: <XCircle size={16} />, active: 'border-red-500 bg-red-50 text-red-700' },
                ]
              ).map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setDecision(opt.val)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    decision === opt.val ? opt.active : 'border-border hover:border-gray-300'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Lý do / nhận xét (khuyến nghị nếu từ chối)..."
              rows={4}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className={`${inputClass} resize-none cursor-text bg-input-background`}
            />
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={!decision || submitting}
              loading={submitting}
              onClick={handleSubmitVote}
            >
              Xác nhận phiếu bầu
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  const resourcesSection = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tài nguyên series</CardTitle>
        </CardHeader>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Ảnh bìa
            </label>
            <div className="rounded-xl border border-border overflow-hidden bg-muted/30 aspect-[280/380] max-h-[380px]">
              {series.coverUrl ? (
                <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Chưa có ảnh bìa
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Bản thảo đề xuất
            </label>
            {manuscriptUrl ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{manuscriptFileName(manuscriptUrl)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tài liệu do mangaka tải lên khi gửi đề xuất</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={manuscriptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    Mở xem bản thảo
                  </a>
                  <a
                    href={manuscriptUrl}
                    download={manuscriptFileName(manuscriptUrl)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Download size={16} />
                    Tải về máy
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Mangaka chưa đính kèm bản thảo
              </div>
            )}
          </div>
        </div>
      </Card>
      {votePanel}
    </>
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/board/submissions')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{series.title}</h1>
                <SubmissionStatusBadge status={mapStatus(series.status)} />
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User size={14} />
                {series.mangakaName ?? '—'}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Thông tin đề xuất</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Tiêu đề series
                </label>
                <div className={inputClass}>{series.title}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Thể loại
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.length > 0 ? (
                    genres.map(genre => (
                      <span
                        key={genre}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-secondary/10 text-secondary border-secondary/20"
                      >
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Tóm tắt
                </label>
                <div className={`${inputClass} min-h-[120px] whitespace-pre-wrap leading-relaxed`}>
                  {series.synopsis || 'Chưa có tóm tắt.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Đối tượng độc giả
                  </label>
                  <div className={inputClass}>{series.targetAudience || '—'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Lịch xuất bản
                  </label>
                  <div className={inputClass}>{series.publishingType || '—'}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhân vật chính</CardTitle>
            </CardHeader>
            <div className={`${inputClass} min-h-[100px] whitespace-pre-wrap leading-relaxed`}>
              {series.mainCharacters || 'Chưa có mô tả nhân vật.'}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ý kiến hội đồng</CardTitle>
            </CardHeader>
            {votes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có thành viên nào bỏ phiếu.</p>
            ) : (
              <div className="space-y-4">
                {votes.map(v => (
                  <div key={v.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {(v.boardMemberName ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{v.boardMemberName ?? 'Thành viên'}</span>
                        <span
                          className={clsx(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            v.decision === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}
                        >
                          {v.decision === 'approve' ? '✓ Phê duyệt' : '✗ Từ chối'}
                        </span>
                      </div>
                      {v.comment && <p className="text-xs text-muted-foreground">{v.comment}</p>}
                      {v.createdAt && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(v.createdAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <aside className="shrink-0 w-full lg:w-[min(380px,36vw)] lg:min-w-[280px] lg:max-w-[420px] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain border-t lg:border-t-0 lg:border-l border-border bg-background p-6 space-y-5">
        {resourcesSection}
      </aside>
    </div>
  );
}

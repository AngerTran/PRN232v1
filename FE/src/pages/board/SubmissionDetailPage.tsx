import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import { Textarea } from '../../app/components/ui/textarea';
import { SubmissionStatusBadge } from '../../app/components/ui/board';
import type { BoardSubmissionStatus, Series } from '../../data/mockData';
import { getSeries } from '../../services/seriesApi';
import { listBoardVotes, castBoardVote, type BoardDecision, type BoardVote } from '../../services/boardApi';
import {
  ArrowLeft, CheckCircle, XCircle, User, BookOpen, Target, FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

function mapStatus(status: string): BoardSubmissionStatus {
  switch (status) {
    case 'Approved':
    case 'In Progress':
    case 'Published':
      return 'Approved';
    case 'Cancelled':
      return 'Rejected';
    default:
      return 'Pending Review';
  }
}

export default function SubmissionDetailPage() {
  usePageMeta({ title: 'Chi Tiết Submission' });
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [series, setSeries] = useState<Series | null>(null);
  const [votes, setVotes] = useState<BoardVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<BoardDecision | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const seriesId = submissionId ?? '';

  useEffect(() => {
    if (!seriesId) return;
    let isActive = true;
    setLoading(true);
    Promise.all([getSeries(seriesId), listBoardVotes(seriesId).catch(() => [])])
      .then(([s, v]) => {
        if (!isActive) return;
        setSeries(s);
        setVotes(v);
      })
      .catch(err => {
        if (isActive) setError(err instanceof Error ? err.message : 'Không thể tải submission.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [seriesId]);

  const approveVotes = votes.filter(v => v.decision === 'approve').length;
  const rejectVotes = votes.filter(v => v.decision === 'reject').length;
  const totalVotes = approveVotes + rejectVotes;

  const handleSubmitVote = async () => {
    if (!decision || !seriesId) return;
    setSubmitting(true);
    setError('');
    try {
      await castBoardVote(seriesId, decision, reason.trim() || undefined);
      const refreshed = await listBoardVotes(seriesId).catch(() => votes);
      setVotes(refreshed);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận phiếu bầu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải submission...</div>;
  }

  if (!series) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {error || 'Không tìm thấy submission này.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/board/submissions')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
      </Button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Header */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-0">
            <img src={series.coverUrl} alt={series.title} className="w-full md:w-48 h-64 md:h-auto object-cover" />
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{series.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <User className="h-4 w-4" />
                    <span>{series.mangakaName ?? '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{series.genre}</Badge>
                    <SubmissionStatusBadge status={mapStatus(series.status)} />
                  </div>
                </div>
              </div>

              {/* Vote summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{approveVotes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Phê Duyệt</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: totalVotes ? `${(approveVotes / totalVotes) * 100}%` : '0%' }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{rejectVotes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Từ Chối</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: totalVotes ? `${(rejectVotes / totalVotes) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Synopsis */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Tóm Tắt Nội Dung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{series.synopsis || 'Chưa có tóm tắt.'}</p>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Đối Tượng Mục Tiêu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-sm">
                {series.targetAudience || '—'}
              </Badge>
            </CardContent>
          </Card>

          {/* Board Votes */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Ý Kiến Hội Đồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {votes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có thành viên nào bỏ phiếu.</p>
              ) : (
                votes.map(v => (
                  <div key={v.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {(v.boardMemberName ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{v.boardMemberName ?? 'Thành viên'}</span>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                          v.decision === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {v.decision === 'approve' ? '✓ Phê Duyệt' : '✗ Từ Chối'}
                        </span>
                      </div>
                      {v.comment && <p className="text-xs text-muted-foreground">{v.comment}</p>}
                      {v.createdAt && (
                        <p className="text-xs text-muted-foreground/60 mt-1">{new Date(v.createdAt).toLocaleString('vi-VN')}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Voting Panel */}
        <div className="space-y-4">
          <Card className="shadow-sm sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bỏ Phiếu Của Bạn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">Đã ghi nhận phiếu bầu!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quyết định: <span className="font-semibold">{decision === 'approve' ? 'Phê Duyệt' : 'Từ Chối'}</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {(
                      [
                        { val: 'approve' as const, label: 'Phê Duyệt', icon: <CheckCircle className="h-4 w-4" />, color: 'border-green-500 bg-green-50 text-green-700' },
                        { val: 'reject' as const, label: 'Từ Chối', icon: <XCircle className="h-4 w-4" />, color: 'border-red-500 bg-red-50 text-red-700' },
                      ]
                    ).map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setDecision(opt.val)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                          decision === opt.val ? opt.color : 'border-border hover:border-gray-300 text-foreground'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    placeholder="Lý do / nhận xét (khuyến nghị nếu từ chối)..."
                    rows={4}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="text-sm resize-none"
                  />

                  <Button
                    className="w-full"
                    disabled={!decision || submitting}
                    onClick={handleSubmitVote}
                  >
                    {submitting ? 'Đang gửi…' : 'Xác Nhận Phiếu Bầu'}
                  </Button>

                  {!decision && (
                    <p className="text-xs text-muted-foreground text-center">Chọn quyết định để bỏ phiếu</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

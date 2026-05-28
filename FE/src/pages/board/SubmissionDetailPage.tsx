import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Badge } from '../../app/components/ui/badge';
import { Textarea } from '../../app/components/ui/textarea';
import { getBoardSubmissionById, getBoardVotesBySubmissionId } from '../../data/mockData';
import { SubmissionStatusBadge } from '../../app/components/ui/board';
import {
  ArrowLeft, CheckCircle, XCircle, HelpCircle, User,
  BookOpen, Target, FileText, Star, Users,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SubmissionDetailPage() {
  usePageMeta({ title: 'Chi Tiết Submission' });
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<'Approve' | 'Reject' | 'More Info' | null>(null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const sub = getBoardSubmissionById(submissionId ?? '');
  const votes = getBoardVotesBySubmissionId(submissionId ?? '');

  if (!sub) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Không tìm thấy submission này.
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalVotes = sub.voteResult.approve + sub.voteResult.reject + sub.voteResult.moreInfo;

  const handleSubmitVote = () => {
    if (!decision) return;
    setSubmitted(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/board/submissions')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
      </Button>

      {/* Header */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-0">
            <img src={sub.coverUrl} alt={sub.seriesTitle} className="w-full md:w-48 h-64 md:h-auto object-cover" />
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{sub.seriesTitle}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <User className="h-4 w-4" />
                    <span>{sub.mangakaName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{sub.genre}</Badge>
                    <SubmissionStatusBadge status={sub.status} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Nộp: {sub.submittedDate}
                </p>
              </div>

              {/* Vote summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{sub.voteResult.approve}</p>
                  <p className="text-xs text-muted-foreground mt-1">Phê Duyệt</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: totalVotes ? `${(sub.voteResult.approve / totalVotes) * 100}%` : '0%' }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{sub.voteResult.reject}</p>
                  <p className="text-xs text-muted-foreground mt-1">Từ Chối</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: totalVotes ? `${(sub.voteResult.reject / totalVotes) * 100}%` : '0%' }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{sub.voteResult.moreInfo}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cần Thêm TT</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: totalVotes ? `${(sub.voteResult.moreInfo / totalVotes) * 100}%` : '0%' }} />
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
              <p className="text-sm leading-relaxed text-muted-foreground">{sub.synopsis}</p>
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
              <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-sm">{sub.targetAudience}</Badge>
            </CardContent>
          </Card>

          {/* Characters */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Nhân Vật Chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sub.characters.map((char, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {char.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{char.name}</p>
                    <p className="text-xs text-primary mb-1">{char.role}</p>
                    <p className="text-xs text-muted-foreground">{char.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Editor Recommendation */}
          <Card className="shadow-sm border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-blue-600" /> Đề Xuất Của Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{sub.editorRecommendation}</p>
              <p className="text-xs text-blue-600 font-medium">— {sub.editorName}</p>
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
                votes.map((v) => (
                  <div key={v.id} className="flex gap-3">
                    <img src={v.memberAvatar} alt={v.memberName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{v.memberName}</span>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                          v.decision === 'Approve' ? 'bg-green-100 text-green-700' :
                          v.decision === 'Reject' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        )}>
                          {v.decision === 'Approve' ? '✓ Phê Duyệt' : v.decision === 'Reject' ? '✗ Từ Chối' : '? Cần Thêm TT'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{v.reason}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{new Date(v.votedAt).toLocaleString('vi-VN')}</p>
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
                    Quyết định: <span className="font-semibold">{decision}</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {(
                      [
                        { val: 'Approve' as const, label: 'Phê Duyệt', icon: <CheckCircle className="h-4 w-4" />, color: 'border-green-500 bg-green-50 text-green-700' },
                        { val: 'Reject' as const, label: 'Từ Chối', icon: <XCircle className="h-4 w-4" />, color: 'border-red-500 bg-red-50 text-red-700' },
                        { val: 'More Info' as const, label: 'Yêu Cầu Thêm Thông Tin', icon: <HelpCircle className="h-4 w-4" />, color: 'border-amber-500 bg-amber-50 text-amber-700' },
                      ]
                    ).map((opt) => (
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
                    placeholder="Lý do / nhận xét (bắt buộc nếu từ chối hoặc yêu cầu thêm TT)..."
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-sm resize-none"
                  />

                  <Button
                    className="w-full"
                    disabled={!decision || !reason.trim()}
                    onClick={handleSubmitVote}
                  >
                    Xác Nhận Phiếu Bầu
                  </Button>

                  {!decision && (
                    <p className="text-xs text-muted-foreground text-center">Chọn quyết định và nhập lý do để bỏ phiếu</p>
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

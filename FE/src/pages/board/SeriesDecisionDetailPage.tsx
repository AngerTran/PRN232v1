import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import { Input } from '../../app/components/ui/input';
import { getSeriesDecisionById, type BoardDecisionType } from '../../data/mockData';
import {
  ArrowLeft, TrendingDown, TrendingUp, Minus, BarChart2,
  MessageSquare, Shield, CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SeriesDecisionDetailPage() {
  usePageMeta({ title: 'Chi Tiết Quyết Định' });
  const { decisionId } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<BoardDecisionType | ''>('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const d = getSeriesDecisionById(decisionId ?? '');

  if (!d) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Không tìm thấy quyết định này.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision || !reason || !effectiveDate) return;
    setSubmitted(true);
  };

  const decisionOptions: { value: BoardDecisionType; label: string; color: string }[] = [
    { value: 'Continue', label: 'Tiếp Tục', color: 'text-green-700' },
    { value: 'Change to Monthly', label: 'Chuyển Sang Monthly', color: 'text-violet-700' },
    { value: 'Hiatus', label: 'Tạm Dừng (Hiatus)', color: 'text-amber-700' },
    { value: 'Cancel', label: 'Hủy Series', color: 'text-red-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/board/series-decisions')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
      </Button>

      {/* Header */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <img src={d.coverUrl} alt={d.seriesTitle} className="w-20 h-28 object-cover rounded-lg shrink-0" />
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1">{d.seriesTitle}</h1>
              <p className="text-sm text-muted-foreground mb-3">{d.mangakaName}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-xs text-red-600/70 font-medium mb-1">Hạng Hiện Tại</p>
                  <p className="text-xl font-bold text-red-700">#{d.currentRank}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <p className="text-xs text-orange-600/70 font-medium mb-1">Tuần Bottom</p>
                  <p className="text-xl font-bold text-orange-700">{d.bottomRankingCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <p className="text-xs text-blue-600/70 font-medium mb-1">Vote Mới Nhất</p>
                  <p className="text-xl font-bold text-blue-700">{(d.latestVoteScore / 1000).toFixed(1)}K</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Ranking History */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Lịch Sử Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-32">
                {d.rankingHistory.map((h, i) => {
                  const maxRank = Math.max(...d.rankingHistory.map(x => x.rank));
                  const heightPct = (h.rank / maxRank) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">#{h.rank}</span>
                      <div
                        className={clsx('w-full rounded-t-sm', i === d.rankingHistory.length - 1 ? 'bg-red-400' : 'bg-gray-200')}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{h.week.replace('Tuần ', 'T')}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Cột thấp hơn = hạng tốt hơn (đảo ngược)</p>
            </CardContent>
          </Card>

          {/* Vote History */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" /> Lịch Sử Vote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {d.voteHistory.map((v, i) => {
                  const maxScore = Math.max(...d.voteHistory.map(x => x.score));
                  const pct = (v.score / maxScore) * 100;
                  const isLast = i === d.voteHistory.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">Issue #{v.issue}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full flex items-center px-2', isLast ? 'bg-red-400' : 'bg-blue-300')}
                          style={{ width: `${pct}%` }}
                        >
                          <span className="text-[10px] text-white font-medium ml-auto">{v.score.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{v.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Editor Defense */}
          <Card className="shadow-sm border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" /> Bào Chữa Của Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{d.editorDefenseNote}</p>
            </CardContent>
          </Card>

          {/* Board Discussion */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Thảo Luận Hội Đồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.boardDiscussion.map((comment, i) => (
                <div key={i} className="flex gap-3">
                  <img src={comment.memberAvatar} alt={comment.memberName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.memberName}</span>
                      <span className="text-xs text-muted-foreground">{new Date(comment.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">{comment.comment}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Decision Form */}
        <div>
          <Card className="shadow-sm sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ra Quyết Định</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">Quyết định đã được ghi nhận!</p>
                  <p className="text-xs text-muted-foreground mt-1">{decision}</p>
                  <p className="text-xs text-muted-foreground">Hiệu lực: {effectiveDate}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Loại Quyết Định</label>
                    <Select value={decision} onValueChange={(v) => setDecision(v as BoardDecisionType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quyết định..." />
                      </SelectTrigger>
                      <SelectContent>
                        {decisionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={opt.color}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Lý Do</label>
                    <Textarea
                      placeholder="Nêu lý do quyết định của hội đồng..."
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Ngày Hiệu Lực</label>
                    <Input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!decision || !reason.trim() || !effectiveDate}
                    variant={decision === 'Cancel' ? 'destructive' : 'default'}
                  >
                    Xác Nhận Quyết Định
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

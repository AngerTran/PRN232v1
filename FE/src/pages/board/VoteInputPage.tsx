import { useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Textarea } from '../../app/components/ui/textarea';
import { getReaderVoteInputs } from '../../data/mockData';
import { Vote, CheckCircle } from 'lucide-react';

const SERIES_OPTIONS = [
  'Voidwalker Chronicles',
  'Scarlet Ronin',
  'Neon Requiem',
  'Clockwork Shrine',
  'Last Protocol',
  'Mirror Blade',
];

export default function VoteInputPage() {
  usePageMeta({ title: 'Nhập Vote Độc Giả' });
  const [recentVotes] = useState(getReaderVoteInputs());
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    issueNumber: '',
    series: '',
    releaseDate: '',
    voteCount: '',
    readerScore: '',
    comment: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ issueNumber: '', series: '', releaseDate: '', voteCount: '', readerScore: '', comment: '' });
    }, 2500);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nhập Dữ Liệu Vote Độc Giả</h1>
        <p className="text-muted-foreground mt-1">Cập nhật kết quả bình chọn sau mỗi kỳ phát hành</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Vote className="h-4 w-4 text-primary" />
                Nhập Vote Mới
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">Đã lưu dữ liệu vote!</p>
                  <p className="text-xs text-muted-foreground mt-1">Form sẽ reset sau giây lát...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Số Kỳ (Issue)</label>
                    <Input
                      type="number"
                      placeholder="VD: 22"
                      value={form.issueNumber}
                      onChange={(e) => setForm({ ...form, issueNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Series</label>
                    <Select value={form.series} onValueChange={(v) => setForm({ ...form, series: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn series..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SERIES_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Ngày Phát Hành</label>
                    <Input
                      type="date"
                      value={form.releaseDate}
                      onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Số Vote</label>
                      <Input
                        type="number"
                        placeholder="VD: 48720"
                        value={form.voteCount}
                        onChange={(e) => setForm({ ...form, voteCount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Điểm (0–10)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="VD: 9.4"
                        value={form.readerScore}
                        onChange={(e) => setForm({ ...form, readerScore: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nhận Xét (tùy chọn)</label>
                    <Textarea
                      placeholder="Ghi chú về kỳ này..."
                      rows={3}
                      value={form.comment}
                      onChange={(e) => setForm({ ...form, comment: e.target.value })}
                      className="resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!form.issueNumber || !form.series || !form.releaseDate || !form.voteCount || !form.readerScore}
                  >
                    Lưu Dữ Liệu Vote
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Vote Table */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vote Gần Đây</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kỳ</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Series</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Số Vote</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Điểm</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày Nhập</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentVotes.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-center">#{v.issueNumber}</td>
                      <td className="px-4 py-3 font-medium">{v.seriesTitle}</td>
                      <td className="px-4 py-3 text-right font-mono">{v.voteCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${v.readerScore >= 9 ? 'text-green-600' : v.readerScore >= 7 ? 'text-blue-600' : 'text-red-600'}`}>
                          {v.readerScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{v.inputDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentVotes.some(v => v.comment) && (
              <div className="border-t px-4 py-3 space-y-1.5">
                {recentVotes.filter(v => v.comment).map(v => (
                  <p key={v.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{v.seriesTitle} #{v.issueNumber}:</span> {v.comment}
                  </p>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

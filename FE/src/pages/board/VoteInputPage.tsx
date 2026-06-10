import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle, Vote } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { createRanking, getApprovedSeries, getSeriesRanking, type SeriesRankingItem } from '../../services/seriesApi';
import type { Series } from '../../types/domain';

export default function VoteInputPage() {
  usePageMeta({ title: 'Nhập Vote Độc Giả' });
  const [series, setSeries] = useState<Series[]>([]);
  const [rankings, setRankings] = useState<SeriesRankingItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ seriesId: '', issueNumber: '', rankPosition: '', voteCount: '', popularityScore: '' });

  const load = () => Promise.all([getApprovedSeries(), getSeriesRanking()])
    .then(([items, rankingItems]) => {
      setSeries(items);
      setRankings(rankingItems);
    })
    .catch(err => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ranking.'));

  useEffect(() => { load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createRanking({
        seriesId: form.seriesId,
        issueNumber: Number(form.issueNumber),
        rankPosition: Number(form.rankPosition),
        voteCount: Number(form.voteCount) || 0,
        popularityScore: Number(form.popularityScore) || 0,
      });
      setSubmitted(true);
      setForm({ seriesId: '', issueNumber: '', rankPosition: '', voteCount: '', popularityScore: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ranking.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nhập Dữ Liệu Vote Độc Giả</h1>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Vote className="h-4 w-4" /> Ranking mới</CardTitle></CardHeader>
          <CardContent>
            {submitted && <p className="mb-4 flex items-center gap-2 text-sm text-green-600"><CheckCircle size={16} /> Đã lưu dữ liệu thật.</p>}
            <form onSubmit={submit} className="space-y-4">
              <Select value={form.seriesId} onValueChange={seriesId => setForm(value => ({ ...value, seriesId }))}>
                <SelectTrigger><SelectValue placeholder="Chọn series" /></SelectTrigger>
                <SelectContent>{series.map(item => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input required type="number" min="1" placeholder="Số kỳ" value={form.issueNumber} onChange={e => setForm({ ...form, issueNumber: e.target.value })} />
                <Input required type="number" min="1" placeholder="Thứ hạng" value={form.rankPosition} onChange={e => setForm({ ...form, rankPosition: e.target.value })} />
                <Input type="number" min="0" placeholder="Số vote" value={form.voteCount} onChange={e => setForm({ ...form, voteCount: e.target.value })} />
                <Input type="number" min="0" step="0.1" placeholder="Điểm phổ biến" value={form.popularityScore} onChange={e => setForm({ ...form, popularityScore: e.target.value })} />
              </div>
              <Button type="submit" disabled={!form.seriesId || !form.issueNumber || !form.rankPosition}>Lưu ranking</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dữ liệu gần nhất</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rankings.slice(0, 10).map(item => (
              <div key={`${item.seriesId}-${item.issueNumber}`} className="flex justify-between border-b py-2 text-sm">
                <span>{item.title} · Kỳ {item.issueNumber}</span>
                <span className="font-semibold">#{item.rankPosition} · {item.voteCount} vote</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

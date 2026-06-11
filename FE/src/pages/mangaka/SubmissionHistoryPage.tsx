import { useEffect, useState } from 'react';
import { Clock, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getMySeries } from '../../services/seriesApi';
import type { Series } from '../../types/domain';

export default function SubmissionHistoryPage() {
  const { setPageMeta } = usePageMeta();
  const [series, setSeries] = useState<Series[]>([]);

  useEffect(() => {
    setPageMeta({ title: 'Lịch sử Nộp bài' });
    getMySeries().then(setSeries).catch(() => setSeries([]));
  }, []);

  const submitted = series
    .filter(item => item.status !== 'Draft')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Lịch sử Nộp bài</h1>
        <p className="text-sm text-muted-foreground">Trạng thái duyệt series trực tiếp từ backend</p>
      </div>
      {submitted.length === 0 ? (
        <EmptyState icon={<Send size={24} />} title="Chưa có series được gửi duyệt" />
      ) : (
        <div className="space-y-3">
          {submitted.map(item => (
            <Card key={item.id}>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Clock size={16} /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Cập nhật: {item.updatedAt}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

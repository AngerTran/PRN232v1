import { useState, useEffect, type ReactNode } from 'react';
import { Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import FilterDropdown from '../../components/ui/FilterDropdown';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import { submissions, type SubmissionStatus } from '../../data/mockData';

const STATUS_OPTIONS: SubmissionStatus[] = ['Pending', 'Approved', 'Revision Required', 'Rejected'];

const STATUS_ICON: Record<SubmissionStatus, ReactNode> = {
  'Approved': <CheckCircle size={16} className="text-green-500" />,
  'Rejected': <XCircle size={16} className="text-red-500" />,
  'Pending': <Clock size={16} className="text-blue-500" />,
  'Revision Required': <AlertCircle size={16} className="text-orange-500" />,
};

export default function SubmissionHistoryPage() {
  const { setPageMeta } = usePageMeta();
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { setPageMeta({ title: 'Lịch sử Nộp bài' }); }, []);

  const filtered = submissions.filter(s =>
    statusFilter === 'All' || s.status === statusFilter
  ).sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());

  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === 'Approved').length,
    pending: submissions.filter(s => s.status === 'Pending').length,
    revision: submissions.filter(s => s.status === 'Revision Required').length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Lịch sử Nộp bài</h1>
          <p className="text-sm text-muted-foreground">Bài nộp ban biên tập</p>
        </div>
        <FilterDropdown label="Trạng thái" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tổng cộng', value: stats.total, color: 'text-foreground' },
          { label: 'Đã duyệt', value: stats.approved, color: 'text-green-600' },
          { label: 'Chờ duyệt', value: stats.pending, color: 'text-blue-600' },
          { label: 'Cần sửa', value: stats.revision, color: 'text-orange-600' },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-4">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Send size={24} />} title="Chưa có bài nộp" description="Không có bài nộp biên tập nào khớp với bộ lọc hiện tại." />
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <Card key={sub.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {STATUS_ICON[sub.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{sub.seriesTitle}</h3>
                    <Badge status={sub.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Đã nộp: {sub.submittedDate}</p>

                  {sub.boardDecision && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Quyết định Ban biên tập</p>
                      <p className="text-sm font-medium text-foreground">{sub.boardDecision}</p>
                    </div>
                  )}

                  {sub.feedback && (
                    <div className={`p-3 rounded-xl text-sm mt-3 ${
                      sub.status === 'Approved' ? 'bg-green-50 border border-green-200 text-green-800' :
                      sub.status === 'Revision Required' ? 'bg-orange-50 border border-orange-200 text-orange-800' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1">Phản hồi Ban biên tập</p>
                      <p className="leading-relaxed">{sub.feedback}</p>
                    </div>
                  )}

                  {sub.status === 'Pending' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 mt-3">
                      <Clock size={14} />
                      <span>Đang chờ ban biên tập xét duyệt. Thường mất 5-10 ngày làm việc.</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

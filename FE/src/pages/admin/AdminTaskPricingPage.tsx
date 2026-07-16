import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, RefreshCcw, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';
import Button from '../../components/ui/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatVnd, formatVndInput, parseVndInput } from '../../utils/formatCurrency';
import { getTaskTypeLabel, setTaskTypeLabelsFromCatalog } from '../../utils/taskTypes';
import {
  addTaskType,
  approveTaskPriceProposal,
  getCompanyTaskPriceTemplate,
  listTaskPriceProposals,
  rejectTaskPriceProposal,
  seedAllSeriesTaskPrices,
  type TaskPriceItem,
  type TaskPriceProposal,
  updateCompanyTaskPriceTemplate,
} from '../../services/taskPricingApi';
import { getVisibleSeriesLight } from '../../services/seriesApi';
import type { Series } from '../../types/domain';

export default function AdminTaskPricingPage() {
  const { setPageMeta } = usePageMeta();
  const [template, setTemplate] = useState<TaskPriceItem[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [proposals, setProposals] = useState<TaskPriceProposal[]>([]);
  const [seriesFilter, setSeriesFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('100000');

  useEffect(() => {
    setPageMeta({ title: 'Bảng giá task' });
  }, [setPageMeta]);

  const load = async () => {
    setLoading(true);
    try {
      const [tpl, list, proposalList] = await Promise.all([
        getCompanyTaskPriceTemplate(),
        getVisibleSeriesLight().catch(() => []),
        listTaskPriceProposals({ status: 'pending' }),
      ]);
      setTemplate(tpl);
      setTaskTypeLabelsFromCatalog(tpl);
      setSeriesList(list);
      setProposals(proposalList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được dữ liệu bảng giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredProposals = useMemo(
    () => (seriesFilter ? proposals.filter(p => p.seriesId === seriesFilter) : proposals),
    [proposals, seriesFilter]
  );

  const updateTemplatePrice = (taskType: string, value: string) => {
    setTemplate(prev =>
      prev.map(item =>
        item.taskType === taskType ? { ...item, price: parseVndInput(value) } : item
      )
    );
  };

  const updateTemplateLabel = (taskType: string, value: string) => {
    setTemplate(prev =>
      prev.map(item =>
        item.taskType === taskType ? { ...item, displayName: value } : item
      )
    );
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const updated = await updateCompanyTaskPriceTemplate(template);
      setTemplate(updated);
      setTaskTypeLabelsFromCatalog(updated);
      toast.success('Đã lưu tên hiển thị và giá mặc định.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu bảng giá.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAddType = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const label = newLabel.trim();
    if (!slug || !label) {
      toast.error('Nhập mã loại và tên hiển thị.');
      return;
    }
    setAdding(true);
    try {
      const created = await addTaskType({
        taskType: slug,
        displayName: label,
        defaultPrice: parseVndInput(newPrice),
        seedToAllSeries: true,
      });
      setTemplate(prev => [...prev, created]);
      setTaskTypeLabelsFromCatalog([...template, created]);
      setNewSlug('');
      setNewLabel('');
      setNewPrice('100000');
      toast.success(`Đã thêm loại "${label}" và seed vào các series.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thêm được loại task.');
    } finally {
      setAdding(false);
    }
  };

  const handleSeed = async () => {
    try {
      const added = await seedAllSeriesTaskPrices();
      toast.success(`Đã bổ sung ${added} dòng giá còn thiếu cho các series.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể seed bảng giá series.');
    }
  };

  const handleApprove = async (proposal: TaskPriceProposal) => {
    setProcessingId(proposal.proposalId);
    try {
      await approveTaskPriceProposal(proposal.proposalId, {});
      setProposals(prev => prev.filter(x => x.proposalId !== proposal.proposalId));
      toast.success('Đã duyệt đề xuất giá.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không duyệt được đề xuất.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proposal: TaskPriceProposal) => {
    const reason = window.prompt('Nhập lý do từ chối đề xuất:')?.trim();
    setProcessingId(proposal.proposalId);
    try {
      await rejectTaskPriceProposal(proposal.proposalId, { adminReason: reason || undefined });
      setProposals(prev => prev.filter(x => x.proposalId !== proposal.proposalId));
      toast.success('Đã từ chối đề xuất.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không từ chối được đề xuất.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Tags size={22} className="text-red-600" />
          Bảng giá task
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Đổi tên hiển thị, chỉnh giá mặc định, thêm loại task mới — workspace và tab Giá thù lao sẽ đồng bộ.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Catalog loại task công ty</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleSeed()}>
              <RefreshCcw size={14} /> Đồng bộ mọi series
            </Button>
            <Button variant="primary" size="sm" loading={savingTemplate} onClick={() => void handleSaveTemplate()}>
              <CheckCircle2 size={14} /> Lưu thay đổi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : (
            <div className="space-y-3">
              {template.map(item => (
                <div key={item.taskType} className="grid grid-cols-1 md:grid-cols-[140px_1fr_180px] gap-2 items-end rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Mã (không đổi)</p>
                    <p className="text-sm font-mono text-gray-700">{item.taskType}</p>
                  </div>
                  <label className="text-sm">
                    <span className="text-xs text-gray-500">Tên hiển thị</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={item.displayName ?? getTaskTypeLabel(item.taskType)}
                      onChange={e => updateTemplateLabel(item.taskType, e.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-xs text-gray-500">Giá mặc định (VNĐ)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={formatVndInput(String(item.price))}
                      onChange={e => updateTemplatePrice(item.taskType, e.target.value)}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Plus size={16} /> Thêm loại task mới
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="text-xs text-gray-500">Mã loại (slug)</span>
                <input
                  type="text"
                  placeholder="vd: coloring"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Tên hiển thị</span>
                <input
                  type="text"
                  placeholder="vd: Tô màu"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Giá mặc định</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={formatVndInput(newPrice)}
                  onChange={e => setNewPrice(e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Mã dùng chữ thường, số, gạch dưới (vd: <code>clean_line</code>). Sau khi thêm, hệ thống seed vào mọi series — workspace hiện ngay loại mới.
            </p>
            <Button variant="primary" size="sm" loading={adding} onClick={() => void handleAddType()}>
              <Plus size={14} /> Thêm loại
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Đề xuất chỉnh giá chờ duyệt</CardTitle>
          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            value={seriesFilter}
            onChange={e => setSeriesFilter(e.target.value)}
          >
            <option value="">Tất cả series</option>
            {seriesList.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredProposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có đề xuất đang chờ.</p>
          ) : (
            filteredProposals.map(p => (
              <div key={p.proposalId} className="rounded-lg border border-gray-200 p-3">
                <p className="font-semibold">{p.seriesTitle}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đề xuất bởi {p.proposedByName} · {new Date(p.createdAt).toLocaleString('vi-VN')}
                </p>
                {p.note && <p className="text-sm mt-2 text-gray-700">{p.note}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {p.items.map(item => (
                    <p key={item.taskType} className="text-sm">
                      {item.displayName ?? getTaskTypeLabel(item.taskType)}: <strong>{formatVnd(item.price)}</strong>
                    </p>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={processingId === p.proposalId}
                    onClick={() => void handleApprove(p)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={processingId === p.proposalId}
                    onClick={() => void handleReject(p)}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardList } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { TypeBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import EmptyState from '../../components/ui/EmptyState';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Task, TaskType } from '../../types/domain';
import { getMangakaTasks } from '../../services/tasksApi';
import { getAssistants, type ProfileSummary } from '../../services/profilesApi';
import { TASK_STATUS_FILTER_OPTIONS, formatTaskStatusLabel } from '../../utils/statusLabels';
import { format } from 'date-fns';

const STATUS_OPTIONS = TASK_STATUS_FILTER_OPTIONS;
const TYPE_OPTIONS: TaskType[] = ['Background', 'Shading', 'Effect', 'Screentone', 'Clean Line', 'Dialogue Edit'];

export default function TaskManagementPage() {
  const navigate = useNavigate();
  const { setPageMeta } = usePageMeta();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPageMeta({ title: 'Nhiệm vụ' }); }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    Promise.all([getMangakaTasks(), getAssistants().catch(() => [])])
      .then(([taskList, assistantList]) => {
        if (!isActive) return;
        setTasks(taskList);
        setAssistants(Object.fromEntries(assistantList.map(a => [a.id, a])));
      })
      .catch(() => {
        if (isActive) {
          setTasks([]);
          setAssistants({});
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.seriesTitle.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Quản lý Nhiệm vụ</h1>
          <p className="text-sm text-muted-foreground">{loading ? 'Đang tải…' : `${tasks.length} nhiệm vụ đã giao`}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm nhiệm vụ…" className="flex-1 min-w-[200px] max-w-xs" />
        <FilterDropdown label="Trạng thái" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} formatOptionLabel={formatTaskStatusLabel} />
        <FilterDropdown label="Loại" options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Đang tải nhiệm vụ...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} />} title="Không tìm thấy nhiệm vụ" description="Thử điều chỉnh bộ lọc." />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Nhiệm vụ', 'Series', 'Trang', 'Trợ lý', 'Loại', 'Thời hạn', 'Trạng thái'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(task => {
                  const assistant = assistants[task.assistantId];
                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold max-w-[200px] truncate">{task.title}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[140px] truncate">{task.seriesTitle}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {task.chapterTitle.slice(0, 12)}… · P.{task.pageNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center overflow-hidden">
                            {assistant?.avatar ? (
                              <img src={assistant.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              assistant?.name.slice(0, 1)
                            )}
                          </div>
                          <span className="text-sm">{assistant?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={task.type} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{task.deadline ? format(new Date(task.deadline), 'MMM d') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge status={task.status} statusKind="task" />
                          {(task.status === 'Submitted' || task.status === 'Revision Required') && (
                            <Button
                              size="sm"
                              variant={task.status === 'Submitted' ? 'primary' : 'outline'}
                              onClick={() => navigate(`/mangaka/tasks/${task.id}/review`)}
                            >
                              {task.status === 'Submitted' ? 'Xét duyệt' : 'Xem'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

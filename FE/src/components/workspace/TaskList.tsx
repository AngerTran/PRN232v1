import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkspaceAssistant, WorkspaceTask } from '../../services/workspaceApi';
import { TypeBadge } from '../ui/Badge';
import { format } from 'date-fns';

const STATUS_DOT: Record<string, string> = {
  'Pending': 'bg-gray-400',
  'In Progress': 'bg-purple-500',
  'Submitted': 'bg-blue-500',
  'Approved': 'bg-green-500',
  'Revision Required': 'bg-orange-500',
};

const STATUS_LABEL_VI: Record<string, string> = {
  'Pending': 'Chờ thực hiện',
  'In Progress': 'Đang thực hiện',
  'Submitted': 'Đã nộp',
  'Approved': 'Đã duyệt',
  'Revision Required': 'Cần chỉnh sửa',
};

interface TaskListProps {
  tasks: WorkspaceTask[];
  assistants: WorkspaceAssistant[];
  onHoverTask?: (region: WorkspaceTask['region'] | null) => void;
  onDeleteTask?: (id: string) => void;
  deletingTaskId?: string | null;
}

export default function TaskList({ tasks, assistants, onHoverTask, onDeleteTask, deletingTaskId }: TaskListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const assistantNames = new Map(assistants.map(assistant => [assistant.id, assistant.name]));

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Chưa có nhiệm vụ nào cho trang này.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#3A3A3A]">
      {tasks.map(task => {
        const assistantName = task.assistantName ?? assistantNames.get(task.assistantId) ?? 'Unknown assistant';
        const isExpanded = expanded === task.id;

        return (
          <div
            key={task.id}
            className="hover:bg-[#2E2E2E] transition-colors"
            onMouseEnter={() => onHoverTask?.(task.region)}
            onMouseLeave={() => onHoverTask?.(null)}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : task.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left"
            >
              <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', STATUS_DOT[task.status] ?? 'bg-gray-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TypeBadge type={task.type} className="text-[9px]" />
                  <span className="text-xs text-gray-400 truncate">{assistantName}</span>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp size={14} className="text-gray-500 shrink-0 mt-0.5" />
              ) : (
                <ChevronDown size={14} className="text-gray-500 shrink-0 mt-0.5" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 pl-9 space-y-2 text-xs text-gray-400">
                <p className="leading-relaxed">{task.description}</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={11} />
                    ¥{task.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Trạng thái:</span>
                  <span className={clsx('font-semibold', {
                    'text-green-400': task.status === 'Approved',
                    'text-blue-400': task.status === 'Submitted',
                    'text-orange-400': task.status === 'Revision Required',
                    'text-purple-400': task.status === 'In Progress',
                    'text-gray-400': task.status === 'Pending',
                  })}>
                    {STATUS_LABEL_VI[task.status] ?? task.status}
                  </span>
                </div>
                {onDeleteTask && task.status !== 'Approved' && (
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    disabled={deletingTaskId === task.id}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Trash2 size={12} />
                    {deletingTaskId === task.id ? 'Đang hủy…' : 'Hủy task'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

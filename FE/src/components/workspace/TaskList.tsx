import { useState } from 'react';
import { ChevronDown, ChevronUp, User, Calendar, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { getAssistantById, type Task } from '../../data/mockData';
import { TypeBadge } from '../ui/Badge';
import Badge from '../ui/Badge';
import { format } from 'date-fns';

const STATUS_DOT: Record<string, string> = {
  'Pending': 'bg-gray-400',
  'In Progress': 'bg-purple-500',
  'Submitted': 'bg-blue-500',
  'Approved': 'bg-green-500',
  'Revision Required': 'bg-orange-500',
};

interface TaskListProps {
  tasks: Task[];
  onHoverTask?: (region: Task['region'] | null) => void;
}

export default function TaskList({ tasks, onHoverTask }: TaskListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No tasks on this page yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#3A3A3A]">
      {tasks.map(task => {
        const assistant = getAssistantById(task.assistantId);
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
                  <span className="text-xs text-gray-400 truncate">{assistant?.name}</span>
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
                  <span>Status:</span>
                  <span className={clsx('font-semibold', {
                    'text-green-400': task.status === 'Approved',
                    'text-blue-400': task.status === 'Submitted',
                    'text-orange-400': task.status === 'Revision Required',
                    'text-purple-400': task.status === 'In Progress',
                    'text-gray-400': task.status === 'Pending',
                  })}>
                    {task.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, Clock, Edit2 } from 'lucide-react';
import type { Task, Priority } from '../types/task';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (id: string, status: string) => void;
  onEdit?: (task: Task) => void;
}

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onEdit }) => {
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && task.status !== 'completed';

  return (
    <div className="task-card dark:bg-gray-800 dark:border-gray-700 group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{task.title}</h3>
        <div className="flex gap-1">
          <span className={`priority-badge ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
          <select
            value={task.status}
            onChange={(e) => onStatusChange?.(task.id, e.target.value)}
            className={`status-badge status-${task.status} border-none cursor-pointer bg-transparent`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="pending">{statusLabels.pending}</option>
            <option value="in_progress">{statusLabels.in_progress}</option>
            <option value="completed">{statusLabels.completed}</option>
          </select>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {task.tags.map((tag) => (
          <span
            key={tag.id}
            className="tag-badge"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            #{tag.name}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex gap-4">
          {deadlineDate && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <Calendar size={14} />
              <span>{format(deadlineDate, 'd MMM yyyy', { locale: enUS })}</span>
              {task.is_all_day ? (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1">All day</span>
              ) : (
                <>
                  <Clock size={14} className="ml-1" />
                  <span>{format(deadlineDate, 'HH:mm')}</span>
                </>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onEdit?.(task)}
          className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          title="Edit task"
          aria-label={`Edit task: ${task.title}`}
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
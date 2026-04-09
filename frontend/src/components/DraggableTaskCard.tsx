import React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, Clock, Edit2, GripVertical } from 'lucide-react';
import type { Task, Priority } from '../types/task';

interface DraggableTaskCardProps {
  task: Task;
  index: number;
  onStatusChange?: (id: string, status: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string, title: string) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  isDragging?: boolean;
  dragOverIndex?: number | null;
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

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({
  task,
  index,
  onStatusChange,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  dragOverIndex,
}) => {
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && task.status !== 'completed';
  const isDropTarget = dragOverIndex === index;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDrop={(e) => onDrop?.(e, index)}
      className={`relative transition-all ${isDragging ? 'opacity-50 scale-95' : ''} ${isDropTarget ? 'border-t-2 border-primary-500' : ''}`}
    >
      <div className="task-card dark:bg-gray-800 dark:border-gray-700 group cursor-move">
        {/* Drag handle */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-gray-400" />
        </div>

        <div className="pl-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{task.title}</h3>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <span className={`priority-badge ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </span>
              <select
                value={task.status}
                onChange={(e) => onStatusChange?.(task.id, e.target.value)}
                className={`status-badge status-${task.status} border-none cursor-pointer bg-transparent`}
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
                  <Clock size={14} className="ml-1" />
                  <span>{format(deadlineDate, 'HH:mm')}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit?.(task)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableTaskCard;
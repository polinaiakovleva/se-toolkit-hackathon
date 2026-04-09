import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, Clock, Check, Trash2 } from 'lucide-react';
import type { Task, Priority } from '../types/task';

interface SwipeableTaskCardProps {
  task: Task;
  onStatusChange?: (id: string, status: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string, title: string) => void;
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

const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({ task, onStatusChange, onEdit, onDelete }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const startXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && task.status !== 'completed';

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    hasMovedRef.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;

    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
    }

    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, -150));
    } else {
      setSwipeX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeX < -80) {
      setShowActions(true);
      setSwipeX(-150);
    } else {
      setSwipeX(0);
      setShowActions(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    hasMovedRef.current = false;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    const diff = e.clientX - startXRef.current;

    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
    }

    if (diff < 0) {
      setSwipeX(Math.max(diff, -150));
    } else {
      setSwipeX(0);
    }
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    if (swipeX < -80) {
      setShowActions(true);
      setSwipeX(-150);
    } else {
      setSwipeX(0);
      setShowActions(false);
    }
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      setIsSwiping(false);
      setSwipeX(0);
      setShowActions(false);
    }
  };

  const handleClick = () => {
    // Only open edit if we haven't swiped
    if (!hasMovedRef.current && !showActions) {
      onEdit?.(task);
    }
  };

  const handleComplete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    onStatusChange?.(task.id, newStatus);
    setSwipeX(0);
    setShowActions(false);
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onDelete?.(task.id, task.title);
    setSwipeX(0);
    setShowActions(false);
  };

  const closeActions = () => {
    setSwipeX(0);
    setShowActions(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind the card */}
      <div className="absolute inset-0 flex">
        <div className="flex-1" onClick={closeActions} />
        <div className="flex">
          {/* Complete button */}
          <button
            onClick={handleComplete}
            className="w-20 bg-green-500 flex items-center justify-center text-white hover:bg-green-600"
          >
            <Check size={24} />
          </button>
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="w-20 bg-red-500 flex items-center justify-center text-white hover:bg-red-600"
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      {/* Main card */}
      <div
        className="task-card dark:bg-gray-800 dark:border-gray-700 group relative bg-white cursor-pointer"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
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
          <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            ← Swipe for actions
          </span>
        </div>
      </div>
    </div>
  );
};

export default SwipeableTaskCard;
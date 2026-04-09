import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { X, Calendar, Clock } from 'lucide-react';
import type { Task } from '../types/task';

interface TaskSummaryModalProps {
  date: Date;
  tasks: Task[];
  onClose: () => void;
  onTaskClick?: (task: Task) => void;
}

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const TaskSummaryModal: React.FC<TaskSummaryModalProps> = ({ date, tasks, onClose, onTaskClick }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and initial focus
  useEffect(() => {
    // Focus the close button when modal opens
    setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="task-summary-title">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="text-primary-600" size={20} aria-hidden="true" />
            <h3 id="task-summary-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(date, 'EEEE, MMMM d, yyyy', { locale: enUS })}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              <p>No tasks for this day</p>
            </div>
          ) : (
            <div className="space-y-3" role="list">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => onTaskClick?.(task)}
                  onKeyDown={(e) => e.key === 'Enter' && onTaskClick?.(task)}
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${task.title}, ${priorityLabels[task.priority]} priority, ${statusLabels[task.status]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600`}>
                        {statusLabels[task.status]}
                      </span>
                      {task.deadline && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" />
                          <span>{format(new Date(task.deadline), 'HH:mm')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {task.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center" aria-live="polite">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} for this day
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummaryModal;
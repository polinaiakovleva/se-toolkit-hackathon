import React, { useState, useEffect, useRef } from 'react';
import { X, Flag, Calendar, Tag as TagIcon, Check } from 'lucide-react';
import type { Task, Priority, TaskUpdateRequest } from '../types/task';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: TaskUpdateRequest) => void;
  onDelete: (id: string, title: string) => void;
}

const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const tagColors = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// Convert UTC datetime to local datetime-local format
const toLocalDateTime = (utcString: string | undefined): string => {
  if (!utcString) return '';
  const date = new Date(utcString);
  // Get local time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Convert UTC datetime to local date format (for all-day)
const toLocalDate = (utcString: string | undefined): string => {
  if (!utcString) return '';
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, isOpen, onClose, onSave, onDelete }) => {
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    deadline: '',
    isAllDay: false,
    priority: 'medium' as Priority,
    tags: '',
  });
  const [titleError, setTitleError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description || '',
        deadline: task.is_all_day ? toLocalDate(task.deadline) : toLocalDateTime(task.deadline),
        isAllDay: task.is_all_day || false,
        priority: task.priority,
        tags: task.tags.map(t => t.name).join(', '),
      });
      setTitleError(null);
    }
  }, [task]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen) {
      // Focus the title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 0);

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
    }
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    // Validate title
    if (!editData.title.trim()) {
      setTitleError('Title is required');
      titleInputRef.current?.focus();
      return;
    }

    // For all-day tasks, use just the date with time set to end of day
    let deadlineValue = editData.deadline || undefined;
    if (editData.isAllDay && deadlineValue) {
      // Set to end of day (23:59:59)
      const dateStr = editData.deadline.split('T')[0];
      deadlineValue = `${dateStr}T23:59:59`;
    }

    const updates: TaskUpdateRequest = {
      title: editData.title.trim(),
      description: editData.description || undefined,
      deadline: deadlineValue,
      is_all_day: editData.isAllDay || undefined,
      priority: editData.priority,
      tags: editData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    onSave(task.id, updates);
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id, task.title);
    onClose();
  };

  const addTag = (tag: string) => {
    const currentTags = editData.tags ? editData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(tag)) {
      setEditData({
        ...editData,
        tags: [...currentTags, tag].join(', '),
      });
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = editData.tags ? editData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    setEditData({
      ...editData,
      tags: currentTags.filter(t => t !== tag).join(', '),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-task-title">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 id="edit-task-title" className="text-lg font-semibold text-gray-900 dark:text-white">Edit Task</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              id="edit-title"
              ref={titleInputRef}
              type="text"
              value={editData.title}
              onChange={(e) => {
                setEditData({ ...editData, title: e.target.value });
                if (titleError) setTitleError(null);
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                titleError ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {titleError && (
              <p className="mt-1 text-sm text-red-500">{titleError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Flag size={14} />
                Priority
              </label>
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Deadline
              </label>
              <input
                type={editData.isAllDay ? 'date' : 'datetime-local'}
                value={editData.deadline}
                onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.isAllDay}
                  onChange={(e) => {
                    const newIsAllDay = e.target.checked;
                    let newDeadline = editData.deadline;
                    if (newIsAllDay && editData.deadline) {
                      // When switching to all-day, keep only the date part
                      newDeadline = editData.deadline.split('T')[0];
                    } else if (!newIsAllDay && editData.deadline) {
                      // When switching from all-day, add a default time
                      const datePart = editData.deadline.split('T')[0];
                      newDeadline = `${datePart}T12:00`;
                    }
                    setEditData({ ...editData, isAllDay: newIsAllDay, deadline: newDeadline });
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">All day</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <TagIcon size={14} />
              Tags
            </label>
            {/* Current tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {editData.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${tagColors[i % tagColors.length]}20`,
                    color: tagColors[i % tagColors.length],
                  }}
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag (press Enter)"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const tag = input.value.trim().toLowerCase().replace(/^#/, '');
                  if (tag) {
                    addTag(tag);
                    input.value = '';
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
          >
            <Check size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
import React, { useState, useEffect, useCallback, DragEvent } from 'react';
import { RefreshCw, Loader2, Search, AlertCircle } from 'lucide-react';
import { tasksApi } from '../services/api';
import SwipeableTaskCard from './SwipeableTaskCard';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditTaskModal from './EditTaskModal';
import type { Task, Status, Priority, TaskUpdateRequest } from '../types/task';

const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Tag {
  name: string;
  color: string;
}

interface TaskListProps {
  enableDragDrop?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ enableDragDrop = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<{ status?: Status; priority?: string; tag?: string }>({});
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; taskId: string; taskTitle: string }>({
    isOpen: false,
    taskId: '',
    taskTitle: '',
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [_dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all tasks and filter on client side
      const allData = await tasksApi.getAll(filter);

      // Filter to only show tasks WITH deadlines (actual tasks, not ideas)
      const data = allData.filter((task: Task) => task.deadline !== null);

      // Filter by search query
      const filteredData = searchQuery
        ? data.filter(task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
          )
        : data;

      // Sort by priority (critical first), then by deadline (earliest first)
      const sortedData = [...filteredData].sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
      setTasks(sortedData);

      // Extract unique tags from tasks
      const tagsMap = new Map<string, string>();
      data.forEach(task => {
        task.tags.forEach(tag => {
          tagsMap.set(tag.name, tag.color);
        });
      });
      setAllTags(Array.from(tagsMap.entries()).map(([name, color]) => ({ name, color })));
    } catch (err) {
      console.error('Error fetching tasks:', err);
      const errorMessage = (err as any).friendlyMessage || 'Failed to load tasks. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await tasksApi.update(id, { status: status as Status });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleEditClick = (task: Task) => {
    setEditModal({ isOpen: true, task });
  };

  const handleEditSave = async (id: string, updates: TaskUpdateRequest) => {
    try {
      await tasksApi.update(id, updates);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      taskId: id,
      taskTitle: title,
    });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await tasksApi.delete(deleteModal.taskId);
      setDeleteModal({ isOpen: false, taskId: '', taskTitle: '' });
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, taskId: '', taskTitle: '' });
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newTasks = [...tasks];
      const [draggedTask] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(dropIndex, 0, draggedTask);
      setTasks(newTasks);
      // Note: You would typically save the new order to the backend here
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as Status || undefined })}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filter.priority || ''}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filter.tag || ''}
            onChange={(e) => setFilter({ ...filter, tag: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                #{tag.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchTasks}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchTasks();
              }}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No tasks</p>
          <p className="text-sm mt-1">Add your first task using the form above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              draggable={enableDragDrop}
              onDragStart={(e) => enableDragDrop && handleDragStart(e, index)}
              onDragOver={(e) => enableDragDrop && handleDragOver(e, index)}
              onDrop={(e) => enableDragDrop && handleDrop(e, index)}
              onDragEnd={enableDragDrop ? handleDragEnd : undefined}
            >
              <SwipeableTaskCard
                task={task}
                onStatusChange={handleStatusChange}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editModal.task}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, task: null })}
        onSave={handleEditSave}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        taskTitle={deleteModal.taskTitle}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default TaskList;
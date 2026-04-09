import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2, Calendar, Trash2, Clock } from 'lucide-react';
import { tasksApi } from '../services/api';
import type { Task } from '../types/task';

const DailyBriefing: React.FC = () => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allTasks = await tasksApi.getAll();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Filter tasks due today (both pending and completed)
      const tasksForToday = allTasks.filter((task: Task) => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);
        return deadline >= today && deadline < tomorrow;
      });

      // Sort: uncompleted first by priority, then completed at bottom
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      tasksForToday.sort((a: Task, b: Task) => {
        // Completed tasks go to bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        // Within same status, sort by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setTodayTasks(tasksForToday);
    } catch (err) {
      console.error(err);
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const handleStatusChange = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await tasksApi.update(taskId, { status: newStatus });
      fetchTodayTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId);
      fetchTodayTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCompleted = async () => {
    const completedTasks = todayTasks.filter(t => t.status === 'completed');
    for (const task of completedTasks) {
      try {
        await tasksApi.delete(task.id);
      } catch (err) {
        console.error(err);
      }
    }
    fetchTodayTasks();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-blue-600 dark:text-blue-400';
      case 'low': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'low': return 'bg-gray-100 dark:bg-gray-700';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const pendingTasks = todayTasks.filter(t => t.status !== 'completed');
  const completedTasks = todayTasks.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="text-primary-500" size={20} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Tasks</h2>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {pendingTasks.length} pending, {completedTasks.length} done
        </span>
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>No tasks due today</p>
          <p className="text-sm">Enjoy your day!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <button
                  onClick={() => handleStatusChange(task.id, task.status)}
                  className="flex-shrink-0"
                  title="Mark as completed"
                >
                  <Circle
                    size={24}
                    className="text-gray-300 dark:text-gray-500 hover:text-green-500 transition-colors"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getPriorityBg(task.priority)} ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.deadline && (
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDeadline(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>

                {task.tags.length > 0 && (
                  <div className="flex gap-1">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completed tasks section */}
          {completedTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Completed
                </span>
                <button
                  onClick={handleClearCompleted}
                  className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
                  title="Clear completed tasks"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 group"
                  >
                    <button
                      onClick={() => handleStatusChange(task.id, task.status)}
                      className="flex-shrink-0"
                      title="Mark as incomplete"
                    >
                      <CheckCircle2
                        size={24}
                        className="text-green-500 hover:text-green-600"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-400 dark:text-gray-500 line-through truncate">
                        {task.title}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyBriefing;
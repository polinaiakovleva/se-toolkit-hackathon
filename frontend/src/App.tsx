import { useState, useCallback, useEffect } from 'react';
import SmartInput from './components/SmartInput';
import TaskList from './components/TaskList';
import IdeasList from './components/IdeasList';
import DailyBriefing from './components/DailyBriefing';
import Calendar from './components/Calendar';
import TaskSummaryModal from './components/TaskSummaryModal';
import EditTaskModal from './components/EditTaskModal';
import ThemeToggle from './components/ThemeToggle';
import NotificationSettings from './components/NotificationSettings';
import { Brain } from 'lucide-react';
import { tasksApi } from './services/api';
import { notificationService } from './services/notificationService';
import type { Task, TaskUpdateRequest } from './types/task';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null,
  });
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [error, setError] = useState<string | null>(null);

  const handleTasksCreated = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const fetchTasks = useCallback(async () => {
    setError(null);
    try {
      // Fetch all tasks
      const allTasks = await tasksApi.getAll();

      // Separate tasks with deadlines (tasks) from tasks without deadlines (ideas)
      const tasksData = allTasks.filter((task: Task) => task.deadline !== null);
      const ideasData = allTasks.filter((task: Task) => task.deadline === null);

      setTasks(tasksData);
      setIdeas(ideasData);

      // Schedule notifications for tasks with deadlines
      notificationService.scheduleForTasks(tasksData);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please check your connection and try again.');
    }
  }, []);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Apply dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleDateClick = (date: Date, dateTasks: Task[]) => {
    setSelectedDate(date);
    setSelectedDateTasks(dateTasks);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedDateTasks([]);
  };

  const handleEditClick = (task: Task) => {
    setEditModal({ isOpen: true, task });
  };

  const handleEditSave = async (id: string, updates: TaskUpdateRequest) => {
    try {
      await tasksApi.update(id, updates);
      // Increment refreshKey to trigger TaskList refresh
      setRefreshKey(prev => prev + 1);
      fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  const handleDeleteClick = async (id: string, _title: string) => {
    try {
      await tasksApi.delete(id);
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="text-primary-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ContextTask AI</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Intelligent bridge between thoughts and tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationSettings />
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => { setError(null); fetchTasks(); }}
              className="px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Calendar and Ideas */}
          <div className="lg:col-span-1">
            <section className="sticky top-4 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Calendar</h2>
                <Calendar tasks={tasks} onDateClick={handleDateClick} />
              </div>
              <IdeasList tasks={ideas} onTaskClick={handleEditClick} />
            </section>
          </div>

          {/* Right column - Tasks */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Tasks</h2>
              <SmartInput onTasksCreated={handleTasksCreated} />
            </section>

            <section>
              <DailyBriefing />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Tasks</h2>
              <TaskList key={refreshKey} />
            </section>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          ContextTask AI • Powered by Ollama LLM
        </div>
      </footer>

      {/* Task Summary Modal */}
      {selectedDate && (
        <TaskSummaryModal
          date={selectedDate}
          tasks={selectedDateTasks}
          onClose={handleCloseModal}
        />
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editModal.task}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, task: null })}
        onSave={handleEditSave}
        onDelete={handleDeleteClick}
      />
    </div>
  );
}

export default App;
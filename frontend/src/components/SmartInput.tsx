import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Send, Loader2, X, Check, Flag, Calendar, Lightbulb } from 'lucide-react';
import { tasksApi } from '../services/api';
import type { ParsedTask, Priority } from '../types/task';

interface SmartInputProps {
  onTasksCreated: () => void;
}

const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const tagColors = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const SmartInput: React.FC<SmartInputProps> = ({ onTasksCreated }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [originalParsedTasks, setOriginalParsedTasks] = useState<ParsedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIdeaMode, setIsIdeaMode] = useState(false);

  // Store recognition instance for cleanup
  const recognitionRef = useRef<any>(null);

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Handle idea mode toggle - preserve/restore deadlines
  useEffect(() => {
    if (showModal && parsedTasks.length > 0) {
      if (isIdeaMode) {
        // Clear deadlines when entering idea mode
        setParsedTasks(prev => prev.map(t => ({ ...t, deadline: undefined })));
      } else {
        // Restore original deadlines when exiting idea mode
        setParsedTasks(prev => prev.map((t, i) => ({
          ...t,
          deadline: originalParsedTasks[i]?.deadline,
        })));
      }
    }
  }, [isIdeaMode, showModal]);

  const handlePreview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please enter a task description');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await tasksApi.preview(text);
      if (response.tasks && response.tasks.length > 0) {
        // Store original tasks for restoring deadlines when toggling idea mode
        setOriginalParsedTasks(response.tasks);
        // If idea mode, clear deadlines
        const tasks = isIdeaMode
          ? response.tasks.map(t => ({ ...t, deadline: undefined }))
          : response.tasks;
        setParsedTasks(tasks);
        setShowModal(true);
      } else {
        setError('No tasks detected. Try describing your tasks differently.');
      }
    } catch (err: any) {
      let message = 'Error parsing tasks. ';
      if (err.code === 'ECONNABORTED') {
        message = 'Request timed out. Please try again.';
      } else if (err.code === 'ERR_NETWORK') {
        message = 'Network error. Please check your connection.';
      } else if (err.response?.status === 503) {
        message = 'AI service is unavailable. Please make sure Ollama is running (ollama serve).';
      } else if (err.response?.status === 504) {
        message = 'AI request timed out. The model may still be loading. Please try again in a moment.';
      } else if (err.response?.status >= 500) {
        message = err.response?.data?.detail || 'Server error. Please try again later.';
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else {
        message += 'Please check server connection.';
      }
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [text, isLoading, isIdeaMode]);

  const handleConfirm = useCallback(async () => {
    // Validate that all tasks have titles
    const tasksWithEmptyTitles = parsedTasks.filter(t => !t.title.trim());
    if (tasksWithEmptyTitles.length > 0) {
      setError('All tasks must have a title');
      return;
    }

    setIsLoading(true);
    try {
      await tasksApi.createFromParsed(parsedTasks);
      setText('');
      setParsedTasks([]);
      setShowModal(false);
      onTasksCreated();
    } catch (err: any) {
      let message = 'Error creating tasks. ';
      if (err.code === 'ECONNABORTED') {
        message += 'Request timed out. Please try again.';
      } else if (err.code === 'ERR_NETWORK') {
        message += 'Network error. Please check your connection.';
      } else if (err.response?.status >= 500) {
        message += 'Server error. Please try again later.';
      } else {
        message += 'Please check server connection.';
      }
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [parsedTasks, onTasksCreated]);

  const updateTask = (index: number, updates: Partial<ParsedTask>) => {
    setParsedTasks(prev => {
      const newTasks = [...prev];
      newTasks[index] = { ...newTasks[index], ...updates };
      return newTasks;
    });
  };

  const removeTask = (index: number) => {
    setParsedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const addTagToTask = (index: number, tag: string) => {
    const task = parsedTasks[index];
    const currentTags = task.tags || [];
    if (!currentTags.includes(tag)) {
      updateTask(index, { tags: [...currentTags, tag] });
    }
  };

  const removeTagFromTask = (index: number, tag: string) => {
    const task = parsedTasks[index];
    const currentTags = task.tags || [];
    updateTask(index, { tags: currentTags.filter(t => t !== tag) });
  };

  const handleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in your browser');
      return;
    }

    // Abort any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event: any) => {
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  return (
    <>
      <div className="w-full">
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your tasks naturally...&#10;For example: Tomorrow by 10am submit C++ lab and write the report"
              className="smart-input"
              rows={4}
              disabled={isLoading}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isListening}
                className={`p-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                title={isListening ? 'Recording...' : 'Voice input'}
              >
                <Mic size={20} />
              </button>
            </div>
          </div>

          {/* Idea mode toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsIdeaMode(!isIdeaMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isIdeaMode
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              <Lightbulb size={16} />
              {isIdeaMode ? 'Idea Mode (no deadline)' : 'Add as Idea'}
            </button>
            {isIdeaMode && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tasks will be created without deadline
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send size={20} />
                Preview Tasks
              </>
            )}
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isIdeaMode ? 'Confirm Ideas' : 'Confirm Tasks'} ({parsedTasks.length})
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {parsedTasks.map((task, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 relative">
                  <button
                    onClick={() => removeTask(index)}
                    className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-red-500" />
                  </button>

                  <div className="space-y-3">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(index, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        value={task.description || ''}
                        onChange={(e) => updateTask(index, { description: e.target.value })}
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
                          value={task.priority}
                          onChange={(e) => updateTask(index, { priority: e.target.value as Priority })}
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
                          type={task.is_all_day ? 'date' : 'datetime-local'}
                          value={task.deadline || ''}
                          onChange={(e) => updateTask(index, { deadline: e.target.value || undefined })}
                          disabled={isIdeaMode}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.is_all_day || false}
                            onChange={(e) => updateTask(index, { is_all_day: e.target.checked })}
                            disabled={isIdeaMode}
                            className="w-3 h-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">All day</span>
                        </label>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                      {/* Current tags */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(task.tags || []).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1"
                            style={{
                              backgroundColor: `${tagColors[tagIndex % tagColors.length]}20`,
                              color: tagColors[tagIndex % tagColors.length],
                            }}
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTagFromTask(index, tag)}
                              className="hover:opacity-70"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Add tag input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add tag..."
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const tag = input.value.trim().toLowerCase().replace(/^#/, '');
                              if (tag) {
                                addTagToTask(index, tag);
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Priority Badge */}
                    <div className="flex justify-end">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || parsedTasks.length === 0}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Check size={20} />
                    Create {parsedTasks.length} {isIdeaMode ? 'Idea' : 'Task'}{parsedTasks.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartInput;
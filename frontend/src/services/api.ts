import axios, { AxiosError } from 'axios';
import type { Task, TaskUpdateRequest, ParsedTask } from '../types/task';

const api = axios.create({
  baseURL: '/api',
  timeout: 90000, // 90 second timeout for LLM requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error interceptor for better error messages
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let message = 'An unexpected error occurred';

    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Network error. Please check your connection.';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 404) {
        message = 'Resource not found';
      } else if (status === 422) {
        message = data?.detail || 'Invalid request';
      } else if (status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (data?.detail) {
        message = data.detail;
      }
    }

    // Attach friendly message to error
    (error as any).friendlyMessage = message;
    return Promise.reject(error);
  }
);

export const tasksApi = {
  parseAndCreate: async (text: string): Promise<Task[]> => {
    const response = await api.post<Task[]>('/tasks/parse', { text });
    return response.data;
  },

  createFromParsed: async (tasks: ParsedTask[]): Promise<Task[]> => {
    const response = await api.post<Task[]>('/tasks/create', { tasks });
    return response.data;
  },

  preview: async (text: string): Promise<{ tasks: ParsedTask[] }> => {
    const response = await api.post('/tasks/parse/preview', { text });
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    priority?: string;
    tag?: string;
    skip?: number;
    limit?: number;
  }): Promise<Task[]> => {
    const queryParams = { limit: 100, ...params };
    const response = await api.get<Task[]>('/tasks', { params: queryParams });
    return response.data;
  },

  getById: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  update: async (id: string, data: TaskUpdateRequest): Promise<Task> => {
    const response = await api.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  getBriefing: async (): Promise<{ briefing: string }> => {
    const response = await api.post('/tasks/briefing');
    return response.data;
  },

  getTags: async (): Promise<{ tags: { name: string; color: string }[] }> => {
    const response = await api.get('/tasks/tags/list');
    return response.data;
  },
};
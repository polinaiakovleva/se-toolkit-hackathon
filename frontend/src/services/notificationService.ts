interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number; // minutes before task deadline
}

interface ScheduledNotification {
  taskId: string;
  taskTitle: string;
  deadline: Date;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  minutesBefore: 15,
};

class NotificationService {
  private settings: NotificationSettings;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  constructor() {
    this.settings = this.loadSettings();
    this.requestPermission();
  }

  private loadSettings(): NotificationSettings {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the structure
        if (typeof parsed.enabled === 'boolean' && typeof parsed.minutesBefore === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // Invalid JSON, clear and use defaults
      console.warn('Failed to parse notification settings, using defaults');
      localStorage.removeItem('notificationSettings');
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save notification settings:', e);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      if (import.meta.env.DEV) {
        console.log('Notifications not supported');
      }
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<boolean> {
    if (newSettings.enabled && !this.settings.enabled) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return false;
      }
    }

    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Reschedule all notifications with new settings
    if (this.settings.enabled) {
      this.rescheduleAll();
    } else {
      this.clearAll();
    }

    return true;
  }

  scheduleNotification(taskId: string, taskTitle: string, deadline: Date): void {
    if (!this.settings.enabled) {
      if (import.meta.env.DEV) {
        console.log(`[Notifications] Skipping ${taskTitle} - notifications disabled`);
      }
      return;
    }

    // Cancel existing notification for this task
    this.cancelNotification(taskId);

    const now = new Date();
    const notifyTime = new Date(deadline.getTime() - this.settings.minutesBefore * 60 * 1000);

    // Don't schedule if notification time has passed
    if (notifyTime <= now) {
      if (import.meta.env.DEV) {
        console.log(`[Notifications] Skipping ${taskTitle} - notification time has passed`);
      }
      return;
    }

    const timeUntilNotification = notifyTime.getTime() - now.getTime();
    const minutesUntil = Math.round(timeUntilNotification / 1000 / 60);

    if (import.meta.env.DEV) {
      console.log(`[Notifications] Scheduling notification for "${taskTitle}" in ${minutesUntil} minutes`);
    }

    // Note: setTimeout is throttled in background tabs, notifications may be delayed
    // For production, consider using Service Worker for background notifications
    const timeoutId = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log(`[Notifications] Showing notification for "${taskTitle}"`);
      }
      this.showNotification(taskTitle, deadline);
      this.scheduledNotifications.delete(taskId);
    }, timeUntilNotification);

    this.scheduledNotifications.set(taskId, {
      taskId,
      taskTitle,
      deadline,
      timeoutId,
    });
  }

  cancelNotification(taskId: string): void {
    const scheduled = this.scheduledNotifications.get(taskId);
    if (scheduled && scheduled.timeoutId !== null) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledNotifications.delete(taskId);
    }
  }

  private showNotification(title: string, deadline: Date): void {
    if (Notification.permission !== 'granted') return;

    const timeStr = deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = deadline.toLocaleDateString([], { month: 'short', day: 'numeric' });

    new Notification('📋 Task Reminder', {
      body: `"${title}" is due at ${timeStr} on ${dateStr}`,
      icon: '/vite.svg',
      tag: 'task-reminder',
      requireInteraction: true,
    });
  }

  private clearAll(): void {
    this.scheduledNotifications.forEach((scheduled) => {
      if (scheduled.timeoutId !== null) {
        clearTimeout(scheduled.timeoutId);
      }
    });
    this.scheduledNotifications.clear();
  }

  private rescheduleAll(): void {
    // This will be called with tasks from the component
  }

  // Schedule notifications for multiple tasks
  scheduleForTasks(tasks: Array<{ id: string; title: string; deadline?: string }>): void {
    if (import.meta.env.DEV) {
      console.log('[Notifications] scheduleForTasks called', {
        enabled: this.settings.enabled,
        tasksCount: tasks.length,
        tasksWithDeadline: tasks.filter(t => t.deadline).length
      });
    }

    if (!this.settings.enabled) {
      if (import.meta.env.DEV) {
        console.log('[Notifications] Notifications are disabled, skipping scheduling');
      }
      return;
    }

    // Clear existing
    this.clearAll();

    // Schedule new ones
    let scheduledCount = 0;
    tasks.forEach(task => {
      if (task.deadline) {
        // Parse deadline - assume UTC if no timezone info
        // Backend returns ISO format without timezone, treat as UTC
        const deadlineStr = task.deadline.includes('Z') || task.deadline.includes('+')
          ? task.deadline
          : task.deadline + 'Z';
        const deadline = new Date(deadlineStr);
        if (deadline > new Date()) {
          this.scheduleNotification(task.id, task.title, deadline);
          scheduledCount++;
        }
      }
    });

    if (import.meta.env.DEV) {
      console.log(`[Notifications] Scheduled ${scheduledCount} notifications`);
    }
  }
}

export const notificationService = new NotificationService();
export type { NotificationSettings };
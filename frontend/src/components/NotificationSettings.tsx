import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';
import { notificationService, NotificationSettings } from '../services/notificationService';

interface NotificationSettingsProps {
  onSettingsChange?: (settings: NotificationSettings) => void;
}

const NotificationSettingsComponent: React.FC<NotificationSettingsProps> = ({ onSettingsChange }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.getSettings());
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    // Check if permission was denied
    if ('Notification' in window && Notification.permission === 'denied') {
      setPermissionDenied(true);
    }
  }, []);

  const handleToggle = async () => {
    const newEnabled = !settings.enabled;
    const success = await notificationService.updateSettings({ enabled: newEnabled });

    if (success) {
      const newSettings = notificationService.getSettings();
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } else {
      setPermissionDenied(true);
    }
  };

  const handleMinutesChange = (minutes: number) => {
    notificationService.updateSettings({ minutesBefore: minutes });
    const newSettings = notificationService.getSettings();
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`p-2 rounded-lg transition-colors ${
          settings.enabled
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}
        title="Notification settings"
      >
        {settings.enabled ? <Bell size={20} /> : <BellOff size={20} />}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={16} />
              Notifications
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {permissionDenied && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded">
              Notifications blocked. Enable in browser settings.
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable reminders</span>
            <button
              onClick={handleToggle}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.enabled
                  ? 'bg-primary-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.enabled && (
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">
                Remind me before task:
              </label>
              <select
                value={settings.minutesBefore}
                onChange={(e) => handleMinutesChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>1 day</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsComponent;
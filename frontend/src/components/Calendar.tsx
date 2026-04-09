import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types/task';

interface CalendarProps {
  tasks: Task[];
  onDateClick?: (date: Date, tasks: Task[]) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
};

const Calendar: React.FC<CalendarProps> = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.deadline) {
        const dateKey = format(new Date(task.deadline), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, task]);
      }
    });
    return map;
  }, [tasks]);

  const getTasksForDate = (date: Date): Task[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateTasks = getTasksForDate(date);
    onDateClick?.(date, dateTasks);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(addDays(startOfMonth(currentDate), -1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addDays(endOfMonth(currentDate), 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy', { locale: enUS })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
        {calendarDays.map((day, index) => {
          const dayTasks = getTasksForDate(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              aria-label={`${format(day, 'MMMM d, yyyy')}${dayTasks.length > 0 ? `, ${dayTasks.length} task${dayTasks.length !== 1 ? 's' : ''}` : ''}`}
              aria-pressed={isSelected || false}
              aria-current={isTodayDate ? 'date' : undefined}
              className={`relative aspect-square p-1 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-primary-100 dark:bg-primary-900 ring-2 ring-primary-500'
                  : isTodayDate
                    ? 'bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <span className={`text-sm ${isTodayDate ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {format(day, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-1" aria-hidden="true">
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`}
                      title={task.title}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
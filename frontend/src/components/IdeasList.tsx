import React from 'react';
import { Lightbulb } from 'lucide-react';
import type { Task } from '../types/task';

interface IdeasListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const IdeasList: React.FC<IdeasListProps> = ({ tasks, onTaskClick }) => {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={20} className="text-yellow-600 dark:text-yellow-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Ideas ({tasks.length})</h3>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Lightbulb size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No ideas yet</p>
          <p className="text-xs mt-1">Tasks without deadline will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeasList;
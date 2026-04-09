export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'pending' | 'in_progress' | 'completed';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  is_all_day?: boolean;
  priority: Priority;
  status: Status;
  tags: Tag[];
  source_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedTask {
  title: string;
  description?: string | null;
  priority: Priority;
  deadline?: string | null;
  is_all_day?: boolean;
  tags: string[];
}

export interface TaskParseRequest {
  text: string;
}

export interface TaskParseResponse {
  tasks: ParsedTask[];
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  is_all_day?: boolean;
  priority?: Priority;
  status?: Status;
  tags?: string[];
}
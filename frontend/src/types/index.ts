// ─── Task Types ─────────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type TaskType = 'email' | 'report' | 'image' | 'video';

export interface Task {
  id: string;
  task_type: TaskType | string;
  payload: string;
  priority: number;
  status: TaskStatus;
  result: string | null;
  retry_count: number;
  deadline_hours: number;
  created_at: string | null;
  updated_at: string | null;
  original_filename?: string;
  output_filename?: string;
  target_format?: string;
  error_message?: string;
  output_size_bytes?: number;
  conversion_duration?: number;
  completed_at?: string | null;
}

export interface TaskCreate {
  task_type: string;
  payload: string;
  priority: number;
  deadline_hours: number;
}

export interface TaskCreateResponse {
  task_id: string;
  status: string;
}

// ─── Queue Types ─────────────────────────────────────────────────────────────

export interface QueueStatus {
  redis_queue_size: number;
  dead_letter_queue: number;
  pending_tasks: number;
  processing_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
}

// ─── Worker Types ─────────────────────────────────────────────────────────────

export type WorkerStatus = 'HEALTHY' | 'OFFLINE';

export interface WorkerHealth {
  status: WorkerStatus;
  last_heartbeat?: string;
}

// ─── DLQ Types ─────────────────────────────────────────────────────────────

export interface DLQReplayResponse {
  message: string;
  task_id: string;
}

// ─── UI / Chart Types ─────────────────────────────────────────────────────────

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TrendDataPoint {
  time: string;
  completed: number;
  failed: number;
  pending: number;
}

// ─── Command Palette Types ─────────────────────────────────────────────────────

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

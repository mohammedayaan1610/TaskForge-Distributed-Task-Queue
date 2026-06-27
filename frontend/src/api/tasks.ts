import apiClient from './client';
import type { Task, TaskCreate, TaskCreateResponse } from '../types';

/**
 * Create a new task in the queue.
 */
export const createTask = async (data: FormData): Promise<TaskCreateResponse> => {
  const response = await apiClient.post<TaskCreateResponse>('/tasks', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Fetch a single task by ID.
 */
export const getTask = async (taskId: string): Promise<Task> => {
  const response = await apiClient.get<Task>(`/tasks/${taskId}`);
  return response.data;
};

/**
 * Fetch multiple tasks in parallel by their IDs.
 * Returns only successfully fetched tasks (failed fetches are silently skipped).
 */
export const getTasksByIds = async (ids: string[]): Promise<Task[]> => {
  if (ids.length === 0) return [];
  const results = await Promise.allSettled(ids.map((id) => getTask(id)));
  return results
    .filter((r): r is PromiseFulfilledResult<Task> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((task) => !('error' in task)); // Filter out { error: "Task not found" } responses
};

import api from './api';
import { ApiResponse, PaginatedResponse, Task, SuggestionCard } from '../types';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  reminderAt?: string;
  timezone?: string;
  categoryId?: string;
  isRecurring?: boolean;
  recurrenceRule?: object;
  suggestionEnabled?: boolean;
}

export const taskService = {
  async getTasks(page = 0, size = 20) {
    const res = await api.get<ApiResponse<PaginatedResponse<Task>>>('/tasks', {
      params: { page, size },
    });
    return res.data.data;
  },

  async getTask(id: string) {
    const res = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return res.data.data;
  },

  async createTask(payload: CreateTaskPayload) {
    const res = await api.post<ApiResponse<Task>>('/tasks', payload);
    return res.data.data;
  },

  async updateTask(id: string, payload: Partial<CreateTaskPayload>) {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
    return res.data.data;
  },

  async updatePriority(id: string, priority: string) {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/priority`, { priority });
    return res.data.data;
  },

  async completeTask(id: string) {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/complete`);
    return res.data.data;
  },

  async snoozeTask(id: string, snoozeUntil: string) {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/snooze`, null, {
      params: { snoozeUntil },
    });
    return res.data.data;
  },

  async skipTask(id: string) {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/skip`);
    return res.data.data;
  },

  async deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
  },

  async getSuggestions(dueDate?: string) {
    const res = await api.get<ApiResponse<SuggestionCard[]>>('/tasks/reminder-suggestions', {
      params: dueDate ? { dueDate } : {},
    });
    return res.data.data;
  },

  async shareTask(id: string, emailOrMobile: string) {
    const res = await api.post<ApiResponse<void>>(`/tasks/${id}/share`, { emailOrMobile });
    return res.data;
  },

  async getPendingShares() {
    const res = await api.get<ApiResponse<any[]>>('/tasks/shares/pending');
    return res.data.data;
  },

  async acceptShare(shareId: string, postponeConflicts = false) {
    const res = await api.post<ApiResponse<Task>>(`/tasks/shares/${shareId}/accept`, null, {
      params: { postponeConflicts },
    });
    return res.data.data;
  },

  async rejectShare(shareId: string) {
    const res = await api.post<ApiResponse<void>>(`/tasks/shares/${shareId}/reject`);
    return res.data;
  },
};

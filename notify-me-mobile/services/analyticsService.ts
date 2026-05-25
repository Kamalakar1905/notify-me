import api from './api';
import { ApiResponse, AnalyticsDashboard } from '../types';

export const analyticsService = {
  async getDashboard(from?: string, to?: string, timezone?: string) {
    const res = await api.get<ApiResponse<AnalyticsDashboard>>('/analytics/dashboard', {
      params: { from, to, timezone },
    });
    return res.data.data;
  },
};

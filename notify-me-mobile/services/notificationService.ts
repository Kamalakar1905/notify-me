import api from './api';
import { ApiResponse, PaginatedResponse, NotificationItem } from '../types';
// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const notificationService = {
  async getHistory(params?: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) {
    const res = await api.get<ApiResponse<PaginatedResponse<NotificationItem>>>(
      '/notifications/history',
      { params }
    );
    return res.data.data;
  },

  async markOpened(id: string) {
    await api.patch(`/notifications/${id}/open`);
  },

  async deleteNotification(id: string) {
    await api.delete(`/notifications/${id}`);
  },

  async bulkDelete(ids: string[]) {
    const res = await api.delete<ApiResponse<number>>('/notifications/bulk', { data: ids });
    return res.data.data;
  },

  async exportHistory(format: 'CSV' | 'XLSX' | 'PDF', from?: string, to?: string) {
    const res = await api.get('/notifications/export', {
      params: { format, from, to },
      responseType: 'blob',
    });
    return res.data;
  },

  // Register device for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) return null;

    // Push notifications are temporarily mocked out so the app runs in Expo Go.
    // Uncomment these when moving to a Development Build.
    /*
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
    */
    return null;
  },

  async updateFcmToken(fcmToken: string) {
    await api.put('/profile/fcm-token', { fcmToken });
  },
};

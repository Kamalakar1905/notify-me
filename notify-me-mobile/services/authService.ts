import api from './api';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, ApiResponse } from '../types';

export const authService = {
  async register(fullName: string, email: string, password: string, timezone: string) {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      fullName, email, password, timezone,
    });
    await saveTokens(res.data.data);
    return res.data.data;
  },

  async loginWithEmail(email: string, password: string) {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    await saveTokens(res.data.data);
    return res.data.data;
  },

  async sendOtp(identifier: string) {
    const res = await api.post<ApiResponse<void>>('/auth/otp/send', { identifier });
    return res.data;
  },

  async verifyOtp(identifier: string, otp: string) {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/otp/verify', { identifier, otp });
    await saveTokens(res.data.data);
    return res.data.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
  },

  async getStoredTokens() {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return { accessToken, refreshToken };
  },
};

async function saveTokens(auth: AuthResponse) {
  await SecureStore.setItemAsync('accessToken', auth.accessToken);
  await SecureStore.setItemAsync('refreshToken', auth.refreshToken);
}

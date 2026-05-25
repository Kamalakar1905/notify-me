import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NotificationItem } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  notifications: NotificationItem[];
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  totalPages: 0,
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params: Parameters<typeof notificationService.getHistory>[0] = {}, { rejectWithValue }) => {
    try {
      return await notificationService.getHistory(params);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.content;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      });
  },
});

export default notificationSlice.reducer;

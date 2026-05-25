import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AnalyticsDashboard } from '../types';
import { analyticsService } from '../services/analyticsService';

interface AnalyticsState {
  dashboard: AnalyticsDashboard | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  dashboard: null,
  loading: false,
  error: null,
};

export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async (
    params: { from?: string; to?: string; timezone?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      return await analyticsService.getDashboard(params.from, params.to, params.timezone);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.loading = true; })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default analyticsSlice.reducer;

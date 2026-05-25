import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthResponse } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const loginWithEmail = createAsyncThunk(
  'auth/loginWithEmail',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authService.loginWithEmail(email, password);
    } catch (err: any) {
      console.error('[authSlice:loginWithEmail] Error:', err);
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { fullName, email, password, timezone }: { fullName: string; email: string; password: string; timezone: string },
    { rejectWithValue }
  ) => {
    try {
      return await authService.register(fullName, email, password, timezone);
    } catch (err: any) {
      console.error('[authSlice:registerUser] Error:', err);
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const sendOtpThunk = createAsyncThunk(
  'auth/sendOtp',
  async (identifier: string, { rejectWithValue }) => {
    try {
      return await authService.sendOtp(identifier);
    } catch (err: any) {
      console.error('[authSlice:sendOtpThunk] Error:', err);
      return rejectWithValue(err.response?.data?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ identifier, otp }: { identifier: string; otp: string }, { rejectWithValue }) => {
    try {
      return await authService.verifyOtp(identifier, otp);
    } catch (err: any) {
      console.error('[authSlice:verifyOtp] Error:', err);
      return rejectWithValue(err.response?.data?.message || 'OTP verification failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handleAuthSuccess = (state: AuthState, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    };

    builder
      .addCase(loginWithEmail.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginWithEmail.fulfilled, handleAuthSuccess)
      .addCase(loginWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, handleAuthSuccess)
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendOtpThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(sendOtpThunk.fulfilled, (state) => { state.loading = false; state.error = null; })
      .addCase(sendOtpThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyOtp.fulfilled, handleAuthSuccess)
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;

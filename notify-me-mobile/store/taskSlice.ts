import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task } from '../types';
import { taskService, CreateTaskPayload } from '../services/taskService';

interface TaskState {
  tasks: Task[];
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
}

const initialState: TaskState = {
  tasks: [],
  totalPages: 0,
  currentPage: 0,
  loading: false,
  error: null,
  selectedTask: null,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async ({ page, size }: { page?: number; size?: number } = {}, { rejectWithValue }) => {
    try {
      return await taskService.getTasks(page, size);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch tasks');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (payload: CreateTaskPayload, { rejectWithValue }) => {
    try {
      return await taskService.createTask(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create task');
    }
  }
);

export const completeTask = createAsyncThunk(
  'tasks/complete',
  async (id: string, { rejectWithValue }) => {
    try {
      return await taskService.completeTask(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to complete task');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete task');
    }
  }
);

export const updatePriority = createAsyncThunk(
  'tasks/updatePriority',
  async ({ id, priority }: { id: string; priority: string }, { rejectWithValue }) => {
    try {
      return await taskService.updatePriority(id, priority);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update priority');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, payload }: { id: string; payload: Partial<CreateTaskPayload> }, { rejectWithValue }) => {
    try {
      return await taskService.updateTask(id, payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update task');
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedTask(state, action: PayloadAction<Task | null>) {
      state.selectedTask = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.content;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.number;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
      })
      .addCase(updatePriority.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
        if (state.selectedTask && state.selectedTask.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      });
  },
});

export const { setSelectedTask, clearError } = taskSlice.actions;
export default taskSlice.reducer;

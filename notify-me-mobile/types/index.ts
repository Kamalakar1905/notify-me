export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
export type AuthProvider = 'EMAIL' | 'GOOGLE' | 'OTP';
export type NotificationType = 'REMINDER' | 'ESCALATION' | 'RECURRING' | 'SYSTEM';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'FAILED' | 'DISMISSED';

export interface User {
  id: string;
  email?: string;
  mobileNumber?: string;
  fullName: string;
  authProvider: AuthProvider;
  timezone: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  smartSuggestionsEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  reminderAt?: string;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentTaskId?: string;
  suggestionEnabled: boolean;
  suggestedReminder?: string;
  completedAt?: string;
  snoozedUntil?: string;
  snoozeCount: number;
  categoryId?: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceRule {
  type?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  interval?: number;
  days?: string[];
  endDate?: string;
  count?: number;
  showPreviousDayPopup?: boolean;
}

export interface NotificationItem {
  id: string;
  taskId?: string;
  taskTitle?: string;
  title: string;
  body: string;
  notificationType: NotificationType;
  channel: string;
  status: NotificationStatus;
  sentAtUtc?: string;
  openedAtUtc?: string;
  retryCount: number;
  createdAt: string;
}

export interface SuggestionCard {
  label: string;
  suggestedTime: string;
  type: string;
}

export interface AnalyticsDashboard {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  completionRate: number;
  remindersSent: number;
  remindersOpened: number;
  reminderOpenRate: number;
  totalSnoozed: number;
  snoozeRate: number;
  productivityStreak: number;
  completionTrend: Array<{ date: string; count: number }>;
  overdueTrend: Array<{ date: string; count: number }>;
  heatmap: Array<{ dow: number; hour: number; count: number }>;
  priorityDistribution: Record<Priority, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

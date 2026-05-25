# Notify Me Backend Documentation

This document explains the Database Schema (Tables and Columns) and provides a comprehensive API flow for the application.

---

## 1. Database Schema and Column Explanations

The database contains several core tables to handle users, authentication, task management, categories, notifications, and analytics.

### `users`
Stores all the information related to the registered users of the platform.
*   `id`: UUID (Primary Key). Unique identifier for the user.
*   `email`: String (Unique). User's email address for login and communication.
*   `mobile_number`: String (Unique). Used for SMS/WhatsApp notifications and OTP.
*   `full_name`: String. User's full name.
*   `password_hash`: String. Encrypted password for Email/Password authentication.
*   `google_id`: String (Unique). Stores Google ID for OAuth2 login.
*   `auth_provider`: Enum (`EMAIL`, `GOOGLE`, etc.). Identifies the authentication method used.
*   `timezone`: String. The user's timezone (e.g., UTC) to ensure accurate notification delivery.
*   `fcm_token`: Text. Firebase Cloud Messaging token for push notifications to the user's device.
*   `is_active`: Boolean. Whether the account is active or disabled/banned.
*   `is_email_verified`: Boolean. Ensures the user's email is authentic.
*   `is_mobile_verified`: Boolean. Ensures the user's mobile number is authentic.
*   `smart_suggestions_enabled`: Boolean. Determines if the user opted in for ML/AI based task reminder suggestions.
*   `created_at`, `updated_at`, `deleted_at`, `last_login_at`: Timestamps for tracking lifecycle, auditing, and soft deletes.

### `tasks`
Stores the reminders and tasks created by the user.
*   `id`: UUID (Primary Key). Unique identifier for the task.
*   `user_id`: UUID (Foreign Key). Links the task to the creator (`users` table).
*   `category_id`: UUID (Foreign Key). Links to `categories` table to group tasks.
*   `title`: String. The main objective of the task.
*   `description`: Text. Detailed notes or subtext for the task.
*   `priority`: Enum (`LOW`, `MEDIUM`, `HIGH`). For task sorting and urgency calculation.
*   `status`: Enum (`PENDING`, `COMPLETED`, etc.). Tracks the task lifecycle.
*   `due_date`: Timestamp. When the task needs to be completed.
*   `reminder_at`: Timestamp. Exactly when the notification should be triggered.
*   `timezone`: String. Task-specific timezone handling.
*   `is_recurring`: Boolean. Indicates if the task repeats.
*   `recurrence_rule`: JSONB. Stores complex recurrence logic (e.g., cron expression, repeat every Monday).
*   `parent_task_id`: UUID (Foreign Key). Self-referencing to allow sub-tasks.
*   `suggestion_enabled`, `suggested_reminder`: Boolean/Timestamp. Used by the smart suggestion engine to propose optimal reminder times based on user habits.
*   `completed_at`, `snoozed_until`, `snooze_count`: Timestamps and counters to track task resolution and procrastination metrics.

### `categories`
Groups tasks into meaningful buckets (e.g., Work, Personal, Health).
*   `id`: UUID (Primary Key). Unique identifier.
*   `user_id`: UUID (Foreign Key). A category belongs to a specific user.
*   `name`: String. Display name of the category.
*   `color`, `icon`: String. UI customization details for the category label.

### `notification_history`
An audit log and tracking table for all outgoing notifications.
*   `id`: UUID (Primary Key).
*   `user_id`, `task_id`: UUIDs (Foreign Keys). Links to who received it and what it was about.
*   `title`, `body`: Strings. The content sent in the notification.
*   `notification_type`: Enum. The trigger type (e.g., Reminder, Marketing, Security).
*   `channel`: String (e.g., `PUSH`, `EMAIL`). The medium of delivery.
*   `status`: Enum (`PENDING`, `SENT`, `FAILED`). Current state of the notification payload.
*   `fcm_message_id`: String. Reference ID returned from Firebase for tracking.
*   `sent_at_utc`, `delivered_at_utc`, `opened_at_utc`, `dismissed_at_utc`: Timestamps to analyze the funnel of user engagement with notifications.
*   `retry_count`, `max_retries`, `next_retry_at`, `error_message`: Used for the retry mechanism in case FCM or email provider fails.
*   `metadata`: JSONB. Any extra context payload passed to the app.

### `otp_records`
Handles the security codes sent to users for verification or login.
*   `id`: UUID.
*   `identifier`: String. Either an email or mobile number.
*   `otp_hash`: String. The encrypted version of the OTP (so no one can read it from DB).
*   `purpose`: Enum (e.g., `VERIFY_EMAIL`, `PASSWORD_RESET`).
*   `attempts`: Integer. Tracks failed guesses to prevent brute force.
*   `expires_at`: Timestamp. Defines the short lifespan of the OTP.
*   `used`: Boolean. Ensures single-use OTPs.

### `refresh_tokens`
Used to maintain secure, long-lived sessions without requiring frequent logins.
*   `id`: UUID.
*   `user_id`: UUID (Foreign Key).
*   `token_hash`: String (Unique). The encrypted refresh token string.
*   `device_info`, `ip_address`: Strings. For identifying suspicious login locations or allowing users to manage active devices.
*   `expires_at`, `revoked`: For token invalidation and timeout enforcement.

### `user_behavior_stats`
A flattened analytics table used to power the "Smart Suggestions" and dashboard.
*   `id`: UUID.
*   `user_id`: UUID (Foreign Key).
*   `hour_of_day`, `day_of_week`: Integers. Represents the time slot this record tracks.
*   `completion_count`, `reminder_open_count`, `snooze_count`, `dismiss_count`: Integers. Tracks how the user reacts to notifications at this specific time slot, helping algorithms suggest optimal times in the future.

---

## 2. API Flow and Endpoints

The API is structured in a logical flow starting from onboarding, leading to task management, notifications, and analytics.

### A. Authentication Flow (AuthController)

Users must authenticate to access the system.

**1. Register User**
*   **API**: `POST /api/v1/auth/register`
*   **Request**: `RegisterRequest` (Full name, email/mobile, password)
*   **Possible Outcome (Success 201)**: `AuthResponse` containing User details and JWT Access/Refresh tokens.
*   **Failed Outcome (400/409)**: Validation errors (e.g., weak password) or Conflict (Email already in use).

**2. Send OTP (For verification or reset)**
*   **API**: `POST /api/v1/auth/otp/send`
*   **Request**: `OtpRequest` (Identifier, Purpose)
*   **Possible Outcome (Success 200)**: "OTP sent successfully".
*   **Failed Outcome (400)**: Invalid identifier format.

**3. Verify OTP**
*   **API**: `POST /api/v1/auth/otp/verify`
*   **Request**: `OtpVerifyRequest` (Identifier, OTP code)
*   **Possible Outcome (Success 200)**: `AuthResponse` (if logging in) or verification success message.
*   **Failed Outcome (401/400)**: "Invalid OTP" or "OTP expired".

**4. Login**
*   **API**: `POST /api/v1/auth/login`
*   **Request**: `LoginRequest` (Email/Mobile, Password)
*   **Possible Outcome (Success 200)**: `AuthResponse` with Access and Refresh tokens.
*   **Failed Outcome (401)**: "Invalid credentials".

**5. Refresh Token**
*   **API**: `POST /api/v1/auth/refresh`
*   **Request**: `RefreshTokenRequest` (Refresh token string)
*   **Possible Outcome (Success 200)**: `AuthResponse` with new Access Token.
*   **Failed Outcome (401)**: "Token expired/revoked".

**6. Logout**
*   **API**: `POST /api/v1/auth/logout`
*   **Request**: Empty body (Uses authenticated user ID).
*   **Possible Outcome (Success 200)**: "Logged out successfully" (Token is revoked).
*   **Failed Outcome (401)**: Unauthorized.

---

### B. User Profile Flow (ProfileController)

Once logged in, users can manage their settings.

**1. Get Profile**
*   **API**: `GET /api/v1/profile`
*   **Possible Outcome (Success 200)**: `UserResponse` with user details.

**2. Update Profile**
*   **API**: `PUT /api/v1/profile`
*   **Request**: `UpdateProfileRequest` (FullName, SmartSuggestionsEnabled)
*   **Possible Outcome (Success 200)**: Updated `UserResponse`.

**3. Update FCM Token (Crucial for receiving push notifications)**
*   **API**: `PUT /api/v1/profile/fcm-token`
*   **Request**: `FcmTokenRequest` (Device FCM token)
*   **Possible Outcome (Success 200)**: "FCM token updated".

---

### C. Task Management Flow (TaskController)

The core feature. Users create and manage tasks/reminders.

**1. Create Task**
*   **API**: `POST /api/v1/tasks`
*   **Request**: `CreateTaskRequest` (Title, Description, DueDate, ReminderAt, Priority, CategoryId)
*   **Possible Outcome (Success 201)**: `TaskResponse` containing the created Task ID.
*   **Failed Outcome (400)**: Validation errors (e.g., missing title).

**2. Get Tasks (Paginated)**
*   **API**: `GET /api/v1/tasks?page=0&size=20`
*   **Possible Outcome (Success 200)**: Paginated list of `TaskResponse`.

**3. Update Task Priority**
*   **API**: `PATCH /api/v1/tasks/{id}/priority`
*   **Request**: `UpdatePriorityRequest` (New Priority enum)
*   **Possible Outcome (Success 200)**: Updated `TaskResponse`.
*   **Failed Outcome (404)**: Task not found.

**4. Complete Task**
*   **API**: `PATCH /api/v1/tasks/{id}/complete`
*   **Possible Outcome (Success 200)**: Task status changed to COMPLETED. Updates `completed_at` and feeds into `user_behavior_stats`.

**5. Snooze Task**
*   **API**: `PATCH /api/v1/tasks/{id}/snooze?snoozeUntil={timestamp}`
*   **Possible Outcome (Success 200)**: Task snoozed. Increases `snooze_count`, updates `snoozed_until`.

**6. Get Smart Reminder Suggestions**
*   **API**: `GET /api/v1/tasks/reminder-suggestions?dueDate={timestamp}`
*   **Possible Outcome (Success 200)**: List of `SuggestionCard` objects proposing optimal times based on `user_behavior_stats`.

---

### D. Notification Flow (NotificationController)

Tracks and manages how users interact with the notifications they receive.

**1. Get Notification History**
*   **API**: `GET /api/v1/notifications/history`
*   **Possible Outcome (Success 200)**: Paginated `NotificationHistoryResponse`.

**2. Mark Notification as Opened**
*   **API**: `PATCH /api/v1/notifications/{id}/open`
*   **Possible Outcome (Success 200)**: "Marked as opened". Updates `opened_at_utc`. Crucial for behavior tracking.

**3. Export Notifications**
*   **API**: `GET /api/v1/notifications/export?format=CSV`
*   **Possible Outcome (Success 200)**: Returns a file stream (CSV/XLSX/PDF) containing the notification history.

---

### E. Analytics Flow (AnalyticsController)

Provides insights into user productivity.

**1. Get Dashboard Stats**
*   **API**: `GET /api/v1/analytics/dashboard?from={start}&to={end}`
*   **Possible Outcome (Success 200)**: `AnalyticsDashboardResponse` containing task completion rates, mostly snoozed tasks, and engagement percentages.

---

## 3. Swagger Integration

Swagger has been successfully added to the `pom.xml`. 
To access Swagger UI for interactive API testing, run your Spring Boot application and navigate to:
`http://localhost:8080/swagger-ui/index.html` (Assuming your app runs on port 8080).
Or `http://localhost:8080/v3/api-docs` for the raw OpenAPI JSON specification.

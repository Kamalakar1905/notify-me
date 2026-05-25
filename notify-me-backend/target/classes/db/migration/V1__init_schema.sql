-- ============================================================
-- V1: Initial Schema - Notify Me Application
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search on notifications

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE,
    mobile_number       VARCHAR(20) UNIQUE,
    full_name           VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    google_id           VARCHAR(255) UNIQUE,
    auth_provider       VARCHAR(20) NOT NULL DEFAULT 'EMAIL', -- EMAIL, GOOGLE, OTP
    timezone            VARCHAR(100) NOT NULL DEFAULT 'UTC',
    fcm_token           TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    is_mobile_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    smart_suggestions_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_mobile ON users(mobile_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_google_id ON users(google_id);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address  VARCHAR(45),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ============================================================
-- OTP TABLE
-- ============================================================
CREATE TABLE otp_records (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier  VARCHAR(255) NOT NULL, -- email or mobile
    otp_hash    VARCHAR(255) NOT NULL,
    purpose     VARCHAR(50) NOT NULL,  -- LOGIN, VERIFY_EMAIL, VERIFY_MOBILE, CHANGE_PASSWORD
    attempts    INT NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON otp_records(identifier, purpose);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(7),  -- hex color
    icon        VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED
    due_date            TIMESTAMPTZ,
    reminder_at         TIMESTAMPTZ,  -- stored in UTC
    timezone            VARCHAR(100) NOT NULL DEFAULT 'UTC',
    is_recurring        BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule     JSONB,        -- { "type": "WEEKLY", "interval": 1, "days": ["MON","WED"], "endDate": null, "count": null }
    parent_task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE, -- for recurring instances
    suggestion_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    suggested_reminder  TIMESTAMPTZ,  -- AI suggested time
    completed_at        TIMESTAMPTZ,
    snoozed_until       TIMESTAMPTZ,
    snooze_count        INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_reminder_at ON tasks(reminder_at) WHERE deleted_at IS NULL AND status = 'PENDING';
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status, priority) WHERE deleted_at IS NULL;

-- ============================================================
-- NOTIFICATION HISTORY TABLE
-- ============================================================
CREATE TABLE notification_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id             UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title               VARCHAR(500),
    body                TEXT,
    notification_type   VARCHAR(50) NOT NULL, -- REMINDER, ESCALATION, RECURRING, SYSTEM
    channel             VARCHAR(20) NOT NULL DEFAULT 'PUSH', -- PUSH, EMAIL, SMS
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, OPENED, FAILED, DISMISSED
    fcm_message_id      VARCHAR(255),
    sent_at_utc         TIMESTAMPTZ,
    delivered_at_utc    TIMESTAMPTZ,
    opened_at_utc       TIMESTAMPTZ,
    dismissed_at_utc    TIMESTAMPTZ,
    retry_count         INT NOT NULL DEFAULT 0,
    max_retries         INT NOT NULL DEFAULT 5,
    next_retry_at       TIMESTAMPTZ,
    error_message       TEXT,
    metadata            JSONB,  -- extra data like action buttons, deep link
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_id ON notification_history(user_id);
CREATE INDEX idx_notif_task_id ON notification_history(task_id);
CREATE INDEX idx_notif_status ON notification_history(status);
CREATE INDEX idx_notif_sent_at ON notification_history(sent_at_utc DESC);
CREATE INDEX idx_notif_user_created ON notification_history(user_id, created_at DESC);
CREATE INDEX idx_notif_retry ON notification_history(next_retry_at) WHERE status = 'FAILED' AND retry_count < max_retries;
-- Full text search index
CREATE INDEX idx_notif_title_fts ON notification_history USING gin(to_tsvector('english', COALESCE(title, '')));

-- ============================================================
-- USER BEHAVIOR TABLE (for smart suggestions)
-- ============================================================
CREATE TABLE user_behavior_stats (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hour_of_day             SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    day_of_week             SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    completion_count        INT NOT NULL DEFAULT 0,
    reminder_open_count     INT NOT NULL DEFAULT 0,
    snooze_count            INT NOT NULL DEFAULT 0,
    dismiss_count           INT NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, hour_of_day, day_of_week)
);

CREATE INDEX idx_behavior_user_id ON user_behavior_stats(user_id);

-- ============================================================
-- ANALYTICS SNAPSHOTS TABLE (pre-aggregated for performance)
-- ============================================================
CREATE TABLE analytics_snapshots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date       DATE NOT NULL,
    tasks_created       INT NOT NULL DEFAULT 0,
    tasks_completed     INT NOT NULL DEFAULT 0,
    tasks_overdue       INT NOT NULL DEFAULT 0,
    tasks_skipped       INT NOT NULL DEFAULT 0,
    reminders_sent      INT NOT NULL DEFAULT 0,
    reminders_opened    INT NOT NULL DEFAULT 0,
    reminders_snoozed   INT NOT NULL DEFAULT 0,
    avg_completion_mins NUMERIC(10,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_analytics_user_date ON analytics_snapshots(user_id, snapshot_date DESC);

-- ============================================================
-- QUARTZ SCHEDULER TABLES
-- ============================================================
CREATE TABLE QRTZ_JOB_DETAILS (
    SCHED_NAME        VARCHAR(120) NOT NULL,
    JOB_NAME          VARCHAR(200) NOT NULL,
    JOB_GROUP         VARCHAR(200) NOT NULL,
    DESCRIPTION       VARCHAR(250),
    JOB_CLASS_NAME    VARCHAR(250) NOT NULL,
    IS_DURABLE        BOOLEAN NOT NULL,
    IS_NONCONCURRENT  BOOLEAN NOT NULL,
    IS_UPDATE_DATA    BOOLEAN NOT NULL,
    REQUESTS_RECOVERY BOOLEAN NOT NULL,
    JOB_DATA          BYTEA,
    PRIMARY KEY (SCHED_NAME, JOB_NAME, JOB_GROUP)
);

CREATE TABLE QRTZ_TRIGGERS (
    SCHED_NAME     VARCHAR(120) NOT NULL,
    TRIGGER_NAME   VARCHAR(200) NOT NULL,
    TRIGGER_GROUP  VARCHAR(200) NOT NULL,
    JOB_NAME       VARCHAR(200) NOT NULL,
    JOB_GROUP      VARCHAR(200) NOT NULL,
    DESCRIPTION    VARCHAR(250),
    NEXT_FIRE_TIME BIGINT,
    PREV_FIRE_TIME BIGINT,
    PRIORITY       INTEGER,
    TRIGGER_STATE  VARCHAR(16) NOT NULL,
    TRIGGER_TYPE   VARCHAR(8) NOT NULL,
    START_TIME     BIGINT NOT NULL,
    END_TIME       BIGINT,
    CALENDAR_NAME  VARCHAR(200),
    MISFIRE_INSTR  SMALLINT,
    JOB_DATA       BYTEA,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, JOB_NAME, JOB_GROUP) REFERENCES QRTZ_JOB_DETAILS(SCHED_NAME, JOB_NAME, JOB_GROUP)
);

CREATE TABLE QRTZ_SIMPLE_TRIGGERS (
    SCHED_NAME      VARCHAR(120) NOT NULL,
    TRIGGER_NAME    VARCHAR(200) NOT NULL,
    TRIGGER_GROUP   VARCHAR(200) NOT NULL,
    REPEAT_COUNT    BIGINT NOT NULL,
    REPEAT_INTERVAL BIGINT NOT NULL,
    TIMES_TRIGGERED BIGINT NOT NULL,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_CRON_TRIGGERS (
    SCHED_NAME      VARCHAR(120) NOT NULL,
    TRIGGER_NAME    VARCHAR(200) NOT NULL,
    TRIGGER_GROUP   VARCHAR(200) NOT NULL,
    CRON_EXPRESSION VARCHAR(120) NOT NULL,
    TIME_ZONE_ID    VARCHAR(80),
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_BLOB_TRIGGERS (
    SCHED_NAME    VARCHAR(120) NOT NULL,
    TRIGGER_NAME  VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    BLOB_DATA     BYTEA,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_CALENDARS (
    SCHED_NAME    VARCHAR(120) NOT NULL,
    CALENDAR_NAME VARCHAR(200) NOT NULL,
    CALENDAR      BYTEA NOT NULL,
    PRIMARY KEY (SCHED_NAME, CALENDAR_NAME)
);

CREATE TABLE QRTZ_PAUSED_TRIGGER_GRPS (
    SCHED_NAME    VARCHAR(120) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    PRIMARY KEY (SCHED_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_FIRED_TRIGGERS (
    SCHED_NAME        VARCHAR(120) NOT NULL,
    ENTRY_ID          VARCHAR(95) NOT NULL,
    TRIGGER_NAME      VARCHAR(200) NOT NULL,
    TRIGGER_GROUP     VARCHAR(200) NOT NULL,
    INSTANCE_NAME     VARCHAR(200) NOT NULL,
    FIRED_TIME        BIGINT NOT NULL,
    SCHED_TIME        BIGINT NOT NULL,
    PRIORITY          INTEGER NOT NULL,
    STATE             VARCHAR(16) NOT NULL,
    JOB_NAME          VARCHAR(200),
    JOB_GROUP         VARCHAR(200),
    IS_NONCONCURRENT  BOOLEAN,
    REQUESTS_RECOVERY BOOLEAN,
    PRIMARY KEY (SCHED_NAME, ENTRY_ID)
);

CREATE TABLE QRTZ_SCHEDULER_STATE (
    SCHED_NAME        VARCHAR(120) NOT NULL,
    INSTANCE_NAME     VARCHAR(200) NOT NULL,
    LAST_CHECKIN_TIME BIGINT NOT NULL,
    CHECKIN_INTERVAL  BIGINT NOT NULL,
    PRIMARY KEY (SCHED_NAME, INSTANCE_NAME)
);

CREATE TABLE QRTZ_LOCKS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    LOCK_NAME  VARCHAR(40) NOT NULL,
    PRIMARY KEY (SCHED_NAME, LOCK_NAME)
);

-- ============================================================
-- TRIGGERS for updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_history_updated_at BEFORE UPDATE ON notification_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

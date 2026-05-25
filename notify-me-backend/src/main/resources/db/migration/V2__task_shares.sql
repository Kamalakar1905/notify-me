-- ============================================================
-- V2: Task Shares and Invitations
-- ============================================================

DROP TABLE IF EXISTS task_shares CASCADE;

CREATE TABLE task_shares (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, shared_with_id)
);

CREATE INDEX idx_task_shares_task_id ON task_shares(task_id);
CREATE INDEX idx_task_shares_shared_with ON task_shares(shared_with_id);

CREATE TRIGGER update_task_shares_updated_at BEFORE UPDATE ON task_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

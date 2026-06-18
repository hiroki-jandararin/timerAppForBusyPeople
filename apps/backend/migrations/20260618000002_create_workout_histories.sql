-- +goose Up
CREATE TABLE workout_histories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    routine_id TEXT NOT NULL,
    routine_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    items_count INTEGER NOT NULL,
    items_completed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE workout_histories;

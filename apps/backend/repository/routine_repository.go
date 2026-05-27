package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/hiroki-jandararin/apps/backend/domain"
)

// *sql.DB と *sql.Tx の両方を受け取れるインターフェース
type dbExecutor interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type postgresRoutineRepository struct {
	db dbExecutor
}

func NewPostgresRoutineRepository(db dbExecutor) domain.RoutineRepository {
	return &postgresRoutineRepository{db: db}
}

func (r *postgresRoutineRepository) FindAll(userID string) ([]domain.Routine, error) {
	query := `SELECT id, name, target_duration_sec, items, created_at, updated_at FROM routines WHERE user_id = $1`
	rows, err := r.db.QueryContext(context.Background(), query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var routines []domain.Routine
	for rows.Next() {
		var routine domain.Routine
		var itemsJSON []byte
		if err := rows.Scan(&routine.ID, &routine.Name, &routine.TargetDurationSec, &itemsJSON, &routine.CreatedAt, &routine.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(itemsJSON, &routine.Items); err != nil {
			return nil, err
		}
		routines = append(routines, routine)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return routines, nil
}

func (r *postgresRoutineRepository) FindByID(id string) (*domain.Routine, error) {
	query := `SELECT id, name, target_duration_sec, items, created_at, updated_at FROM routines WHERE id = $1`
	row := r.db.QueryRowContext(context.Background(), query, id)

	var routine domain.Routine
	var itemsJSON []byte
	if err := row.Scan(&routine.ID, &routine.Name, &routine.TargetDurationSec, &itemsJSON, &routine.CreatedAt, &routine.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // 見つからない場合は nil を返す
		}
		return nil, err
	}
	if err := json.Unmarshal(itemsJSON, &routine.Items); err != nil {
		return nil, err
	}
	return &routine, nil
}

func (r *postgresRoutineRepository) Update(routine *domain.Routine) (*domain.Routine, error) {
	itemsJSON, err := json.Marshal(routine.Items)
	if err != nil {
		return nil, err
	}
	query := `UPDATE routines SET name = $1, target_duration_sec = $2, items = $3, updated_at = NOW() WHERE id = $4 RETURNING updated_at`
	err = r.db.QueryRowContext(context.Background(), query, routine.Name, routine.TargetDurationSec, itemsJSON, routine.ID).Scan(&routine.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return routine, nil
}

func (r *postgresRoutineRepository) Create(routine *domain.Routine) (*domain.Routine, error) {
	itemsJSON, err := json.Marshal(routine.Items)
	if err != nil {
		return nil, err
	}
	query := `INSERT INTO routines (id, name, target_duration_sec, items, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING created_at, updated_at`
	err = r.db.QueryRowContext(context.Background(), query, routine.ID, routine.Name, routine.TargetDurationSec, itemsJSON).Scan(&routine.CreatedAt, &routine.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return routine, nil
}

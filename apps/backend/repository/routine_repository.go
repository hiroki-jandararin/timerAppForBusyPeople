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

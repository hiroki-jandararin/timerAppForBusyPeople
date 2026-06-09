package repository

import (
	"database/sql"

	"github.com/hiroki-jandararin/apps/backend/domain"
)

type postgresWorkoutHistoryRepository struct {
	db interface {
		Exec(query string, args ...any) (sql.Result, error)
		Query(query string, args ...any) (*sql.Rows, error)
	}
}

func NewPostgresWorkoutHistoryRepository(db interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
}) domain.WorkoutHistoryRepository {
	return &postgresWorkoutHistoryRepository{db: db}
}

func (r *postgresWorkoutHistoryRepository) Create(h *domain.WorkoutHistory) (*domain.WorkoutHistory, error) {
	_, err := r.db.Exec(`
		INSERT INTO workout_histories (id, user_id, routine_id, routine_name, started_at, finished_at, completed, items_count, items_completed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		h.ID, h.UserID, h.RoutineID, h.RoutineName, h.StartedAt, h.FinishedAt, h.Completed, h.ItemsCount, h.ItemsCompleted,
	)
	if err != nil {
		return nil, err
	}
	return h, nil
}

func (r *postgresWorkoutHistoryRepository) FindByUserID(userID string) ([]domain.WorkoutHistory, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, routine_id, routine_name, started_at, finished_at, completed, items_count, items_completed, created_at
		FROM workout_histories
		WHERE user_id = $1
		ORDER BY started_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.WorkoutHistory{}
	for rows.Next() {
		var h domain.WorkoutHistory
		var routineID sql.NullString
		if err := rows.Scan(
			&h.ID, &h.UserID, &routineID, &h.RoutineName,
			&h.StartedAt, &h.FinishedAt, &h.Completed,
			&h.ItemsCount, &h.ItemsCompleted, &h.CreatedAt,
		); err != nil {
			return nil, err
		}
		if routineID.Valid {
			h.RoutineID = &routineID.String
		}
		result = append(result, h)
	}
	return result, rows.Err()
}

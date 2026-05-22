package repository

import (
	"context"
	"database/sql"

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

func (r *postgresRoutineRepository) FindAll() ([]domain.Routine, error) {
	return []domain.Routine{}, nil
}

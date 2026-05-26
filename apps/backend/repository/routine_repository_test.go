package repository_test

import (
	"database/sql"
	"os"
	"testing"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/repository"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupDB(t *testing.T) *sql.Tx {
	t.Helper()
	godotenv.Load("../.env")

	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	require.NoError(t, err)

	tx, err := db.Begin()
	require.NoError(t, err)

	t.Cleanup(func() { tx.Rollback() })
	return tx
}

func TestFindAll(t *testing.T) {
	tests := []struct {
		name     string
		seed     func(t *testing.T, tx *sql.Tx)
		expected []domain.Routine
	}{
		{
			name:     "データが0件のとき空配列を返す",
			seed:     func(t *testing.T, tx *sql.Tx) {},
			expected: []domain.Routine{},
		},
		{
			name: "データが1件のとき1件返す",
			seed: func(t *testing.T, tx *sql.Tx) {
				_, err := tx.Exec(`INSERT INTO routines (id, user_id, name, items, created_at, updated_at) VALUES ('1', '97649158-71e1-4fdd-b749-963937ac57fe', '朝トレ', '[]', '2024-01-01 00:00:00+00', '2024-01-01 12:00:00+00')`)
				require.NoError(t, err)
			},
			expected: []domain.Routine{
				{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}},
			},
		},
		{
			name: "データが複数件のとき全件返す",
			seed: func(t *testing.T, tx *sql.Tx) {
				_, err := tx.Exec(`INSERT INTO routines (id, user_id, name, items, created_at, updated_at) VALUES ('1', '97649158-71e1-4fdd-b749-963937ac57fe', '朝トレ', '[]', '2024-01-01 00:00:00+00', '2024-01-01 12:00:00+00')`)
				require.NoError(t, err)
				_, err = tx.Exec(`INSERT INTO routines (id, user_id, name, items, created_at, updated_at) VALUES ('2', '97649158-71e1-4fdd-b749-963937ac57fe', '夜トレ', '[]', '2024-01-02 00:00:00+00', '2024-01-02 12:00:00+00')`)
				require.NoError(t, err)
			},
			expected: []domain.Routine{
				{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}},
				{ID: "2", Name: "夜トレ", Items: []domain.RoutineItem{}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tx := setupDB(t)
			tt.seed(t, tx)

			repo := repository.NewPostgresRoutineRepository(tx)
			routines, err := repo.FindAll("97649158-71e1-4fdd-b749-963937ac57fe")

			assert.NoError(t, err)
			assert.Len(t, routines, len(tt.expected))
		})
	}
}

func TestFindAll_DBError(t *testing.T) {
	godotenv.Load("../.env")

	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	require.NoError(t, err)
	db.Close() // 接続を閉じてエラーを再現

	repo := repository.NewPostgresRoutineRepository(db)
	_, err = repo.FindAll("97649158-71e1-4fdd-b749-963937ac57fe")

	assert.Error(t, err)
}

func TestFindByID(t *testing.T) {
	tests := []struct {
		name     string
		seed     func(t *testing.T, tx *sql.Tx)
		expected *domain.Routine
	}{
		{
			name:     "データがないときnilを返す",
			seed:     func(t *testing.T, tx *sql.Tx) {},
			expected: nil,
		},
		{
			name: "データがあるときそのデータを返す",
			seed: func(t *testing.T, tx *sql.Tx) {
				_, err := tx.Exec(`INSERT INTO routines (id, user_id, name, items, created_at, updated_at) VALUES ('1', '97649158-71e1-4fdd-b749-963937ac57fe', '朝トレ', '[]', '2024-01-01 00:00:00+00', '2024-01-01 12:00:00+00')`)
				require.NoError(t, err)
			},
			expected: &domain.Routine{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}, CreatedAt: "2024-01-01T00:00:00Z", UpdatedAt: "2024-01-01T12:00:00Z"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tx := setupDB(t)
			tt.seed(t, tx)

			repo := repository.NewPostgresRoutineRepository(tx)
			routine, err := repo.FindByID("1")

			assert.NoError(t, err)
			assert.Equal(t, tt.expected, routine)
		})
	}
}

func TestFindByID_DBError(t *testing.T) {
	godotenv.Load("../.env")

	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	require.NoError(t, err)
	db.Close() // 接続を閉じてエラーを再現

	repo := repository.NewPostgresRoutineRepository(db)
	_, err = repo.FindByID("1")

	assert.Error(t, err)
}

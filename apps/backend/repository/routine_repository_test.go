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
		seed     func(tx *sql.Tx) // テストデータを INSERT する関数
		expected []domain.Routine
	}{
		{
			name:     "データが0件のとき空配列を返す",
			seed:     func(tx *sql.Tx) {},
			expected: []domain.Routine{},
		},
		{
			name: "データが1件のとき1件返す",
			seed: func(tx *sql.Tx) {
				tx.Exec(`INSERT INTO routines (id, user_id, name, items) VALUES ('1', 'user1', '朝トレ', '[]')`)
			},
			expected: []domain.Routine{
				{ID: "1", Name: "朝トレ", Items: []domain.RoutineItem{}},
			},
		},
		{
			name: "データが複数件のとき全件返す",
			seed: func(tx *sql.Tx) {
				tx.Exec(`INSERT INTO routines (id, user_id, name, items) VALUES ('1', 'user1', '朝トレ', '[]')`)
				tx.Exec(`INSERT INTO routines (id, user_id, name, items) VALUES ('2', 'user1', '夜トレ', '[]')`)
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
			tt.seed(tx)

			repo := repository.NewPostgresRoutineRepository(tx)
			routines, err := repo.FindAll()

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
	_, err = repo.FindAll()

	assert.Error(t, err)
}

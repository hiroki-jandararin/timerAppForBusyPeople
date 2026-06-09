package repository_test

import (
	"testing"
	"time"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/hiroki-jandararin/apps/backend/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkoutHistoryCreate(t *testing.T) {
	tx := setupDB(t)
	repo := repository.NewPostgresWorkoutHistoryRepository(tx)

	routineID := "routine-1"
	history := &domain.WorkoutHistory{
		ID:             "history-1",
		UserID:         "97649158-71e1-4fdd-b749-963937ac57fe",
		RoutineID:      &routineID,
		RoutineName:    "朝トレ",
		StartedAt:      time.Now().Add(-10 * time.Minute),
		FinishedAt:     time.Now(),
		Completed:      true,
		ItemsCount:     5,
		ItemsCompleted: 5,
	}

	created, err := repo.Create(history)

	require.NoError(t, err)
	assert.Equal(t, history.ID, created.ID)
	assert.Equal(t, history.RoutineName, created.RoutineName)
	assert.Equal(t, history.Completed, created.Completed)
	assert.Equal(t, history.ItemsCount, created.ItemsCount)
}

func TestWorkoutHistoryFindByUserID(t *testing.T) {
	tx := setupDB(t)
	repo := repository.NewPostgresWorkoutHistoryRepository(tx)

	userID := "97649158-71e1-4fdd-b749-963937ac57fe"

	for i := range 2 {
		h := &domain.WorkoutHistory{
			ID:          "history-find-" + string(rune('a'+i)),
			UserID:      userID,
			RoutineName: "ルーティン",
			StartedAt:   time.Now().Add(-time.Duration(i+1) * time.Minute),
			FinishedAt:  time.Now(),
			Completed:   true,
		}
		_, err := repo.Create(h)
		require.NoError(t, err)
	}

	histories, err := repo.FindByUserID(userID)

	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(histories), 2)
	for _, h := range histories {
		assert.Equal(t, userID, h.UserID)
	}

	// 他ユーザーには何も返さない
	noData, err := repo.FindByUserID("00000000-0000-0000-0000-000000000000")
	require.NoError(t, err)
	assert.Empty(t, noData)
}

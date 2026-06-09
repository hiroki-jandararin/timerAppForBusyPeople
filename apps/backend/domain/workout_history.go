package domain

import "time"

type WorkoutHistory struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	RoutineID      *string   `json:"routineId"`
	RoutineName    string    `json:"routineName"`
	StartedAt      time.Time `json:"startedAt"`
	FinishedAt     time.Time `json:"finishedAt"`
	Completed      bool      `json:"completed"`
	ItemsCount     int       `json:"itemsCount"`
	ItemsCompleted int       `json:"itemsCompleted"`
	CreatedAt      time.Time `json:"createdAt"`
}

type WorkoutHistoryRepository interface {
	Create(history *WorkoutHistory) (*WorkoutHistory, error)
	FindByUserID(userID string) ([]WorkoutHistory, error)
}

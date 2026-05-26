package domain

type RoutineRepository interface {
	FindAll(userID string) ([]Routine, error)
}
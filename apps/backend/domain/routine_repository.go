package domain

type RoutineRepository interface {
	FindAll() ([]Routine, error)
}
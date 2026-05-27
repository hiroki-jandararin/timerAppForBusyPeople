package domain

type RoutineRepository interface {
	FindAll(userID string) ([]Routine, error)
	FindByID(id string) (*Routine, error)
	Create(routine *Routine) (*Routine, error)
}

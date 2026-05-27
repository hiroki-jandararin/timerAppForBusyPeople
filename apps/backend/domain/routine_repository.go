package domain

type RoutineRepository interface {
	FindAll(userID string) ([]Routine, error)
	FindByID(id string) (*Routine, error)
	Create(userID string, routine *Routine) (*Routine, error)
	Update(userID string, routine *Routine) (*Routine, error)
	Delete(id string) error
}

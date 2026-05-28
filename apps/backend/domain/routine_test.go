package domain_test

import (
	"testing"

	"github.com/hiroki-jandararin/apps/backend/domain"
	"github.com/stretchr/testify/assert"
)

func TestRoutine_Validate_EmptyName(t *testing.T) {
	routine := domain.Routine{
		Name:  "",
		Items: []domain.RoutineItem{{Type: "workout", Title: "スクワット", DurationSec: 30}},
	}

	errors := routine.Validate()

	assert.Contains(t, errors, "name is required")
}

func TestRoutine_Validate_NoItems(t *testing.T) {
	routine := domain.Routine{
		Name:  "朝トレ",
		Items: []domain.RoutineItem{},
	}

	errors := routine.Validate()

	assert.Contains(t, errors, "items must have at least 1 item")
}

func TestRoutine_Validate_InvalidItemType(t *testing.T) {
	routine := domain.Routine{
		Name:  "朝トレ",
		Items: []domain.RoutineItem{{Type: "unknown", Title: "スクワット", DurationSec: 30}},
	}

	errors := routine.Validate()

	assert.Contains(t, errors, "item[0]: type must be workout or interval")
}

func TestRoutine_Validate_EmptyItemTitle(t *testing.T) {
	routine := domain.Routine{
		Name:  "朝トレ",
		Items: []domain.RoutineItem{{Type: "workout", Title: "", DurationSec: 30}},
	}

	errors := routine.Validate()

	assert.Contains(t, errors, "item[0]: title is required")
}

func TestRoutine_Validate_InvalidDurationSec(t *testing.T) {
	routine := domain.Routine{
		Name:  "朝トレ",
		Items: []domain.RoutineItem{{Type: "workout", Title: "スクワット", DurationSec: 0}},
	}

	errors := routine.Validate()

	assert.Contains(t, errors, "item[0]: durationSec must be positive")
}

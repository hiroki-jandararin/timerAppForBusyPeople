package domain

import (
	"fmt"
	"strings"
	"time"
)

type Routine struct {
	ID                string        `json:"id"`
	Name              string        `json:"name"`
	TargetDurationSec *int          `json:"targetDurationSec,omitempty"`
	Items             []RoutineItem `json:"items"`
	CreatedAt         time.Time     `json:"createdAt"`
	UpdatedAt         time.Time     `json:"updatedAt"`
}

type RoutineItem struct {
	Id string `json:"id"`
	Type string `json:"type"`
	Title string`json:"title"`
	DurationSec int `json:"durationSec"`
	VoiceText *string `json:"voiceText,omitempty"`
}

func (r *Routine) Validate() []string {
	var errors []string
	if strings.TrimSpace(r.Name) == "" {
		errors = append(errors, "name is required")
	}
	if len(r.Items) < 1 {
		errors = append(errors, "items must have at least 1 item")
	}
	for i, item := range r.Items {
		prefix := fmt.Sprintf("item[%d]: ", i)
		if item.Type != "workout" && item.Type != "interval" {
			errors = append(errors, prefix+"type must be workout or interval")
		}
		if strings.TrimSpace(item.Title) == "" {
			errors = append(errors, prefix+"title is required")
		}
		if item.DurationSec <= 0 {
			errors = append(errors, prefix+"durationSec must be positive")
		}
	}
	return errors
}
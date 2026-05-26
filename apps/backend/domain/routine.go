package domain

import "time"

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
package domain

type Routine struct {
	ID         string    `json:"id"`
	Name 	   string `json:"name"`
	TargetDurationSec *int  `json:"targetDurationSec,omitempty"`
	Items	   []RoutineItem `json:"items"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type RoutineItem struct {
	Id string `json:"id"`
	Type string `json:"type"`
	Title string`json:"title"`
	DurationSec int `json:"durationSec"`
	VoiceText *string `json:"voiceText,omitempty"`
}
package model

const (
	StatusComplete         = "complete"
	StatusInsufficientData = "insufficient_data"
	StatusNeedsReview      = "needs_review"
)

var PersonaTags = map[string]struct{}{
	"engineer":      {},
	"product":       {},
	"design":        {},
	"gtm":           {},
	"leadership":    {},
	"founder":       {},
	"recruiting":    {},
	"manager":       {},
	"c-suite":       {},
	"finance":       {},
	"hr":            {},
	"dev-rel":       {},
	"ai-researcher": {},
	"scientist":     {},
	"other":         {},
}

type SourceFile struct {
	Sessions []RawSession `json:"sessions"`
}

type RawSession struct {
	ID          string   `json:"id"`
	SessionID   string   `json:"session_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Day         string   `json:"day"`
	Time        string   `json:"time"`
	Room        string   `json:"room"`
	Type        string   `json:"type"`
	Track       string   `json:"track"`
	Status      string   `json:"status"`
	Speakers    []string `json:"speakers"`
}

type SpeakerFile struct {
	Speakers []RawSpeaker `json:"speakers"`
}

type RawSpeaker struct {
	Name    string `json:"name"`
	Role    string `json:"role"`
	Title   string `json:"title"`
	Company string `json:"company"`
	Bio     string `json:"bio"`
}

type Speaker struct {
	Name    string `json:"name"`
	Title   string `json:"title"`
	Company string `json:"company"`
	Bio     string `json:"bio,omitempty"`
}

type Session struct {
	SessionID       string             `json:"session_id"`
	Title           string             `json:"title"`
	Description     string             `json:"description"`
	Speakers        []Speaker          `json:"speakers"`
	Track           string             `json:"track"`
	Format          string             `json:"format"`
	DurationMinutes int                `json:"duration_minutes"`
	Day             string             `json:"day"`
	SourceTime      string             `json:"source_time,omitempty"`
	Room            string             `json:"room,omitempty"`
	Transcript      *TranscriptSegment `json:"-"`
}

type TranscriptFile struct {
	Source   string              `json:"source"`
	Segments []TranscriptSegment `json:"segments"`
}

type TranscriptSegment struct {
	SessionID        string   `json:"session_id"`
	Title            string   `json:"title"`
	SpeakerNames     []string `json:"speaker_names"`
	Start            string   `json:"start"`
	End              string   `json:"end"`
	VideoURL         string   `json:"video_url,omitempty"`
	Transcript       string   `json:"transcript"`
	ExtractedSummary string   `json:"extracted_summary"`
	Confidence       float64  `json:"confidence"`
	MatchNotes       string   `json:"match_notes,omitempty"`
}

type Lesson struct {
	SessionID   string   `json:"session_id"`
	Summary     string   `json:"summary"`
	KeyLesson   string   `json:"key_lesson"`
	Evidence    []string `json:"evidence"`
	PersonaTags []string `json:"persona_tags"`
	ActionItems []string `json:"action_items"`
	Confidence  float64  `json:"confidence"`
	Status      string   `json:"status"`
}

type ObjectiveScores struct {
	TagF1                 float64 `json:"tag_f1"`
	StatusMatch           bool    `json:"status_match"`
	EvidenceSourceMatch   float64 `json:"evidence_source_match"`
	ConfidenceDelta       float64 `json:"confidence_delta"`
	ConfidenceCalibration float64 `json:"confidence_calibration"`
}

type JudgeCheck struct {
	Item          string `json:"item,omitempty"`
	GoldenConcept string `json:"golden_concept,omitempty"`
	Check         string `json:"check,omitempty"`
	Reasoning     string `json:"reasoning"`
	Pass          bool   `json:"pass"`
}

type PerItemChecks struct {
	Faithfulness     []JudgeCheck `json:"faithfulness,omitempty"`
	Coverage         []JudgeCheck `json:"coverage,omitempty"`
	Transferability  []JudgeCheck `json:"transferability,omitempty"`
	Actionability    []JudgeCheck `json:"actionability,omitempty"`
	InsufficientData []JudgeCheck `json:"insufficient_data,omitempty"`
}

type DimensionScore struct {
	Passed   int     `json:"passed"`
	Total    int     `json:"total"`
	Fraction float64 `json:"fraction"`
}

type DimensionScores struct {
	Faithfulness    DimensionScore `json:"faithfulness"`
	Coverage        DimensionScore `json:"coverage"`
	Transferability DimensionScore `json:"transferability"`
	Actionability   DimensionScore `json:"actionability"`
}

type JudgeResult struct {
	Diff                  []string          `json:"diff,omitempty"`
	PerItemChecks         PerItemChecks     `json:"per_item_checks"`
	DimensionScores       DimensionScores   `json:"dimension_scores"`
	ObjectiveScores       ObjectiveScores   `json:"objective_scores"`
	TotalScore            float64           `json:"total_score"`
	Rationale             string            `json:"rationale,omitempty"`
	RationalePerDimension map[string]string `json:"rationale_per_dimension,omitempty"`
	HardChecks            []HardCheck       `json:"hard_checks,omitempty"`
}

type HardCheck struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Reason string `json:"reason,omitempty"`
}

type StoredGeneration struct {
	SessionID     string
	PromptVersion string
	Model         string
	OutputJSON    string
	TokensUsed    int
	CreatedAt     string
}

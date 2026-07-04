package model

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func LoadSessions(sessionPath, speakerPath string) ([]Session, error) {
	sessionBytes, err := os.ReadFile(sessionPath)
	if err != nil {
		return nil, err
	}
	var source SourceFile
	if err := json.Unmarshal(sessionBytes, &source); err != nil {
		return nil, err
	}

	speakers := map[string]RawSpeaker{}
	if speakerPath != "" {
		speakerBytes, err := os.ReadFile(speakerPath)
		if err != nil {
			return nil, err
		}
		var speakerFile SpeakerFile
		if err := json.Unmarshal(speakerBytes, &speakerFile); err != nil {
			return nil, err
		}
		for _, speaker := range speakerFile.Speakers {
			speakers[speaker.Name] = speaker
		}
	}

	sessions := make([]Session, 0, len(source.Sessions))
	for _, raw := range source.Sessions {
		sessions = append(sessions, adaptSession(raw, speakers))
	}
	return sessions, nil
}

func FindSession(sessions []Session, sessionID string) (Session, bool) {
	for _, session := range sessions {
		if session.SessionID == sessionID {
			return session, true
		}
	}
	return Session{}, false
}

func ThinDescription(session Session) bool {
	return len(strings.TrimSpace(session.Description)) < 50
}

func adaptSession(raw RawSession, speakerIndex map[string]RawSpeaker) Session {
	speakers := make([]Speaker, 0, len(raw.Speakers))
	for _, name := range raw.Speakers {
		speaker := Speaker{Name: name}
		if rich, ok := speakerIndex[name]; ok {
			speaker.Title = firstNonEmpty(rich.Title, rich.Role)
			speaker.Company = rich.Company
		}
		speakers = append(speakers, speaker)
	}

	sessionID := firstNonEmpty(raw.SessionID, raw.ID)
	if sessionID == "" {
		sessionID = stableSessionID(raw)
	}

	return Session{
		SessionID:       sessionID,
		Title:           raw.Title,
		Description:     raw.Description,
		Speakers:        speakers,
		Track:           raw.Track,
		Format:          raw.Type,
		DurationMinutes: durationMinutes(raw.Time),
		Day:             raw.Day,
		SourceTime:      raw.Time,
		Room:            raw.Room,
	}
}

func stableSessionID(raw RawSession) string {
	base := strings.Join([]string{raw.Day, raw.Time, raw.Room, raw.Title}, " ")
	hash := sha1.Sum([]byte(base))
	return fmt.Sprintf("%s_%s", slug(base, 72), hex.EncodeToString(hash[:])[:8])
}

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func slug(value string, maxLen int) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = nonSlug.ReplaceAllString(value, "_")
	value = strings.Trim(value, "_")
	if value == "" {
		value = "session"
	}
	if len(value) > maxLen {
		value = strings.Trim(value[:maxLen], "_")
	}
	return value
}

func durationMinutes(value string) int {
	parts := strings.Split(value, "-")
	if len(parts) != 2 {
		return 0
	}
	start, err := parseClock(parts[0])
	if err != nil {
		return 0
	}
	end, err := parseClock(parts[1])
	if err != nil {
		return 0
	}
	if end.Before(start) {
		end = end.Add(12 * time.Hour)
	}
	return int(end.Sub(start).Minutes())
}

func parseClock(value string) (time.Time, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	layouts := []string{"3:04pm", "3pm"}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid clock %q", value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func ParseLimit(value string) (int, error) {
	if value == "" {
		return 0, nil
	}
	limit, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	if limit < 0 {
		return 0, fmt.Errorf("limit must be >= 0")
	}
	return limit, nil
}

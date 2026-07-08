import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Link,
  Stack,
  SvgIcon,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useSchedule } from "../controllers/useSchedule";
import { useFavorites } from "../controllers/useFavorites";
import {
  FAIR_DATES,
  VENUE,
  ScheduleSession,
  conflictingIds,
} from "../models/session";
import { SearchBar } from "../components/SearchBar";
import { TypeFilter } from "../components/TypeFilter";
import { TrackFilter } from "../components/TrackFilter";
import { SessionList } from "../components/SessionList";
import { MySchedule } from "../components/MySchedule";
import { SessionDetail } from "../components/SessionDetail";
import { decodeFavorites, readShareParam } from "../models/shareUrl";
import Loopcraft from "./Loopcraft";
import Homa from "./Homa";

type View = "schedule" | "loopcraft" | "homa";

function LinkedInIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
    </SvgIcon>
  );
}

function GitHubIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </SvgIcon>
  );
}

export default function App() {
  const schedule = useSchedule();
  const favorites = useFavorites();
  const [tab, setTab] = useState<string>(schedule.days[0].key);
  const [view, setView] = useState<View>("schedule");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dayTotal = schedule.allSessions.filter(
    (s) => s.day === schedule.day,
  ).length;

  const byId = useMemo(
    () => new Map(schedule.allSessions.map((session) => [session.id, session])),
    [schedule.allSessions],
  );

  const favoriteSessions = useMemo(
    () =>
      favorites.ids
        .map((id) => byId.get(id))
        .filter((session): session is ScheduleSession => Boolean(session)),
    [byId, favorites.ids],
  );

  const favoriteConflictIds = useMemo(
    () => conflictingIds(favoriteSessions),
    [favoriteSessions],
  );

  const currentList = tab === "mine" ? favoriteSessions : schedule.filtered;

  useEffect(() => {
    if (currentList.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }
    if (!currentList.some((session) => session.id === selectedId)) {
      setSelectedId(currentList[0].id);
    }
  }, [currentList, selectedId]);

  // Restore "My Schedule" from a share link (?s=<code>) on first load, but only
  // when the user has no existing saved sessions.
  const didRestoreFromShare = useRef(false);
  useEffect(() => {
    if (didRestoreFromShare.current) return;
    didRestoreFromShare.current = true;
    if (favorites.count > 0) return;
    const code = readShareParam();
    if (!code) return;
    const ids = decodeFavorites(code, schedule.allSessions);
    if (ids.length) {
      favorites.setFavorites(ids);
    }
  }, [favorites.count, favorites.setFavorites, schedule.allSessions]);

  const selectedSession = selectedId ? byId.get(selectedId) : undefined;
  const noConflict = new Set<string>();
  const selectedConflicts =
    tab === "mine" && selectedSession
      ? favoriteConflictIds.has(selectedSession.id)
      : false;

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              flexWrap="wrap"
              gap={1}
            >
              <Box>
                <Typography variant="h5" component="h1">
                  <Link
                    href="https://www.ai.engineer/worldsfair/2026"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover"
                  >
                    AI Engineer World's Fair
                  </Link>
                </Typography>
                <Typography color="text.secondary">
                  {FAIR_DATES} · {VENUE}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayTotal} sessions · favorites save to this browser
                </Typography>
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={view}
                onChange={(_e, value: View | null) =>
                  value && setView(value)
                }
                aria-label="App view"
              >
                <ToggleButton value="schedule">Schedule</ToggleButton>
                <ToggleButton value="loopcraft">Loopcraft</ToggleButton>
                <ToggleButton value="homa">Homa</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Box>

          {view === "loopcraft" && <Loopcraft />}

          {view === "homa" && <Homa />}

          {view === "schedule" && (
            <>
          <Tabs
            value={tab}
            onChange={(_e, value: string) => {
              setTab(value);
              if (value !== "mine") {
                schedule.setDay(value);
              }
            }}
            aria-label="Schedule views"
          >
            {schedule.days.map((d) => (
              <Tab key={d.key} value={d.key} label={d.shortLabel} />
            ))}
            <Tab
              value="mine"
              label={
                <Badge badgeContent={favorites.count} color="primary" showZero={false}>
                  <Box sx={{ pr: 1 }}>My Schedule</Box>
                </Badge>
              }
            />
          </Tabs>

          {tab !== "mine" && (
            <Stack spacing={1}>
              <SearchBar value={schedule.filters.query} onChange={schedule.setQuery} />
              <Stack direction={{ xs: "column", md: "row" }} gap={1} alignItems="flex-start">
                <TypeFilter
                  options={schedule.typeOptions}
                  selected={schedule.filters.types}
                  onToggle={schedule.toggleType}
                />
                <TrackFilter
                  options={schedule.trackOptions}
                  selected={schedule.filters.tracks}
                  onToggle={schedule.toggleTrack}
                  onClear={schedule.clearTracks}
                />
              </Stack>
            </Stack>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 3fr) minmax(360px, 2fr)",
              },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box>
              {tab !== "mine" && (
                <SessionList
                  timeSlots={schedule.timeSlots}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  isFavorite={favorites.isFavorite}
                  onToggleFavorite={favorites.toggleFavorite}
                  conflictIds={noConflict}
                  emptyMessage="No sessions match your filters."
                  showCount
                  totalCount={dayTotal}
                  hasActiveFilters={schedule.hasActiveFilters}
                  onClearFilters={schedule.clearFilters}
                />
              )}
              {tab === "mine" && (
                <MySchedule
                  allSessions={schedule.allSessions}
                  favoriteIds={favorites.ids}
                  isFavorite={favorites.isFavorite}
                  onToggleFavorite={favorites.toggleFavorite}
                  onClearFavorites={favorites.clearFavorites}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </Box>
            <Box sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
              <SessionDetail
                session={selectedSession}
                isFavorite={
                  selectedSession ? favorites.isFavorite(selectedSession.id) : false
                }
                onToggleFavorite={favorites.toggleFavorite}
                conflictsWithFavorite={selectedConflicts}
              />
            </Box>
          </Box>
            </>
          )}

          <Box
            component="footer"
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 2,
              color: "text.secondary",
            }}
          >
            {view === "loopcraft" ? (
              <Typography variant="body2">
                Watch the talk:{" "}
                <Link
                  href="https://www.youtube.com/watch?v=htM02KMNZnk&t=92s"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="inherit"
                  underline="hover"
                >
                  youtube.com/watch?v=htM02KMNZnk&t=92s
                </Link>
              </Typography>
            ) : (
              <Typography variant="body2">
                Built by John Pfeiffer{" "}
                <Link
                  href="https://www.linkedin.com/in/foupfeiffer"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="inherit"
                  underline="hover"
                  aria-label="John Pfeiffer on LinkedIn"
                  sx={{ display: "inline-flex", verticalAlign: "text-bottom" }}
                >
                  <LinkedInIcon />
                </Link>
                {" "}
                <Link
                  href="https://github.com/johnpfeiffer/aiewf"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="inherit"
                  underline="hover"
                  aria-label="Source code on GitHub"
                  sx={{ display: "inline-flex", verticalAlign: "text-bottom" }}
                >
                  <GitHubIcon />
                </Link>
              </Typography>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

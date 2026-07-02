import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Link,
  Stack,
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
                  AI Engineer World's Fair
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
              {schedule.hasActiveFilters && (
                <Typography variant="caption" color="text.secondary">
                  {schedule.filtered.length} of {dayTotal} sessions shown ·{" "}
                  <Link
                    component="button"
                    type="button"
                    onClick={schedule.clearFilters}
                  >
                    clear filters
                  </Link>
                </Typography>
              )}
            </Stack>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 360px" },
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
        </Stack>
      </Container>
    </Box>
  );
}


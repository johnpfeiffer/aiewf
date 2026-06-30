import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Link,
  Paper,
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
  DAY_DATE,
  DAY_LABEL,
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

type TabValue = "schedule" | "mine";
type View = "schedule" | "loopcraft";

export default function App() {
  const schedule = useSchedule();
  const favorites = useFavorites();
  const [tab, setTab] = useState<TabValue>("schedule");
  const [view, setView] = useState<View>("schedule");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const currentList = tab === "schedule" ? schedule.filtered : favoriteSessions;

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
  const totalSessions = schedule.allSessions.length;
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
                  {DAY_LABEL} · {DAY_DATE} · {VENUE}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {totalSessions} sessions · favorites save to this browser
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
              </ToggleButtonGroup>
            </Stack>
          </Box>

          {view === "loopcraft" && <Loopcraft />}

          {view === "schedule" && (
            <>
          <Paper variant="outlined" sx={{ px: 1 }}>
            <Tabs
              value={tab}
              onChange={(_event, value: TabValue) => setTab(value)}
              aria-label="Schedule views"
            >
              <Tab value="schedule" label="Full Schedule" />
              <Tab
                value="mine"
                label={
                  <Badge badgeContent={favorites.count} color="primary" showZero={false}>
                    <Box sx={{ pr: 1 }}>My Schedule</Box>
                  </Badge>
                }
              />
            </Tabs>
          </Paper>

          {tab === "schedule" && (
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
                  {schedule.filtered.length} of {totalSessions} sessions shown ·{" "}
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
              {tab === "schedule" && (
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


import { useState } from "react";
import {
  Badge,
  Box,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useSchedule } from "../controllers/useSchedule";
import { useFavorites } from "../controllers/useFavorites";
import { DAY_DATE, DAY_LABEL, VENUE } from "../models/session";
import { SearchBar } from "../components/SearchBar";
import { TypeFilter } from "../components/TypeFilter";
import { TrackFilter } from "../components/TrackFilter";
import { SessionList } from "../components/SessionList";
import { MySchedule } from "../components/MySchedule";

type TabValue = "schedule" | "mine";

export default function App() {
  const schedule = useSchedule();
  const favorites = useFavorites();
  const [tab, setTab] = useState<TabValue>("schedule");

  const noConflict = new Set<string>();
  const totalSessions = schedule.allSessions.length;

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Box>
            <Typography variant="h1" component="h1">
              AI Engineer World&rsquo;s Fair
            </Typography>
            <Typography color="text.secondary">
              {DAY_LABEL} · {DAY_DATE} · {VENUE}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalSessions} sessions · favorites save to this browser
            </Typography>
          </Box>

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
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {schedule.filtered.length} of {totalSessions} sessions shown ·{" "}
                    <button
                      type="button"
                      onClick={schedule.clearFilters}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "#2d4ba8",
                        cursor: "pointer",
                        fontSize: "inherit",
                      }}
                    >
                      clear filters
                    </button>
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {tab === "schedule" && (
            <SessionList
              timeSlots={schedule.timeSlots}
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
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
}

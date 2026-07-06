import { useRef, useState } from "react";
import { Box, IconButton, Link, Stack, Typography } from "@mui/material";
import { TranscriptData } from "../models/session";

function parseTimestamp(ts: string): number {
  const [h, m, s] = ts.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

interface TranscriptPanelProps {
  transcript: TranscriptData;
  videoUrl?: string;
}

export function TranscriptPanel({ transcript, videoUrl }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(transcript.start);

  const startSec = parseTimestamp(transcript.start);
  const endSec = parseTimestamp(transcript.end);
  const duration = endSec - startSec;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const fraction = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    setCurrentTime(formatTimestamp(startSec + duration * fraction));
  };

  const videoLinkAtTime = videoUrl
    ? videoUrl.replace(/&t=\d+s/, `&t=${Math.round(parseTimestamp(currentTime))}s`)
    : undefined;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        mt: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        pt: 1.5,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1, flexShrink: 0 }}
      >
        <Typography variant="subtitle2" component="h3">
          Transcript
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            color="text.secondary"
            fontFamily="monospace"
            sx={{ userSelect: "none" }}
          >
            {currentTime} / {transcript.end}
          </Typography>
          {videoLinkAtTime && (
            <Link
              href={videoLinkAtTime}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
            >
              Jump to video
            </Link>
          )}
          <IconButton size="small" aria-label="Scroll to top" onClick={() => scrollRef.current?.scrollTo({ top: 0 })}>
            <span style={{ fontSize: "0.9rem" }}>↑</span>
          </IconButton>
        </Stack>
      </Stack>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: "auto",
          pr: 1,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {transcript.text}
        </Typography>
      </Box>
    </Box>
  );
}

import { Alert, AlertTitle } from "@mui/material";

interface ConflictNoticeProps {
  conflictCount: number;
}

export function ConflictNotice({ conflictCount }: ConflictNoticeProps) {
  if (conflictCount <= 0) {
    return null;
  }
  return (
    <Alert severity="warning" sx={{ mb: 1 }}>
      <AlertTitle>{conflictCount} overlapping session{conflictCount === 1 ? "" : "s"}</AlertTitle>
      Some talks in My Schedule overlap in time. Conflicting cards are outlined in red.
    </Alert>
  );
}

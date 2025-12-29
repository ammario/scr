import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo } from "react";
import { Reply, Eye } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import CopyButton from "./CopyButton";

// NOTE: dayjs plugins are global; extending here ensures any page that renders
// NoteView has the plugins available.
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export type NoteViewProps = {
  destroyAfterRead: boolean;
  expiresAt: string;
  /**
   * When undefined, we show the "Read Note" confirmation UI (for destroy-after-read notes).
   */
  cleartext?: string;
  onRead?: () => void;

  file?: React.ReactNode;

  onReply?: () => void;

  /**
   * When true, skip the destroy-after-read interstitial and show the note content directly.
   * Used for previewing the note after creation.
   */
  isPreview?: boolean;
};

export default function NoteView({
  destroyAfterRead,
  expiresAt,
  cleartext,
  onRead,
  file,
  onReply,
  isPreview,
}: NoteViewProps) {
  const expiresHuman = useMemo(() => {
    try {
      // @ts-ignore dayjs-duration typing
      return dayjs.duration(dayjs(expiresAt).diff(dayjs())).humanize();
    } catch {
      return undefined;
    }
  }, [expiresAt]);

  if (destroyAfterRead && cleartext === undefined && !isPreview) {
    return (
      <div className="w-full flex flex-col gap-3">
        <Alert>
          <AlertDescription>
            This note will be permanently deleted once it&apos;s read. Are you ready
            to proceed?
          </AlertDescription>
        </Alert>
        <Button
          variant="destructive"
          data-testid="read-note-button"
          onClick={() => {
            onRead?.();
          }}
          className="gap-2 self-start"
        >
          <Eye className="h-4 w-4" />
          Read Note
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="text-sm">
        {destroyAfterRead && !isPreview ? (
          <>
            <span className="font-bold text-destructive">
              This note will only be shown once
            </span>
            <span className="text-muted-foreground">
              . Save it somewhere else before exiting the tab!
            </span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">This note</span>
            <span className="font-medium">
              {" "}expires in about{" "}
              {expiresHuman}
            </span>
            <span className="text-xs text-muted-foreground">
              {` (on ${dayjs(expiresAt).format("MMMM D, YYYY")} at ${dayjs(
                expiresAt
              ).format("h:mm A")})`}
            </span>
            <span className="text-muted-foreground">.</span>
          </>
        )}
      </p>

      {cleartext && (
        <div
          className="view-box bg-input text-foreground p-3 font-mono border border-border rounded whitespace-pre-wrap break-words w-full max-w-full overflow-x-auto text-sm"
          data-testid="note-content"
        >
          {cleartext}
        </div>
      )}

      {file}

      <div className="flex flex-wrap gap-4 pt-1 items-center">
        {cleartext && <CopyButton text={cleartext} className="gap-2" />}
        {onReply && (
          <Button variant="secondary" onClick={onReply} className="gap-2">
            <Reply className="h-4 w-4" />
            Reply
          </Button>
        )}
      </div>
    </div>
  );
}

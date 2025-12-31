import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { decryptStringPayload } from "@/util/crypto";

import type { ApiNote } from "@/src/types/api";
import NoteView from "@/src/client/components/NoteView";
import EncryptedFileCard from "@/src/client/components/EncryptedFileCard";

export default function ViewNote() {
  const { noteId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the key from the hash
  const key = location.hash.slice(1); // Remove the leading #

  const [err, setErr] = useState<string>();
  const [note, setNote] = useState<
    (ApiNote & {
      cleartext?: string;
    })
  >();

  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const retrieveNote = (peek: boolean) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "GET",
        "/api/notes/" + noteId + (peek ? "?peek=true" : ""),
        true
      );

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = event.loaded / event.total;
          setDownloadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setDownloadProgress(1);

        if (xhr.status === 404) {
          setErr("This note doesn't exist.");
          return;
        }

        if (xhr.status === 200) {
          const fetched: ApiNote = JSON.parse(xhr.responseText);
          processNote(fetched);
          return;
        }

        setErr(`HTTP error! status: ${xhr.status}\n${xhr.responseText}`);
      };

      xhr.onerror = () => {
        setErr("Failed to retrieve the note.");
        setDownloadProgress(1);
      };

      xhr.send();
    } catch (e) {
      console.log("error", e);
      setErr(JSON.stringify(e));
    }
  };

  const processNote = (note: ApiNote) => {
    let cleartext: string | undefined = undefined;

    if (note.contents) {
      cleartext = decryptStringPayload(note.contents, key);
      if (cleartext.length === 0 && (note.file_contents?.length ?? 0) === 0) {
        setErr("Decryption failed. Your URL is probably malformed.");
        return;
      }
    }

    setNote({
      ...note,
      cleartext,
    });
  };

  useEffect(() => {
    if (!noteId) return;
    retrieveNote(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);



  return (
    <div className="space-y-4 w-full max-w-3xl">
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {downloadProgress < 1 && <Progress value={downloadProgress * 100} />}

      {note && err === undefined && (
        <NoteView
          destroyAfterRead={note.destroy_after_read}
          expiresAt={note.expires_at}
          cleartext={note.cleartext}
          onRead={() => retrieveNote(false)}
          file={
            note.file_name && note.file_contents ? (
              <EncryptedFileCard note={note} decryptionKey={key} />
            ) : undefined
          }
          onReply={() => {
            navigate("/");
          }}
        />
      )}
    </div>
  );
}

import { css } from "@emotion/react";
import { CopyAll, Reply, Visibility } from "@mui/icons-material";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiNote } from ".";
import { Button } from "../components/Button";
import { ErrorBox } from "../components/ErrorBox";
import {
  calculateChecksum,
  decryptBuffer,
  decryptStringPayload,
} from "../util/crypto";
import { borderRadius, colorMixins, colors } from "../util/theme";
import { FlexColumn } from "../components/Flex";
import { filesize } from "filesize";
import ProgressBar from "../components/ProgressBar";
var duration = require("dayjs/plugin/duration");
var relativeTime = require("dayjs/plugin/relativeTime");

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ViewFile = ({
  file: note,
  decryptionKey,
}: {
  file: apiNote;
  decryptionKey: string;
}) => {
  if (!note.file_name) return null;

  const handleDownload = async () => {
    try {
      // Decrypt the file contents
      const decryptedContents = await decryptBuffer(
        new Uint8Array(Buffer.from(note.file_contents, "base64")),
        decryptionKey
      );

      console.log("file_contents_length", note.file_contents.length);
      console.log("decrypt_length", decryptedContents.byteLength);
      // Create a Blob from the decrypted contents
      const blob = new Blob([decryptedContents], {
        type: "application/octet-stream",
      });

      // Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element
      const a = document.createElement("a");
      a.href = url;
      a.download = note.file_name;

      // Trigger the download
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to decrypt file contents:", error);
      alert(
        "Failed to decrypt file contents. The decryption key might be incorrect."
      );
    }
  };

  return (
    <div
      css={css`
        margin-top: 10px;
        padding: 10px;
        background-color: ${colorMixins.selectBackground};
        border: 1px solid ${colors.accent};
        border-radius: ${borderRadius};
      `}
    >
      <span
        css={css`
          margin-right: 10px;
        `}
      >
        {note.file_name} ({filesize(note.file_contents.length)})
      </span>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleDownload();
        }}
        css={css`
          color: ${colors.accent};
          text-decoration: none;
          &:hover {
            text-decoration: underline;
            color: ${colors.accentLight};
          }
        `}
      >
        Download
      </a>
    </div>
  );
};

export default function ViewNote() {
  const router = useRouter();

  const pathParts = router.asPath.split("#");
  const objectID = pathParts[0];
  const key = pathParts[1];

  const [err, setErr] = useState<string>();
  const [note, setNote] = useState<
    apiNote & {
      cleartext?: string;
    }
  >();

  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const retrieveNote = (peek: boolean) => {
    try {
      console.log("retrieving", objectID, key);
      const xhr = new XMLHttpRequest();
      xhr.open(
        "GET",
        "/api/notes" + objectID + (peek ? "?peek=true" : ""),
        true
      );

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = event.loaded / event.total;
          setDownloadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 404) {
          setErr("This note doesn't exist.");
          return;
        }
        if (xhr.status === 200) {
          const note: apiNote = JSON.parse(xhr.responseText);
          processNote(note);
        } else {
          setErr(`HTTP error! status: ${xhr.status}\n${xhr.responseText}`);
        }
        setDownloadProgress(1); // Reset progress
      };

      xhr.onerror = () => {
        setErr("Failed to retrieve the note.");
        setDownloadProgress(1); // Reset progress
      };

      xhr.send();
    } catch (e) {
      console.log("error", e);
      setErr(JSON.stringify(e));
    }
  };

  const processNote = async (note: apiNote) => {
    var t = undefined;
    if (note.contents) {
      const cipherChecksum = await calculateChecksum(note.contents);
      console.log("cipher checksum", cipherChecksum);
      t = decryptStringPayload(note.contents, key);
      if (t.length == 0 && note.file_contents.length == 0) {
        setErr("Decryption failed. Your URL is probably malformed.");
        return;
      }
      console.log("got cleartext", t);
    }
    setNote({
      ...note,
      cleartext: t,
    });
  };

  useEffect(() => {
    // For whatever reason, the path starts as "..."
    if (objectID.indexOf("...") >= 0) {
      return;
    }
    retrieveNote(true);
  }, [objectID]);

  return (
    <div>
      {err && <ErrorBox>{err}</ErrorBox>}
      {downloadProgress < 1 && <ProgressBar progress={downloadProgress} />}
      {note && err === undefined && (
        <FlexColumn
          css={css`
            width: 100%; // Add this line
          `}
        >
          {note.cleartext !== undefined ? (
            <>
              <p>
                {note.destroy_after_read ? (
                  <>
                    <b>This note will only be shown once</b>. Save it somewhere
                    else before exiting the tab!
                  </>
                ) : (
                  <>
                    This note expires in
                    {" " +
                      dayjs
                        // @ts-ignore
                        .duration(dayjs(note.expires_at).diff(dayjs()))
                        .humanize()}
                    .
                  </>
                )}
              </p>

              {note.cleartext && (
                <div
                  className="view-box"
                  css={css`
                    background-color: ${colorMixins.textareaBackground};
                    color: var(--foreground);
                    padding: 10px;
                    font-family: "Berkeley Mono", monospace;
                    border: 2px dashed var(--accent);
                    border-radius: ${borderRadius};
                    white-space: pre-wrap;
                    word-break: break-word;
                    box-sizing: border-box;
                    width: 100%;
                    max-width: 100%; // Add this line
                    overflow-x: auto; // Add this line
                  `}
                >
                  {note.cleartext}
                </div>
              )}
              {note.file_name && <ViewFile file={note} decryptionKey={key} />}
              <div
                css={css`
                  gap: 15px;
                  display: flex;
                  flex-wrap: wrap;
                  padding-top: 0.25em;
                  & button {
                    min-width: 100px;
                  }
                `}
              >
                {note.cleartext && (
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(note.cleartext!);
                      setCopySuccess(true);
                    }}
                  >
                    <CopyAll />
                    Copy
                  </Button>
                )}
                <Button
                  css={css``}
                  onClick={() => {
                    router.push("/");
                  }}
                >
                  <Reply />
                  Reply
                </Button>
                {copySuccess && (
                  <div className="success-box">
                    Successfully copied note to clipboard.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
              `}
            >
              <p>
                This note will be permanently deleted once it's read. Are you
                ready to proceed?
              </p>
              <button
                css={css`
                  border: none;
                  padding: 5px 5px;
                  border-radius: 5px;
                  width: 200px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;

                  background-color: var(--warning);
                  color: var(--background);
                  margin-top: 8px;
                  margin-bottom: 4px;

                  :hover {
                    background-color: var(--accent-light);
                    color: var(--background);
                  }

                  svg {
                    color: inherit;
                    margin-right: 2px;
                  }
                `}
                data-testid="read-note-button"
                className="read-button"
                onClick={() => {
                  retrieveNote(false);
                }}
              >
                <Visibility />
                Read Note
              </button>
            </div>
          )}
        </FlexColumn>
      )}
    </div>
  );
}

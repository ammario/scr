import { css } from "@emotion/react";
import { CopyAll, Download, Reply, Visibility } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
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
import dynamic from "next/dynamic";
import Head from "next/head";

var duration = require("dayjs/plugin/duration");
var relativeTime = require("dayjs/plugin/relativeTime");

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

const estimateBase64Length = (base64Length: number) => {
  // Each base64 character is 6 bits, so we need to multiply by 6/8 to get the
  // number of bytes.
  return (base64Length * 6) / 8;
};

const DynamicDisplayFile = dynamic(() => import("../components/DisplayFile"), {
  ssr: false,
});

const FileCard = ({
  file: note,
  decryptionKey,
}: {
  file: apiNote;
  decryptionKey: string;
}) => {
  if (!note.file_name) return null;

  const [decryptedChecksum, setDecryptedChecksum] = useState<
    string | undefined
  >(undefined);
  const [decryptedContents, setDecryptedContents] = useState<
    Uint8Array | undefined
  >(undefined);
  const [decryptionError, setDecryptionError] = useState<string | undefined>(
    undefined
  );

  const [decryptedFileName, setDecryptedFileName] = useState<string>(
    note.file_name
  );

  useMemo(() => {
    try {
      const dec = decryptStringPayload(note.file_name, decryptionKey);
      if (dec.length > 0) {
        setDecryptedFileName(dec);
      }
    } catch (error) {
      // If decryption fails, its probably a legacy note without an encrypted
      // file name, do nothing.
      // I can remove this in on Oct 7th 2024.
    }
  }, [note.file_name, decryptionKey]);

  useEffect(() => {
    const decryptFile = async () => {
      try {
        const decrypted = await decryptBuffer(
          new Uint8Array(Buffer.from(note.file_contents, "base64")),
          decryptionKey
        );
        setDecryptedContents(decrypted);
        setDecryptedChecksum(await calculateChecksum(new Blob([decrypted])));
      } catch (error) {
        console.error("Failed to decrypt file contents:", error);
        setDecryptionError(
          "Failed to decrypt file contents. The decryption key might be incorrect."
        );
      }
    };

    decryptFile();
  }, [note.file_contents, decryptionKey]);

  const handleDownload = async (contents: Uint8Array) => {
    // Create a Blob from the decrypted contents
    const blob = new Blob([contents], {
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
  };

  return (
    <div
      className="view-file"
      data-testid="view-file"
      css={css`
        padding: 10px;
        background-color: ${colorMixins.selectBackground};
        border: 1px solid ${colors.accent};
        border-radius: ${borderRadius};
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      `}
    >
      <div>
        <span
          css={css`
            margin-right: 4px;
          `}
        >
          {decryptedFileName}
        </span>
        <span
          css={css`
            font-size: 0.8em;
            font-family: var(--font-mono);
            color: ${colors.foregroundDark};
          `}
        >
          ({filesize(estimateBase64Length(note.file_contents.length))})
        </span>
        {decryptionError && <ErrorBox>{decryptionError}</ErrorBox>}

        {decryptedChecksum && (
          <div
            css={css`
              font-size: 10px;
              color: ${colors.foregroundDark};
              font-family: var(--font-mono);
              word-break: break-all;
            `}
          >
            sha256: {decryptedChecksum}
          </div>
        )}
      </div>
      <div>
        {decryptedContents !== undefined ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleDownload(decryptedContents);
            }}
            css={css`
              font-size: 15px;
              color: ${colors.accent};
              text-decoration: none;
              display: flex;
              align-items: center;
              &:hover {
                text-decoration: underline;
                color: ${colors.accentLight};
              }
            `}
          >
            <Download
              css={css`
                margin-right: 4px;
                font-size: 1em;
              `}
            />
            Download
          </a>
        ) : (
          <div>Decrypting...</div>
        )}
      </div>
      {decryptedContents && (
        <DynamicDisplayFile file={decryptedContents} name={decryptedFileName} />
      )}
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
          console.log("percentComplete", percentComplete);
          setDownloadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setDownloadProgress(1); // Reset progress
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
    <>
      <Head>
        <title>a secure note</title>
      </Head>
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
                      <b>This note will only be shown once</b>. Save it
                      somewhere else before exiting the tab!
                    </>
                  ) : (
                    <span>
                      This note
                      <span
                        css={css`
                          font-weight: bold;
                        `}
                      >
                        {" "}
                        expires in about{" "}
                        {dayjs
                          // @ts-ignore
                          .duration(dayjs(note.expires_at).diff(dayjs()))
                          .humanize()}
                      </span>
                      <span
                        css={css`
                          font-size: 0.9em;
                          color: ${colors.foregroundDark};
                        `}
                      >
                        {` (on ${dayjs(note.expires_at).format(
                          "MMMM D, YYYY"
                        )} at ${dayjs(note.expires_at).format("h:mm A")})`}
                      </span>
                      .
                    </span>
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
                {note.file_name && <FileCard file={note} decryptionKey={key} />}
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
    </>
  );
}

import { css } from "@emotion/react";
import { CopyAll, Reply, Visibility } from "@mui/icons-material";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiNote } from ".";
import { Button } from "../components/Button";
import { ErrorBox } from "../components/ErrorBox";
import { decryptPayload } from "../util/crypto";
import { borderRadius, colorMixins } from "../util/theme";
import { FlexColumn } from "../components/Flex";
var duration = require("dayjs/plugin/duration");
var relativeTime = require("dayjs/plugin/relativeTime");

dayjs.extend(duration);
dayjs.extend(relativeTime);

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

  const retrieveNote = (peek: boolean) => {
    try {
      console.log("retrieving", objectID, key);
      fetch("/api/notes" + objectID + (peek ? "?peek=true" : ""), {
        method: "GET",
      }).then((resp) => {
        if (resp.status == 404) {
          setErr("This note doesn't exist.");
          return;
        }
        resp.json().then((note: apiNote) => {
          var t = undefined;
          if (note.contents) {
            t = Buffer.from(
              decryptPayload(note.contents, key),
              "hex"
            ).toString();
            if (t.length == 0) {
              setErr("Decryption failed. Your URL is probably malformed.");
              return;
            }
            console.log("got cleartext", t);
          }
          setNote({
            ...note,
            cleartext: t,
          });
        });
      });
    } catch (e) {
      console.log("error", e);
      setErr(JSON.stringify(e));
    }
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
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(note.cleartext!);
                    setCopySuccess(true);
                  }}
                >
                  <CopyAll />
                  Copy
                </Button>
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

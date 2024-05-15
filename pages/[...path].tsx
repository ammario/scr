import { css } from "@emotion/react";
import { CopyAll, Reply } from "@mui/icons-material";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiNote } from ".";
import { Button } from "../components/Button";
import { ErrorBox } from "../components/ErrorBox";
import { decryptPayload } from "../util/crypto";
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
    <>
      {err && <ErrorBox>{err}</ErrorBox>}
      {note && err === undefined && (
        <>
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

              <div className="view-box">{note.cleartext}</div>
              <div
                css={css`
                  gap: 15px;
                  display: flex;
                  flex-wrap: wrap;
                  padding-top: 1em;
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
            <>
              This note will be permanently deleted once it's read. Are you
              ready to proceed?
              <br />
              <button
                className="flex items-center read-button"
                onClick={() => {
                  retrieveNote(false);
                }}
              >
                Read & Destroy note
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

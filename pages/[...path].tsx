import { decryptPayload } from "@/util/crypto";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Home, { apiNote } from ".";
var duration = require("dayjs/plugin/duration");
var relativeTime = require("dayjs/plugin/relativeTime");
import dayjs from "dayjs";
import { CopyAll } from "@mui/icons-material";

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
          setErr("There's nothing here. Good luck on your next adventure.");
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
      {err && <div className="error-box">{err}</div>}
      {note && err === undefined && (
        <>
          {note.cleartext !== undefined ? (
            <>
              <p>
                {note.destroy_after_read ? (
                  <>
                    This note will only be shown <b>once</b>. Save it somewhere
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
              <div className={"flex justify-between py-4"}>
                <button
                  className="flex items-center create-button black-button"
                  onClick={() => {
                    navigator.clipboard.writeText(note.cleartext!);
                    setCopySuccess(true);
                  }}
                >
                  <CopyAll />
                  Copy
                </button>
              </div>
              {copySuccess && (
                <div className="success-box">
                  Successfully copied note to clipbard.
                </div>
              )}
            </>
          ) : (
            <>
              After you read this note, there will be zero trace that it ever
              existed. Are you ready for this commitment?
              <button
                className="flex items-center create-button read-button"
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

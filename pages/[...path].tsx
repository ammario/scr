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
      cleartext: string;
    }
  >();

  useEffect(() => {
    // For whatever reason, the path starts as "..."
    if (objectID.indexOf("...") >= 0) {
      return;
    }
    try {
      console.log("retrieving", objectID, key);
      fetch("/api/notes" + objectID, {
        method: "GET",
      }).then((resp) => {
        if (resp.status == 404) {
          setErr("This note has vanished into the abyss...");
          return;
        }
        resp.json().then((note: apiNote) => {
          const t = Buffer.from(
            decryptPayload(note.contents, key),
            "hex"
          ).toString();
          if (t.length == 0) {
            setErr("Decryption failed. Your URL is probably malformed.");
            return;
          }
          console.log("got cleartext", t);
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
  }, [objectID]);
  return (
    <>
      {err && <div className="error-box">{err}</div>}
      {note && (
        <>
          <p>
            This note expires in
            {" " +
              // @ts-ignore
              dayjs.duration(dayjs(note.expires_at).diff(dayjs())).humanize()}
            .
          </p>
          <div className="view-box">{note.cleartext}</div>
          <div className={"flex justify-between py-4"}>
            <button
              className="flex items-center create-button black-button"
              onClick={() => {
                navigator.clipboard.writeText(note.cleartext);
              }}
            >
              <CopyAll />
              Copy
            </button>
          </div>
        </>
      )}
    </>
  );
}

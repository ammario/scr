import { CopyAll } from "@mui/icons-material";
import dayjs from "dayjs";
import { useState } from "react";
import { ErrorBox } from "../components/ErrorBox";
import { encryptPayload, generateUserKey } from "../util/crypto";
import { css } from "@emotion/react";
import { colors } from "../util/theme";
import { Button } from "../components/Button";

export interface apiNote {
  contents: string;
  destroy_after_read: boolean;
  expires_at: string;
}

interface createdNote {
  id: string;
  key: string;
}

function createdNoteURL(o: createdNote): string {
  return location.origin + "/" + o.id + "#" + o.key;
}

export default function Home() {
  const [cleartext, setCleartext] = useState<string>("");
  const [destroyAfterRead, setDestroyAfterRead] = useState<boolean>(true);
  const [expiresAfterHours, setExpiresAfterHours] = useState<number>(24);

  const [createdNote, setCreatedObjectID] = useState<createdNote>();
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string>();

  const handleSubmit = () => {
    if (cleartext.length == 0) {
      setCreateErrorMessage("Empty notes are not allowed.");
      return;
    }
    const key = generateUserKey();
    console.log(key);
    const ciphertext = encryptPayload(cleartext, key);

    const request: apiNote = {
      contents: ciphertext,
      destroy_after_read: destroyAfterRead,
      expires_at: dayjs().add(expiresAfterHours, "hours").toISOString(),
    };

    fetch("/api/notes", {
      method: "POST",
      body: JSON.stringify(request),
    })
      .catch((r) => {
        alert(r);
      })
      .then((resp) => {
        if (resp) {
          resp.text().then((t) => {
            setCreatedObjectID({
              id: t,
              key: key,
            });
            setCreateErrorMessage(undefined);
            console.log("created", t);
          });
        }
      });
  };

  return (
    <div
      css={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25em",
      }}
    >
      {createErrorMessage !== undefined ? (
        <ErrorBox>{createErrorMessage}</ErrorBox>
      ) : null}
      {createdNote === undefined ? (
        <form
          noValidate
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.keyCode === 13) {
              handleSubmit();
            }
          }}
        >
          <textarea
            id="secret-input"
            className="secret-text"
            placeholder="Your private note goes here. Tip: Press Ctrl+Enter when you're done."
            value={cleartext}
            onChange={(e) => setCleartext(e.target.value)}
            style={{
              width: "100%",
              minHeight: "160px",
              boxSizing: "border-box",
              padding: "8px",
              border: "1px solid #ccc",
              resize: "vertical",
            }}
          />
          <div
            css={css`
              font-size: 12px;
              display: flex;
              flex-direction: row;
              gap: 1em;
              align-items: center;

              & .inputArea {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
              }
            `}
          >
            <Button
              css={css`
                background-color: ${colors.primaryBlue};
                color: white;
                min-width: 100px;
                min-height: 30px;
              `}
              color="success"
            >
              Create
            </Button>

            {/* Spacer */}
            <div
              css={css`
                flex-grow: 1;
              `}
            ></div>
            <div className="inputArea">
              <label htmlFor="expires-after">Expires after</label>
              <select
                id="expires-after"
                value={expiresAfterHours}
                onChange={(e) => setExpiresAfterHours(Number(e.target.value))}
              >
                <option value={1}>1 hour</option>
                <option value={8}>8 hours</option>
                <option value={24}>24 hours</option>
                <option value={24 * 3}>3 days</option>
                <option value={24 * 7}>7 days</option>
                <option value={24 * 30}>30 days</option>
              </select>
            </div>
            <div className="inputArea">
              <label
                css={css`
                  margin-left: 3px;
                `}
                htmlFor="destroy-after-read"
              >
                Destroy after read
              </label>
              <input
                type="checkbox"
                id="destroy-after-read"
                onChange={() => setDestroyAfterRead(!destroyAfterRead)}
                defaultChecked={destroyAfterRead}
                value={destroyAfterRead.toString()}
              />
            </div>
          </div>
        </form>
      ) : (
        <>
          <p>
            Your note has been created. Share the following URL with the
            intended recipient.
          </p>
          <textarea
            id="copy-url-box"
            readOnly
            rows={1}
            onMouseEnter={(e) => {
              // @ts-ignore
              e.target.select();
            }}
            onMouseLeave={() => {
              const sel = window.getSelection();
              if (sel) {
                sel.empty();
              }
            }}
            value={createdNoteURL(createdNote)}
            css={css`
              width: 100%;
              min-height: 40px;
              box-sizing: border-box;
            `}
          ></textarea>
          <div
            css={css`
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
            `}
          >
            <button
              css={css`
                background-color: ${colors.primaryBlue};
                color: white;
                display: flex;
                align-items: center;
              `}
              onClick={() => {
                navigator.clipboard.writeText(createdNoteURL(createdNote));
                setCopySuccess(true);
              }}
            >
              <CopyAll />
              Copy URL
            </button>

            {copySuccess && (
              <div className="success-box">
                Successfully copied URL to clipboard.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

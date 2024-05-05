import { ErrorBox } from "../components/ErrorBox";
import { encryptPayload, generateUserKey } from "../util/crypto";
import { CopyAll, LockClock } from "@mui/icons-material";
import { MenuItem } from "@mui/material";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";
import { css } from "@emotion/react";
import { useState } from "react";

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
  const [payload, setPayload] = useState<string>("");
  const [destroyAfterRead, setDestroyAfterRead] = useState<boolean>(true);
  const [expiresAfterHours, setExpiresAfterHours] = useState<number>(24);

  const [createdNote, setCreatedObjectID] = useState<createdNote>();
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string>();

  const handleSubmit = () => {
    if (payload.length == 0) {
      setCreateErrorMessage("Empty notes are not allowed.");
      return;
    }
    const key = generateUserKey();
    console.log(key);
    const ciphertext = encryptPayload(payload, key);

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
    <>
      {createErrorMessage !== undefined ? (
        <ErrorBox>{createErrorMessage}</ErrorBox>
      ) : null}
      {createdNote === undefined ? (
        <Box
          component="form"
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
          <TextField
            id="secret-input"
            className="secret-text"
            fullWidth
            placeholder={`Your private note goes here.

Tip: Press Ctrl+Enter when you're done.`}
            minRows={8}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            multiline
          />
          <div
            className="flex create-options"
            css={css`
              margin-top: 1em;
              font-size: 12px;
            `}
          >
            <FormControlLabel
              className="w-1/2"
              label="Destroy after read"
              control={
                <Checkbox
                  onChange={() => setDestroyAfterRead(!destroyAfterRead)}
                  defaultChecked={destroyAfterRead}
                  value={destroyAfterRead}
                />
              }
            />

            <FormControl className="w-1/2">
              <InputLabel id="demo-simple-select-label">
                Expires after
              </InputLabel>
              <Select
                id="demo-simple-select"
                value={expiresAfterHours}
                onChange={(e) => setExpiresAfterHours(e.target.value as number)}
                label="Expires after"
              >
                <MenuItem value={1}>1 hour</MenuItem>
                <MenuItem value={8}>8 hours</MenuItem>
                <MenuItem value={24}>24 hours</MenuItem>
                <MenuItem value={24 * 3}>3 days</MenuItem>
                <MenuItem value={24 * 7}>7 days</MenuItem>
                <MenuItem value={24 * 30}>30 days</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className={"flex justify-between py-4"}>
            <button
              className="flex items-center create-button black-button"
              color="success"
            >
              <LockClock />
              Create
            </button>
          </div>
        </Box>
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
            onMouseLeave={(e) => {
              // @ts-ignore
              const sel = window.getSelection();
              if (sel) {
                sel.empty();
              }
            }}
            value={createdNoteURL(createdNote)}
          ></textarea>
          <div className={"flex justify-between py-4"}>
            <button
              className="flex items-center create-button black-button"
              onClick={() => {
                navigator.clipboard.writeText(createdNoteURL(createdNote));
                setCopySuccess(true);
              }}
            >
              <CopyAll />
              Copy URL
            </button>
          </div>
          {copySuccess && (
            <div className="success-box">
              Successfully copied URL to clipboard.
            </div>
          )}
        </>
      )}
    </>
  );
}

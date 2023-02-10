import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { CopyAll, Lock, LockClock } from "@mui/icons-material";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import { FormHelperText, Input, MenuItem } from "@mui/material";
import { useState } from "react";
import { encryptPayload, generateUserKey } from "@/util/crypto";
import dayjs from "dayjs";

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

  const handleSubmit = () => {
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
            console.log("created", t);
          });
        }
      });
  };

  return (
    <>
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
            placeholder={`Your deepest, darkest secrets go here.

Tip: Press Ctrl+Enter when you're done.`}
            minRows={8}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            multiline
          />
          <div className="flex options">
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

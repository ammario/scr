import { css } from "@emotion/react";
import { AttachFile, CopyAll } from "@mui/icons-material";
import dayjs from "dayjs";
import { filesize } from "filesize";
import { useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { ErrorBox } from "../components/ErrorBox";
import { FlexColumn } from "../components/Flex";
import ProgressBar from "../components/ProgressBar";
import {
  encryptBuffer,
  encryptStringPayload,
  generateUserKey,
} from "../util/crypto";
import { colorMixins, colors } from "../util/theme";

export interface apiNote {
  contents: string;
  file_name: string;
  file_contents: string;
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

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<string | undefined>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
      setFileSize(filesize(event.target.files[0].size)); // This will return a human-readable string
    }
  };

  const key = useMemo(() => generateUserKey(), []);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleSubmit = async () => {
    if (cleartext.length == 0 && file == null) {
      setCreateErrorMessage("Empty notes are not allowed.");
      return;
    }
    console.log(key);
    const ciphertext = encryptStringPayload(cleartext, key);

    const formData = new FormData();
    formData.append("contents", ciphertext);
    formData.append("version", "1");
    formData.append("destroy_after_read", destroyAfterRead.toString());
    formData.append(
      "expires_at",
      dayjs().add(expiresAfterHours, "hours").toISOString()
    );

    if (file) {
      const buf = await file.arrayBuffer();
      const fileEncrypted = encryptBuffer(buf, key);
      formData.append("file_contents", new Blob([fileEncrypted]), file.name);
      formData.append("file_name", file.name);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/notes", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = event.loaded / event.total;
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201 || xhr.status === 200) {
        const id = xhr.responseText;
        setCreatedObjectID({
          id: id,
          key: key,
        });
        setCreateErrorMessage(undefined);
        console.log("created", id);
      } else {
        setCreateErrorMessage(
          `HTTP error! status: ${xhr.status}\n${xhr.responseText}`
        );
      }
      setUploadProgress(0); // Reset progress
    };

    xhr.onerror = () => {
      setCreateErrorMessage("Upload failed");
      setUploadProgress(0); // Reset progress
    };

    xhr.send(formData);
  };

  return (
    <FlexColumn
      css={css`
        max-width: 800px;
        width: 100%;
        box-sizing: border-box;
      `}
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
            if (e.ctrlKey && e.key === "Enter") {
              handleSubmit();
            }
          }}
          css={css`
            width: 100%;
            box-sizing: border-box;
          `}
        >
          <FlexColumn>
            <textarea
              id="secret-input"
              className="secret-text"
              placeholder="Your private note goes here. Tip: Press Ctrl+Enter when you're done."
              value={cleartext}
              onChange={(e) => setCleartext(e.target.value)}
              css={css`
                width: 100%;
                max-width: 800px;
                min-height: 160px;
                box-sizing: border-box;
                padding: 8px;
                resize: vertical;
                display: block; // Ensure it takes up full width

                :focus {
                  outline: 1px solid ${colors.accent};
                }
              `}
            />
            <div
              css={css`
                font-size: 12px;
                display: flex;
                flex-direction: row;
                gap: 1em;
                align-items: center;
                width: 100%;

                & .inputArea {
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                }
              `}
            >
              <Button
                css={css`
                  background-color: ${colors.accent};
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
                <label htmlFor="file-input">Attach file</label>
                <div
                  css={css`
                    position: relative;
                    overflow: hidden;
                    display: inline-block;
                  `}
                >
                  <button
                    type="button"
                    css={css`
                      font-size: 12px;
                      padding: 2px 4px;
                      background-color: ${colorMixins.selectBackground};
                      color: ${colors.foreground};
                      border: 1px solid ${colors.accent};
                      border-radius: 4px;
                      margin-bottom: 0px;
                      margin-top: 0px;
                      min-height: 23px;
                      min-width: 80px;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                    `}
                  >
                    <AttachFile
                      fontSize="small"
                      css={css`
                        font-size: 12px !important;
                      `}
                    />
                    <span>
                      {fileName ? fileName : "Choose"}
                      {fileSize ? ` (${fileSize})` : ""}
                    </span>
                  </button>
                  <input
                    type="file"
                    id="file-input"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    css={css`
                      font-size: 100px;
                      position: absolute;
                      left: 0;
                      top: 0;
                      opacity: 0;
                      cursor: pointer;
                    `}
                  />
                </div>
              </div>
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
            {uploadProgress > 0 && uploadProgress < 100 && (
              <ProgressBar progress={uploadProgress} />
            )}
          </FlexColumn>
        </form>
      ) : (
        <>
          <p>
            Your note has been created. Share the following URL with the
            intended recipient.
          </p>
          <textarea
            readOnly
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
            rows={1}
            value={createdNoteURL(createdNote)}
            css={css`
              width: 100%;
              max-width: 800px;
              min-height: 40px;
              box-sizing: border-box;
              background-color: var(--accent-dark);
              color: var(--foreground);
              padding: 10px;
              resize: none;
              font-weight: bold;
              border: 2px dotted var(--accent);
              word-break: break-all;
              overflow-wrap: break-word;
              text-align: left;
              font-family: monospace;
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
                background-color: ${colors.accent};
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
    </FlexColumn>
  );
}

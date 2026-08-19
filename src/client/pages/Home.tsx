import dayjs from "dayjs";
import { filesize } from "filesize";
import { Paperclip, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import NoteView from "@/src/client/components/NoteView";
import DecryptedFileCard from "@/src/client/components/DecryptedFileCard";
import CreatedNoteBox from "@/src/client/components/CreatedNoteBox";
import {
  encryptBuffer,
  encryptStringPayload,
  generateUserKey,
} from "@/util/crypto";

interface createdNote {
  id: string;
  key: string;
}

function createdNoteURL(o: createdNote): string {
  if (typeof window === "undefined") return "";
  return window.location.origin + "/" + o.id + "#" + o.key;
}

interface FileInputProps {
  onFileChange: (file: File | null) => void;
}

// maxFileSize is 90MB because cloudflare has a 100MB free limit.
const maxFileSize = 90e6;

// maxUploadDuration returns the maximum duration in hours for a file upload based on its size.
const maxUploadDuration = (size: number): number => {
  const minDuration = 1; // 1 day
  const maxDuration = 30; // 30 days

  if (size === 0) {
    return maxDuration * 24;
  }

  // Calculate the duration based on the inverse relationship
  const duration = Math.floor(maxFileSize / size);

  // Clamp the result between minDuration and maxDuration
  return Math.min(Math.max(duration, minDuration), maxDuration) * 24;
};

function FileInput({ onFileChange }: FileInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | undefined>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length == 0) {
      return;
    }
    const selectedFile = event.target.files[0];
    if (selectedFile.size > maxFileSize) {
      alert(`File size exceeds the maximum limit of ${filesize(maxFileSize)}`);
      return;
    }
    setFileName(selectedFile.name);
    onFileChange(selectedFile);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "h-8 border rounded px-2",
              "cursor-pointer transition-colors",
              "flex items-center gap-1.5",
              fileName 
                ? "bg-accent/20 border-accent text-foreground" 
                : "bg-input border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
            {fileName && (
              <span className="text-xs truncate max-w-[100px]">
                {fileName}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {fileName ? fileName : "Attach file"}
        </TooltipContent>
      </Tooltip>
      <input
        type="file"
        id="file-input"
        data-testid="file-input"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
    </TooltipProvider>
  );
}

export default function Home() {
  const [cleartext, setCleartext] = useState<string>("");
  const [destroyAfterRead, setDestroyAfterRead] = useState<boolean>(false);
  const [expiresAfterHours, setExpiresAfterHours] = useState<number>(24);

  const [createdExpiresAt, setCreatedExpiresAt] = useState<string>();
  const [createdNote, setCreatedObjectID] = useState<createdNote>();
  const [createErrorMessage, setCreateErrorMessage] = useState<string>();

  const [file, setFile] = useState<File | null>(null);
  const [maxAllowedDuration, setMaxAllowedDuration] = useState<number>(
    maxUploadDuration(0)
  ); // Default to 30 days

  const key = useMemo(() => generateUserKey(), []);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      const maxDuration = maxUploadDuration(selectedFile.size);
      setMaxAllowedDuration(maxDuration);
      setExpiresAfterHours(Math.min(expiresAfterHours, maxDuration));
    } else {
      setMaxAllowedDuration(maxUploadDuration(0)); // Reset to 30 days if no file is selected
    }
  };

  const handleSubmit = async () => {
    if (cleartext.length == 0 && file == null) {
      setCreateErrorMessage("Empty notes are not allowed.");
      return;
    }
    const ciphertext = await encryptStringPayload(cleartext, key);

    const formData = new FormData();
    formData.append("contents", ciphertext);
    formData.append("version", "2");
    formData.append("destroy_after_read", destroyAfterRead.toString());
    const expiresAt = dayjs().add(expiresAfterHours, "hours").toISOString();
    setCreatedExpiresAt(expiresAt);
    formData.append("expires_at", expiresAt);

    if (file) {
      const buf = await file.arrayBuffer();
      const fileEncrypted = await encryptBuffer(new Uint8Array(buf), key);
      formData.append("file_contents", new Blob([fileEncrypted as BlobPart]), file.name);
      formData.append(
        "file_name",
        await encryptStringPayload(file.name, key, "filename")
      );
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

  const expirationOptions = [1, 8, 24, 24 * 3, 24 * 7, maxAllowedDuration]
    .filter(
      (hours, index, self) =>
        hours <= maxAllowedDuration && self.indexOf(hours) === index
    )
    .sort((a, b) => a - b);

  const formatHours = (hours: number) => {
    if (hours === 1) return "1 hour";
    if (hours <= 24) return `${hours} hours`;
    if (hours <= 24 * 30) return `${Math.round(hours / 24)} days`;
    return "30 days";
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl">
      {createErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{createErrorMessage}</AlertDescription>
        </Alert>
      )}
      
      {createdNote === undefined ? (
        <form
          noValidate
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              handleSubmit();
            }
          }}
          className="w-full space-y-3"
        >
          <Textarea
            id="secret-input"
            placeholder="Your private note goes here. Tip: Press Ctrl+Enter when you're done."
            value={cleartext}
            onChange={(e) => setCleartext(e.target.value)}
            className="min-h-[160px] text-sm"
          />

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    id="destroy-after-read"
                    onClick={() => setDestroyAfterRead(!destroyAfterRead)}
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded border transition-colors",
                      destroyAfterRead
                        ? "bg-destructive/20 border-destructive text-destructive"
                        : "bg-input border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
                    )}
                  >
                    {destroyAfterRead ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {destroyAfterRead ? "Will destroy after reading" : "Destroy after read (off)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <FileInput onFileChange={handleFileChange} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select
                      value={expiresAfterHours.toString()}
                      onValueChange={(value) => setExpiresAfterHours(Number(value))}
                    >
                      <SelectTrigger id="expires-after" className="w-auto h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expirationOptions.map((hours, index) => (
                          <SelectItem key={`hours-${index}`} value={hours.toString()}>
                            {formatHours(hours)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Expires after
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex-grow" />

            <Button type="submit" className="gap-1">
              Create
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {uploadProgress > 0 && uploadProgress < 1 && (
            <Progress value={uploadProgress * 100} className="mt-2" />
          )}
        </form>
      ) : (
        <div className="space-y-8">
          <CreatedNoteBox noteUrl={createdNoteURL(createdNote)} />

          <div className="pt-6 space-y-3">
            <div className="text-xs text-muted-foreground tracking-wide uppercase">
              Preview
            </div>
            <NoteView
              destroyAfterRead={destroyAfterRead}
              expiresAt={
                createdExpiresAt ??
                dayjs().add(expiresAfterHours, "hours").toISOString()
              }
              cleartext={cleartext}
              file={file ? <DecryptedFileCard name={file.name} blob={file} /> : undefined}
              isPreview
            />
          </div>
        </div>
      )}
    </div>
  );
}

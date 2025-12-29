import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { filesize } from "filesize";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DisplayFile from "@/components/DisplayFile";
import { calculateChecksum } from "@/util/crypto";

export default function DecryptedFileCard({
  name,
  blob,
  downloadName,
}: {
  name: string;
  blob: Blob;
  downloadName?: string;
}) {
  const [checksum, setChecksum] = useState<string | undefined>(undefined);
  const [checksumErr, setChecksumErr] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const sha = await calculateChecksum(blob);
        if (!cancelled) setChecksum(sha);
      } catch (e) {
        console.error("Failed to calculate file checksum", e);
        if (!cancelled) setChecksumErr("Failed to calculate file checksum.");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const handleDownload = () => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName ?? name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Card className="view-file w-full" data-testid="view-file">
      <CardContent className="p-4 space-y-3">
        <div>
          <span className="mr-2 font-medium">{name}</span>
          <span className="text-xs font-mono text-muted-foreground">
            ({filesize(blob.size)})
          </span>

          {checksumErr && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{checksumErr}</AlertDescription>
            </Alert>
          )}

          {checksum && (
            <div className="text-[10px] text-muted-foreground font-mono break-all mt-1">
              sha256: {checksum}
            </div>
          )}
        </div>

        <div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleDownload();
            }}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 no-underline hover:underline"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>

        <DisplayFile blob={blob} name={name} />
      </CardContent>
    </Card>
  );
}

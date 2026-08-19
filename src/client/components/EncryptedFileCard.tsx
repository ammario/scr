import { useEffect, useState } from "react";
import { Base64 } from "js-base64";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import DecryptedFileCard from "@/src/client/components/DecryptedFileCard";
import { decryptBuffer, decryptStringPayload } from "@/util/crypto";
import type { ApiNote } from "@/src/types/api";

export default function EncryptedFileCard({
  note,
  decryptionKey,
}: {
  note: ApiNote;
  decryptionKey: string;
}) {
  const [decryptionError, setDecryptionError] = useState<string | undefined>(
    undefined
  );
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | undefined>(
    undefined
  );

  const [decryptedFileName, setDecryptedFileName] = useState("");

  useEffect(() => {
    if (!note.file_name) return;
    let cancelled = false;
    const decryptFileName = async () => {
      try {
        const decrypted = await decryptStringPayload(
          note.file_name!,
          decryptionKey,
          "filename"
        );
        if (!cancelled) setDecryptedFileName(decrypted || note.file_name!);
      } catch {
        if (cancelled) return;
        if (note.file_name!.startsWith("scr:v2:")) {
          setDecryptionError(
            "Failed to decrypt the filename. The note might have been modified."
          );
        } else {
          // Some legacy notes stored an unencrypted filename.
          setDecryptedFileName(note.file_name!);
        }
      }
    };

    decryptFileName();
    return () => {
      cancelled = true;
    };
  }, [note.file_name, decryptionKey]);

  useEffect(() => {
    if (!note.file_contents) return;
    const fileContents = note.file_contents;
    let cancelled = false;
    const decryptFile = async () => {
      try {
        const bytes = Base64.toUint8Array(fileContents);
        const decrypted = await decryptBuffer(bytes, decryptionKey);
        if (cancelled) return;
        setDecryptedBlob(new Blob([decrypted as BlobPart]));
      } catch (error) {
        console.error("Failed to decrypt file contents:", error);
        if (cancelled) return;
        setDecryptionError(
          "Failed to decrypt file contents. The decryption key might be incorrect."
        );
      }
    };

    decryptFile();
    return () => {
      cancelled = true;
    };
  }, [note.file_contents, decryptionKey]);

  if (!note.file_name || !note.file_contents) return null;

  if (decryptionError) {
    return (
      <Card className="view-file w-full" data-testid="view-file">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{decryptionError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!decryptedBlob) {
    return (
      <Card className="view-file w-full" data-testid="view-file">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Decrypting...
        </CardContent>
      </Card>
    );
  }

  return (
    <DecryptedFileCard name={decryptedFileName} blob={decryptedBlob} />
  );
}

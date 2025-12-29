import { useEffect, useMemo, useState } from "react";
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

  const decryptedFileName = useMemo(() => {
    if (!note.file_name) return "";
    try {
      const dec = decryptStringPayload(note.file_name, decryptionKey);
      if (dec.length > 0) return dec;
    } catch {
      // legacy filename or incorrect key
    }
    return note.file_name ?? "";
  }, [note.file_name, decryptionKey]);

  useEffect(() => {
    if (!note.file_contents) return;
    let cancelled = false;
    const decryptFile = async () => {
      try {
        const bytes = Base64.toUint8Array(note.file_contents);
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

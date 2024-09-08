import { css } from "@emotion/react";
import { useState, useEffect } from "react";
import Image from "next/image";

const DisplayFile = ({ file, name }: { file: Uint8Array; name: string }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    const processFile = async () => {
      const blob = new Blob([file]);
      const extension = getFileExtension(name);

      if (extension === "heic") {
        try {
          // Dynamically import heic2any only on the client side
          const heic2any = (await import("heic2any")).default;
          const convertedBlob = await heic2any({
            blob,
            toType: "image/jpeg",
            quality: 0.8,
          });
          const singleBlob = Array.isArray(convertedBlob)
            ? convertedBlob[0]
            : convertedBlob;
          const url = URL.createObjectURL(singleBlob);
          setObjectUrl(url);
        } catch (error) {
          console.error("Error converting HEIC image:", error);
          setObjectUrl(null);
        }
      } else {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      }
    };

    processFile();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, name]);

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase();
  };

  const isImage = (extension: string | undefined) => {
    const imageExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "svg",
      "heic",
    ];
    return extension && imageExtensions.includes(extension);
  };

  const extension = getFileExtension(name);

  if (!objectUrl || !isImage(extension)) {
    return null;
  }

  return (
    <div
      css={css`
        max-width: 100%;
      `}
    >
      <Image
        src={objectUrl}
        alt={name}
        width={300}
        height={300}
        layout="responsive"
        objectFit="contain"
      />
    </div>
  );
};

export default DisplayFile;

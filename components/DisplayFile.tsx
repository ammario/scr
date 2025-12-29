import { useState, useEffect } from "react";

const DisplayFile = ({ blob, name }: { blob: Blob; name: string }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  
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

  useEffect(() => {
    const processFile = async () => {
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
  }, [blob, name]);

  const extension = getFileExtension(name);

  if (!objectUrl || !isImage(extension)) {
    return null;
  }

  return (
    <div className="max-w-full">
      <img
        src={objectUrl}
        alt={name}
        className="w-full h-auto object-contain"
      />
    </div>
  );
};

export default DisplayFile;

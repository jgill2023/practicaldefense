import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (result: { successful: any[] }) => void;
  buttonClassName?: string;
  children: ReactNode;
  // Legacy prop — no longer used. Upload is handled internally via server-side Vercel Blob.
  // Kept for backward compatibility during migration; callers can safely remove it.
  onGetUploadParameters?: () => Promise<{ method: "PUT"; url: string }>;
}

/**
 * A file upload component that renders as a button and handles file uploads
 * by POSTing to the server, which stores files in Vercel Blob.
 *
 * Features:
 * - Renders as a customizable button
 * - File selection with size validation
 * - Upload progress tracking
 * - Upload status display
 *
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 15MB)
 * @param props.onComplete - Callback called when upload is complete.
 *   Receives `{ successful: [{ uploadURL: string }] }` where uploadURL is the Vercel Blob URL.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 15728640, // 15MB default
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSizeMB = Math.round(maxFileSize / 1024 / 1024);
    if (file.size > maxFileSize) {
      alert(`File size must be less than ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const uploadURL = data.uploadURL || data.url;
        console.log("Upload successful, URL:", uploadURL);
        onComplete?.({
          successful: [{ uploadURL }],
        });
      } else {
        const errorText = await response.text();
        console.error("Upload failed with status:", response.status, errorText);
        let detail = '';
        try { detail = JSON.parse(errorText)?.error || JSON.parse(errorText)?.message || ''; } catch { detail = errorText; }
        alert(`Upload failed: ${detail || `Status ${response.status}`}. Please try again.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      <Button
        type="button"
        onClick={() => document.getElementById("file-upload")?.click()}
        className={buttonClassName}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUploading ? "Uploading..." : children}
      </Button>
    </div>
  );
}

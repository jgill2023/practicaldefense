import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: any[] }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
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
      // Reset the input so the same file can be selected again after the user fixes it
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await onGetUploadParameters();
      
      if (!url) {
        alert('Failed to get upload URL. Please try again.');
        setIsUploading(false);
        return;
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (response.ok) {
        // Extract the storage URL from the upload URL by removing query parameters
        const storageURL = url.split('?')[0];
        console.log('Upload successful, storage URL:', storageURL);
        onComplete?.({
          successful: [{ uploadURL: storageURL }]
        });
      } else {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, errorText);
        alert(`Upload failed: ${response.statusText}. Please try again.`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again
      event.target.value = '';
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
        onClick={() => document.getElementById('file-upload')?.click()} 
        className={buttonClassName}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUploading ? 'Uploading...' : children}
      </Button>
    </div>
  );
}

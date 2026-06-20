"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Image Upload Component
 *
 * Features:
 * - Drag and drop support
 * - File type validation (JPG, PNG, WebP)
 * - File size validation (max 5MB)
 * - Image preview
 * - Upload progress indication
 * - Remove image
 */

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemove?: () => void;
  error?: string | null;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  currentImageUrl,
  onFileSelect,
  onRemove,
  error,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback(
    (file: File | null) => {
      setLocalError(null);

      if (!file) {
        setPreview(null);
        onFileSelect(null);
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setLocalError("Invalid file type. Allowed: JPG, PNG, WebP");
        return;
      }

      if (file.size > MAX_SIZE) {
        setLocalError("File too large. Maximum size: 5MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    },
    [validateAndSetFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setLocalError(null);
    onFileSelect(null);
    onRemove?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  const displayUrl = preview || currentImageUrl;

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative">
          <div className="relative w-full max-w-xs overflow-hidden rounded-lg border">
            <img
              src={displayUrl}
              alt="Preview"
              className="h-48 w-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-2"
            onClick={handleRemove}
          >
            Remove Image
          </Button>
        </div>
      ) : (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-4xl mb-2">📁</div>
          <p className="text-sm font-medium">
            Drop an image here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP — Max 5MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleChange}
        className="hidden"
      />

      {(localError || error) && (
        <Alert variant="destructive">
          <AlertDescription>{localError || error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

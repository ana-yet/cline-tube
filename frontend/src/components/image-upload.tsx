"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, X, FileImage, AlertTriangle } from "lucide-react";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemove?: () => void;
  error?: string | null;
  /** Poster (2:3) or wide backdrop (16:9) preview */
  variant?: "poster" | "backdrop";
  dropzoneLabel?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  currentImageUrl,
  onFileSelect,
  onRemove,
  error,
  variant = "poster",
  dropzoneLabel,
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
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    },
    [validateAndSetFile]
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
  const isBackdrop = variant === "backdrop";
  const previewClass = isBackdrop
    ? "relative w-full max-w-md aspect-video overflow-hidden rounded-xl border border-zinc-800 shadow-md bg-zinc-950"
    : "relative w-full max-w-[220px] aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 shadow-md bg-zinc-950";
  const defaultDropLabel = isBackdrop
    ? "Drag backdrop image here or click to browse"
    : "Drag poster image here or click to browse";

  return (
    <div className="space-y-3">
      {displayUrl ? (
        <div className="space-y-2.5">
          <div className={previewClass}>
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-650/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all ${
            dragOver
              ? "border-red-500 bg-red-500/5"
              : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="h-10 w-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center mb-3">
            <UploadCloud className="h-5 w-5 text-zinc-550" />
          </div>
          <p className="text-xs font-bold text-zinc-300">
            {dropzoneLabel ?? defaultDropLabel}
          </p>
          <p className="text-[10px] text-zinc-550 mt-1 uppercase tracking-wider font-semibold">
            JPG, PNG, WebP &bull; MAX 5MB
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
        <Alert variant="destructive" className="border-red-500/20 bg-red-950/20">
          <AlertDescription className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{localError || error}</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

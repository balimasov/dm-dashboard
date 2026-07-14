"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";

const OUTPUT_SIZE = 200;

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M4 20l.9-3.6L16.4 5 19 7.6 7.6 19.1 4 20z M14.5 6.9l2.6 2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropToDataUrl(imageSrc: string, area: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Square avatar/logo picker with drag/zoom crop — the shared upload
 * mechanism behind a campaign's logo and a creature's portrait (matching
 * `Avatar`'s look for the no-image fallback). The crop step stores a
 * compressed ~200×200 base64 data URI directly on the record — no upload
 * endpoint or file storage needed at this scale.
 */
export function AvatarPicker({
  imageUrl,
  label,
  onChange,
}: {
  imageUrl?: string;
  label: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  useEscapeToClose(() => setPendingImage(null), pendingImage !== null);

  async function applyCrop() {
    if (!pendingImage || !croppedAreaPixels) return;
    onChange(await cropToDataUrl(pendingImage, croppedAreaPixels));
    setPendingImage(null);
  }

  return (
    <div>
      <div className="relative inline-flex h-16 w-16 shrink-0">
        <Avatar src={imageUrl} label={label} size="md" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={imageUrl ? "Change photo" : "Upload photo"}
          title={imageUrl ? "Change photo" : "Upload photo"}
          className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow hover:bg-slate-700 hover:text-white"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {pendingImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPendingImage(null)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 w-full overflow-hidden rounded-md bg-slate-950">
              <Cropper
                image={pendingImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <Button type="button" onClick={applyCrop}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

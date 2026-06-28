import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getProfilePic, setProfilePic } from "@/lib/profile-storage";

interface Props {
  role: "manager" | "admin";
  fallback?: string; // initials
}

export function ProfilePictureUpload({ role, fallback = "U" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSrc(getProfilePic(role)); }, [role]);

  const onFile = (f: File) => {
    if (!f.type.match(/image\/(jpeg|png|gif)/)) { toast.error("Use JPG, PNG or GIF"); return; }
    if (f.size > 4 * 1024 * 1024) { toast.error("Max 4MB"); return; }
    const r = new FileReader();
    r.onload = () => { setPending(r.result as string); setZoom(1); };
    r.readAsDataURL(f);
  };

  const save = () => {
    if (!pending) return;
    setProfilePic(role, pending);
    setSrc(pending);
    setPending(null);
    toast.success("Profile picture updated");
  };

  const remove = () => {
    setProfilePic(role, null);
    setSrc(null);
    setPending(null);
    toast.success("Profile picture removed");
  };

  const preview = pending ?? src;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative size-24 overflow-hidden rounded-full border-2 border-accent/40 bg-white/10 shadow-inner">
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="h-full w-full object-cover transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-cream">
              {fallback}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> Upload
          </Button>
          {src && (
            <Button type="button" size="sm" variant="outline" onClick={remove}>
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
      </div>

      {pending && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-3">
          <p className="mb-2 text-xs text-cream/70">Adjust zoom and save</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}>
              <ZoomOut className="size-4" />
            </Button>
            <input
              type="range" min={1} max={2.5} step={0.05} value={zoom}
              onChange={(e) => setZoom(+e.target.value)} className="flex-1 accent-[oklch(0.78_0.16_75)]"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
              <ZoomIn className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button type="button" size="sm" onClick={save}><Camera className="size-4" /> Save</Button>
          </div>
        </div>
      )}
      <p className="text-xs text-cream/50">JPG, PNG or GIF · up to 4MB</p>
    </div>
  );
}

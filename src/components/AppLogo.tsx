import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
}

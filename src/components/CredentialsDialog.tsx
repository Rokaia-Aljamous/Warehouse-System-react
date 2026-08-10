import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  password: string;
  title?: string;
  description?: string;
}

export function CredentialsDialog({
  open, onOpenChange, userName, password, title, description,
}: CredentialsDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<"username" | "password" | null>(null);

  const copy = async (value: string, field: "username" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      toast.success(t("common.copied"));
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error(t("layout.copy_failed"));
    }
  };

  const CopyButton = ({ field, value }: { field: "username" | "password"; value: string }) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => copy(value, field)}
      className="h-7 px-2 text-xs text-[#1D2D44] hover:bg-white/60"
    >
      {copied === field ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {copied === field ? t("common.copied") : t("common.copy")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" /> {title ?? t("manager.created")}
          </DialogTitle>
          <DialogDescription>
            {description ?? t("manager.created.desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[#1D2D44]">{t("manager.login.username")}</Label>
              <CopyButton field="username" value={userName} />
            </div>
            <div className="rounded-lg border bg-muted px-3 py-2 font-mono text-sm text-[#1D2D44]">{userName}</div>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[#1D2D44]">{t("manager.temporary_password")}</Label>
              <CopyButton field="password" value={password} />
            </div>
            <div className="rounded-lg border bg-muted px-3 py-2 font-mono text-sm text-[#1D2D44]">{password}</div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-navy text-cream hover:bg-navy/90">{t("common.ok")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

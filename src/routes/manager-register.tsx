import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, UserPlus, Warehouse, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LanguageToggle } from "@/components/LanguageToggle";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/manager-register")({
  component: ManagerRegister,
  head: () => ({ meta: [{ title: `${i18n.t("title.worker_registration")} — Stockyard` }] }),
});

function ManagerRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ workerId: "", name: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      toast.success(t("manager.register.submitted"));
    }, 900);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-cream">
            <Warehouse className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight">{t("app.name")} · {t("app.worker")}</span>
          </Link>
          <LanguageToggle variant="header" />
        </div>

        {done ? (
          <div className="glass-light rounded-3xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/30">
              <CheckCircle2 className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">{t("manager.register.pending_title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("manager.register.pending_desc")}
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/manager-login" })}>
              {t("manager.register.continue_login")}
            </Button>
          </div>
        ) : (
          <div className="glass-light rounded-3xl p-8">
            <h1 className="text-2xl font-semibold">{t("manager.register.title")}</h1>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("manager.register.worker_id_hint")}</span>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wid" className="flex items-center gap-2">
                  {t("manager.register.worker_id")}
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>{t("manager.register.worker_id_tooltip")}</TooltipContent>
                  </Tooltip>
                </Label>
                <Input id="wid" placeholder="WRK-XXXX" value={form.workerId} onChange={update("workerId")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t("signup.name")}</Label>
                <Input id="name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("signup.phone")}</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">{t("auth.password")}</Label>
                <Input id="pw" type="password" value={form.password} onChange={update("password")} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {loading ? t("common.submitting") : t("manager.register.register")}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("manager.register.already_registered")}{" "}
              <Link to="/manager-login" className="font-medium text-foreground underline-offset-4 hover:underline">
                {t("auth.log_in")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

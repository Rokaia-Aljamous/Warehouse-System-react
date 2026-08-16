import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, KeyRound, Warehouse, Eye, EyeOff, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getCsrfCookie } from "@/lib/api";
import { forceChangePassword, logoutManager } from "@/lib/manager-api";
import { validatePasswordStrength } from "@/lib/validation";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/force-password-change")({
  component: ForcePasswordChange,
  head: () => ({ meta: [{ title: `${i18n.t("manager.set_new_password")} — Stockyard` }] }),
});

const SESSION_KEY = "stockyard.manager";

function ForcePasswordChange() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (!raw) {
      navigate({ to: "/manager-login", replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.must_change_password === false) {
        if (parsed.role === "warehouse_secretary") {
          navigate({ to: "/supervisor/dashboard", replace: true });
        } else {
          navigate({ to: "/manager", replace: true });
        }
        return;
      }
      if (parsed.tenant?.url_slug) {
        setSlug(parsed.tenant.url_slug);
      } else {
        navigate({ to: "/manager-login", replace: true });
      }
    } catch {
      navigate({ to: "/manager-login", replace: true });
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      if (slug) await logoutManager(slug);
    } catch {
      /* ignore */
    }
    localStorage.removeItem(SESSION_KEY);
    navigate({ to: "/manager-login", replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("settings.password_min_length"));
      return;
    }
    if (!validatePasswordStrength(password)) {
      toast.error(t("validation.password_policy"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("settings.password_mismatch"));
      return;
    }
    if (!slug) {
      toast.error(t("manager.login.invalid"));
      return;
    }
    setLoading(true);
    try {
      await getCsrfCookie();
      await forceChangePassword(slug, password, confirm);
      let redirectRole: string | undefined;
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.must_change_password = false;
        localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        redirectRole = parsed.role;
      }
      toast.success(t("settings.password_changed"));
      if (redirectRole === "warehouse_secretary") {
        navigate({ to: "/supervisor/dashboard", replace: true });
      } else {
        navigate({ to: "/manager", replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0]
        || t("manager.login.server_error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-cream">
            <Warehouse className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight">{t("app.name")} · {t("app.manager")}</span>
          </Link>
          <LanguageToggle variant="header" />
        </div>
        <div className="glass-light rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-accent/30 text-foreground">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t("manager.set_new_password")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("manager.first_login_desc")}</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-[#1D2D44]">{t("settings.new_password")}</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="text-foreground pe-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t("common.hide_password") : t("common.show_password")}
                className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="confirm" className="text-[#1D2D44]">{t("settings.confirm_new_password")}</Label>
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="text-foreground pe-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? t("common.hide_password") : t("common.show_password")}
                className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t("validation.password_policy_hint")}</p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? t("common.submitting") : t("manager.change_password_continue")}
            </Button>
          </form>
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="me-1 size-4" /> {t("settings.sign_out")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

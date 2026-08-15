import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, LogIn, Warehouse, Eye, EyeOff, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getCsrfCookie, forgotDashboardPassword, resetDashboardPassword } from "@/lib/api";
import { loginManager, fetchMe, type DashboardUser } from "@/lib/manager-api";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/manager-login")({
  component: ManagerLogin,
  head: () => ({ meta: [{ title: `${i18n.t("title.manager_login")} — Stockyard` }] }),
});

const SESSION_KEY = "stockyard.manager";

function ManagerLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<"login" | "forgot" | "reset">("login");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [resetOtp, setResetOtp] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.must_change_password) {
        navigate({ to: "/force-password-change", replace: true });
        return;
      }
      if (parsed.tenant?.url_slug) {
        fetchMe(parsed.tenant.url_slug).then((me) => {
          if (me.role === "manager") {
            navigate({ to: "/manager", replace: true });
          } else if (me.role === "warehouse_secretary") {
            navigate({ to: "/supervisor/dashboard", replace: true });
          }
        }).catch(() => {
          localStorage.removeItem(SESSION_KEY);
        });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [navigate]);

  const storeSession = (user: DashboardUser) => {
    const payload = JSON.stringify({
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      owner_id: user.owner_id,
      employee_id: user.employee_id,
      warehouse_id: user.warehouse_id,
      tenant: user.tenant,
      user_name: user.user_name,
      must_change_password: user.must_change_password,
    });
    localStorage.setItem(SESSION_KEY, payload);
    if (user.must_change_password) {
      navigate({ to: "/force-password-change" });
      return;
    }
    if (user.role === "warehouse_secretary") {
      navigate({ to: "/supervisor/dashboard" });
      return;
    }
    navigate({ to: "/manager" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !userName.trim() || !password.trim()) {
      toast.error(t("manager.login.fields_required"));
      return;
    }
    setLoading(true);
    try {
      await getCsrfCookie();
      const res = await loginManager(slug.trim(), userName.trim(), password);

      if (res.dashboard_user.role !== "manager" && res.dashboard_user.role !== "warehouse_secretary") {
        toast.error(t("manager.login.no_access"));
        setLoading(false);
        return;
      }

      storeSession(res.dashboard_user);
      toast.success(t("manager.login.welcome", { name: res.dashboard_user.full_name }));
    } catch (err: any) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0]
        || t("manager.login.invalid");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      toast.error(t("auth.slug_required"));
      return;
    }
    if (!forgotPhone.trim()) {
      toast.error(t("auth.phone_required"));
      return;
    }
    setForgotSending(true);
    setDebugOtp(null);
    try {
      await getCsrfCookie();
      const res = await forgotDashboardPassword(slug.trim(), forgotPhone.trim());
      if (res.debug_otp && import.meta.env.DEV) {
        setDebugOtp(res.debug_otp);
      }
      setAuthStep("reset");
      toast.success(t("auth.otp_sent"));
    } catch (err: any) {
      const firstErrorKey = Object.keys(err.response?.data?.errors ?? {})[0];
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[firstErrorKey]?.[0] ||
        t("auth.send_otp_failed");
      toast.error(msg);
    } finally {
      setForgotSending(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetOtp.length !== 6) {
      toast.error(t("auth.otp_invalid_length"));
      return;
    }
    if (resetPw.length < 8) {
      toast.error(t("auth.password_too_short"));
      return;
    }
    if (resetPw !== resetConfirm) {
      toast.error(t("auth.password_mismatch"));
      return;
    }
    setResetSending(true);
    try {
      await getCsrfCookie();
      await resetDashboardPassword(slug.trim(), {
        phone_number: forgotPhone.trim(),
        otp: resetOtp,
        password: resetPw,
        password_confirmation: resetConfirm,
      });
      setAuthStep("login");
      setDebugOtp(null);
      setResetOtp("");
      setResetPw("");
      setResetConfirm("");
      setPassword("");
      toast.success(t("auth.password_reset_success"));
    } catch (err: any) {
      const firstErrorKey = Object.keys(err.response?.data?.errors ?? {})[0];
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[firstErrorKey]?.[0] ||
        t("auth.reset_failed");
      toast.error(msg);
    } finally {
      setResetSending(false);
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
          {authStep === "login" ? (
            <>
              <h1 className="text-2xl font-semibold text-foreground">{t("auth.log_in")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("manager.login.hint")}
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-[#1D2D44]">{t("manager.login.company_slug")}</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder={t("manager.login.slug_placeholder")} className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#1D2D44]">{t("manager.login.username")}</Label>
              <Input id="username" autoComplete="username" value={userName} onChange={(e) => setUserName(e.target.value)} required placeholder={t("manager.login.username_placeholder")} className="text-foreground" />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-[#1D2D44]">{t("manager.login.password")}</Label>
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-foreground pe-10" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t("common.hide_password") : t("common.show_password")}
                className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? t("auth.signing_in") : t("auth.log_in")}
            </Button>
            <button
              type="button"
              onClick={() => setAuthStep("forgot")}
              className="w-full text-center text-sm font-medium text-[#1D2D44]/70 transition hover:text-[#1D2D44]"
            >
              {t("auth.forgot_password")}
            </button>
          </form>
          <div className="mt-6 rounded-xl bg-muted/60 p-3 text-xs">
            <p className="font-medium text-foreground">{t("manager.login.demo_credentials")}</p>
            <p className="mt-1 text-[#1e293b]">{t("manager.login.slug")}: <strong>delta</strong></p>
            <p className="text-[#1e293b]">{t("manager.login.username")}: <strong>mgr_delta_2</strong> (or _3 / _4 / _5 / _6)</p>
            <p className="text-[#1e293b]">{t("manager.login.password")}: <strong>password</strong></p>
          </div>
            </>
          ) : authStep === "forgot" ? (
            <form onSubmit={sendForgotOtp} className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{t("auth.forgot_password")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.forgot_desc")}</p>
              <div className="space-y-2">
                <Label htmlFor="forgot-phone" className="text-[#1D2D44]">{t("auth.phone_number")}</Label>
                <Input
                  id="forgot-phone"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  placeholder={t("auth.phone_number")}
                  required
                  className="text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgotSending}>
                {forgotSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {forgotSending ? t("auth.sending_otp") : t("auth.send_otp")}
              </Button>
              <button
                type="button"
                onClick={() => setAuthStep("login")}
                className="w-full text-center text-sm font-medium text-[#1D2D44]/70 transition hover:text-[#1D2D44]"
              >
                {t("auth.back_to_login")}
              </button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="mt-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{t("auth.reset_password")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.check_whatsapp")}</p>
              {debugOtp && (
                <div className="rounded-xl border border-[#f3a523]/40 bg-[#f3a523]/10 px-4 py-2.5 text-center text-sm font-medium text-foreground">
                  {t("auth.dev_otp_helper")}: {debugOtp}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-otp" className="text-[#1D2D44]">{t("auth.enter_otp")}</Label>
                <InputOTP
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={resetOtp}
                  onChange={setResetOtp}
                >
                  <InputOTPGroup className="gap-0">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-pw" className="text-[#1D2D44]">{t("auth.new_password")}</Label>
                <Input
                  id="reset-pw"
                  type="password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder={t("auth.new_password")}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm" className="text-[#1D2D44]">{t("auth.confirm_password")}</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder={t("auth.confirm_password")}
                  required
                  className="text-foreground"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resetSending || resetOtp.length !== 6 || !resetPw || resetPw !== resetConfirm}
              >
                {resetSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.resetting")}
                  </>
                ) : (
                  t("auth.reset_password")
                )}
              </Button>
              <button
                type="button"
                onClick={() => setAuthStep("login")}
                className="w-full text-center text-sm font-medium text-[#1D2D44]/70 transition hover:text-[#1D2D44]"
              >
                {t("auth.back_to_login")}
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-cream/70">
          <Link to="/" className="hover:underline">
            <ArrowLeft className="inline size-3.5 rtl:rotate-180" /> {t("common.back_home")}
          </Link>
        </p>
      </div>
    </div>
  );
}

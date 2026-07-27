import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, Warehouse, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCsrfCookie } from "@/lib/api";
import { loginManager, fetchMe } from "@/lib/manager-api";

export const Route = createFileRoute("/manager-login")({
  component: ManagerLogin,
  head: () => ({ meta: [{ title: "Manager Login — Stockyard" }] }),
});

const SESSION_KEY = "stockyard.manager";

function ManagerLogin() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !userName.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await getCsrfCookie();
      const res = await loginManager(slug.trim(), userName.trim(), password);

      if (res.dashboard_user.role !== "manager") {
        toast.error(res.dashboard_user.role === "warehouse_secretary" ? "Secretary accounts use a separate login." : "This account does not have manager access");
        setLoading(false);
        return;
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: res.dashboard_user.id,
        full_name: res.dashboard_user.full_name,
        role: res.dashboard_user.role,
        owner_id: res.dashboard_user.owner_id,
        employee_id: res.dashboard_user.employee_id,
        warehouse_id: res.dashboard_user.warehouse_id,
        tenant: res.dashboard_user.tenant,
        user_name: res.dashboard_user.user_name,
        must_change_password: res.dashboard_user.must_change_password,
      }));

      toast.success(`Welcome, ${res.dashboard_user.full_name}`);
      navigate({ to: `/manager/${slug.trim()}` });
    } catch (err: any) {
      /* 409 = already authenticated — try to recover session info */
      if (err.response?.status === 409) {
        try {
          const me = await fetchMe(slug.trim());
          if (me.role !== "manager") {
            toast.error("Logged in as owner — use the owner dashboard instead.");
            setLoading(false);
            return;
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            id: me.id,
            full_name: me.full_name,
            role: me.role,
            owner_id: me.owner_id,
            employee_id: me.employee_id,
            warehouse_id: me.warehouse_id,
            tenant: me.tenant,
            user_name: me.user_name,
            must_change_password: me.must_change_password,
          }));
          toast.success(`Welcome back, ${me.full_name}`);
          navigate({ to: `/manager/${slug.trim()}` });
          return;
        } catch {
          toast.error("Session belongs to a different tenant. Open DevTools → Application → Cookies → delete stockyard_session & XSRF-TOKEN, then reload.");
        }
      }
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0]
        || "Login failed. Check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-cream">
          <Warehouse className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">Stockyard · Manager</span>
        </Link>
        <div className="glass-light rounded-3xl p-8">
          <h1 className="text-2xl font-semibold text-foreground">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the credentials provided by your General Manager.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-[#1D2D44]">Company Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="e.g. delta" className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#1D2D44]">Username</Label>
              <Input id="username" autoComplete="username" value={userName} onChange={(e) => setUserName(e.target.value)} required placeholder="mgr_delta_1" className="text-foreground" />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-[#1D2D44]">Password</Label>
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-foreground pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in\u2026" : "Log in"}
            </Button>
          </form>
          <div className="mt-6 rounded-xl bg-muted/60 p-3 text-xs">
            <p className="font-medium text-foreground">Demo credentials</p>
            <p className="mt-1 text-[#1e293b]">Slug: <strong>delta</strong></p>
            <p className="text-[#1e293b]">Username: <strong>mgr_delta_2</strong> (or _3 / _4 / _5 / _6)</p>
            <p className="text-[#1e293b]">Password: <strong>password</strong></p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-cream/70">
          <Link to="/" className="hover:underline">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
}

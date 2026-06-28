import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, Warehouse, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { initialManagers } from "@/lib/demo-data";

export const Route = createFileRoute("/manager-login")({
  component: ManagerLogin,
  head: () => ({ meta: [{ title: "Manager Login — Stockyard" }] }),
});

const SESSION_KEY = "stockyard.manager";
const OVERRIDES_KEY = "stockyard.manager.overrides";

type Override = { password?: string; isTempPassword?: boolean; lastPasswordChange?: string };

function readOverrides(): Record<string, Override> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}"); } catch { return {}; }
}

function ManagerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ahmed@acme.io");
  const [password, setPassword] = useState("manager123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const overrides = readOverrides();
        // Find manager by email (case-insensitive)
        const m = initialManagers.find((x) => (x.email ?? "").toLowerCase() === email.trim().toLowerCase());
      if (!m) {
        setLoading(false);
          toast.error("Unknown email");
        return;
      }
      const ov = overrides[m.whmId] ?? {};
      const effectivePw = ov.password ?? m.password;
      const isTemp = ov.isTempPassword ?? m.isTempPassword;
      if (effectivePw !== password) {
        setLoading(false);
        toast.error("Incorrect password");
        return;
      }
      if (m.status !== "active") {
        setLoading(false);
        toast.error("Account inactive — contact your General Manager");
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        whmId: m.whmId,
        name: m.name,
        warehouseId: m.warehouseId,
        isFirstLogin: isTemp,
      }));
      toast.success(`Welcome, ${m.name}`);
      navigate({ to: "/manager" });
    }, 800);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("If the email exists, a reset request was sent to your General Manager.");
    setForgotOpen(false);
    setForgotEmail("");
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
              <Label htmlFor="email" className="text-[#1D2D44]">Email</Label>
              <Input id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className="text-foreground" />
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
              {loading ? "Signing in…" : "Log in"}
            </Button>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </form>
          <div className="mt-6 rounded-xl bg-muted/60 p-3 text-xs">
            <p className="font-medium text-foreground">Demo accounts</p>
            <p className="mt-1" style={{ color: "#1e293b" }}>Ahmed / manager123 · JohnSmith / manager123</p>
            <p style={{ color: "#1e293b" }}>Ahmed Mansour / temp123 (first-login flow)</p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-cream/70">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Reset password</DialogTitle>
            <DialogDescription className="text-[#1D2D44]">
              Enter your registered email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">Email address</Label>
              <Input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder="you@company.com" className="text-[#1D2D44] placeholder:text-gray-400" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
              <Button type="submit">Send request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserPlus, Warehouse, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/manager-register")({
  component: ManagerRegister,
  head: () => ({ meta: [{ title: "Worker Registration — Stockyard" }] }),
});

function ManagerRegister() {
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
      toast.success("Registration submitted");
    }, 900);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-cream">
          <Warehouse className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">Stockyard · Worker</span>
        </Link>

        {done ? (
          <div className="glass-light rounded-3xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/30">
              <CheckCircle2 className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Pending approval</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your registration has been received. Your warehouse manager will activate your account shortly.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/manager-login" })}>
              Continue to login
            </Button>
          </div>
        ) : (
          <div className="glass-light rounded-3xl p-8">
            <h1 className="text-2xl font-semibold">Worker registration</h1>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Contact your warehouse manager for your Worker ID to register.</span>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wid" className="flex items-center gap-2">
                  Worker ID
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Provided by your manager (e.g. WRK-1042)</TooltipContent>
                  </Tooltip>
                </Label>
                <Input id="wid" placeholder="WRK-XXXX" value={form.workerId} onChange={update("workerId")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={form.password} onChange={update("password")} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {loading ? "Submitting…" : "Register"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link to="/manager-login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  User, Mail, Lock, Calendar, Eye, EyeOff, Loader2, HelpCircle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setStoredUser } from "@/lib/api";

// Birthdate string DD/MM/YYYY → Date
function parseDOB(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (d.getFullYear() !== +yyyy || d.getMonth() !== +mm - 1 || d.getDate() !== +dd) return null;
  return d;
}
function ageYears(d: Date) {
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

const schema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(80),
    email: z.string().trim().email("Invalid email").max(255),
  // phone removed
    birthdate: z.string().refine((v) => {
      const d = parseDOB(v);
      return !!d && ageYears(d) >= 18;
    }, "Must be 18+ (DD/MM/YYYY)"),
    password: z.string().min(8, "Min 8 characters").max(72),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept terms" }) }),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirm)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm"], message: "Passwords don't match" });
  });

type FormState = {
  name: string;
  email: string;
  birthdate: string;
  password: string;
  confirm: string;
  terms: boolean;
};

const initial: FormState = {
  name: "",
  email: "",
  birthdate: "",
  password: "",
  confirm: "",
  terms: false,
};

interface Props { onSubmitted: () => void }

interface FieldProps {
  id: keyof FormState;
  label: string;
  type?: string;
  placeholder?: string;
  icon: React.ElementType;
  tooltip?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  delay: number;
  rightSlot?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

function Field({ id, label, type = "text", placeholder, icon: Icon, tooltip, value, error, onChange, delay, rightSlot, inputMode }: FieldProps) {
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.28_0.04_252)]">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`${label} help`}>
                <HelpCircle className="size-3.5 text-[oklch(0.45_0.03_252)] hover:text-[oklch(0.28_0.04_252)]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </label>
      <div className={`group relative flex items-center rounded-xl border bg-white transition-all
        focus-within:border-[#f3a523] focus-within:ring-4 focus-within:ring-[#f3a523]/15
        ${error ? "border-[oklch(0.6_0.22_27)]" : "border-[#dcdace]"}`}>
        <Icon className="ml-3 size-4 shrink-0 text-[#26384c]/50 transition-colors group-focus-within:text-[#f3a523]" />
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-[oklch(0.28_0.04_252)] placeholder:text-[oklch(0.55_0.03_252)] outline-none"
        />
        {rightSlot}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-[oklch(0.55_0.22_27)]">{error}</p>}
    </div>
  );
}

export function SignUpForm({ onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // auto-format birthdate as DD/MM/YYYY while typing
  const onBirthdate = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let v = digits;
    if (digits.length > 4) v = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) v = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    set("birthdate", v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please review the highlighted fields");
      return;
    }

    setLoading(true);
    
    try {
      const { api, getCsrfCookie } = await import("@/lib/api");
      await getCsrfCookie();
      const parts = form.birthdate.split("/");
      const birthday = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const response = await api.post('/register', {
        full_name: form.name,
        email: form.email,
        birthday,
        password: form.password,
        password_confirmation: form.confirm
      });

      setStoredUser(response.data.user);
      toast.success("Account created successfully! Check your email to verify.");
      onSubmitted(); 
      
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        const serverErrors = error.response.data.errors;
        if (serverErrors) {
          const firstErrorKey = Object.keys(serverErrors)[0];
          toast.error(serverErrors[firstErrorKey][0]);
        } else {
          toast.error(error.response.data.message || "Registration failed");
        }
      } else {
        toast.error("Something went wrong with the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="glass-light w-full rounded-3xl p-6 sm:p-8 animate-fade-up"
      style={{ animationDelay: "120ms" }}
    >
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[oklch(0.28_0.04_252)]">Request Access</h2>

      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="name" label="Full name" placeholder="Jane Doe" icon={User}
          value={form.name} error={errors.name} onChange={(v) => set("name", v)} delay={140} />
        <Field id="email" label="Work email" type="email" placeholder="jane@company.com" icon={Mail}
          value={form.email} error={errors.email} onChange={(v) => set("email", v)} delay={180}
          tooltip="Use your company email — admins use this to verify you." />
  {/* Phone field removed per design */}
        <Field id="birthdate" label="Birthdate" placeholder="DD/MM/YYYY" icon={Calendar}
          inputMode="numeric"
          value={form.birthdate} error={errors.birthdate} onChange={onBirthdate} delay={260}
          tooltip="You must be at least 18 years old to register." />
        <Field id="password" label="Password" type={showPwd ? "text" : "password"} placeholder="At least 8 characters"
          icon={Lock} value={form.password} error={errors.password} onChange={(v) => set("password", v)} delay={300}
          tooltip="Use 8+ characters with a mix of letters and numbers."
          rightSlot={
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="mr-3 text-[oklch(0.45_0.03_252)] hover:text-[oklch(0.28_0.04_252)]" aria-label="Toggle password">
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          } />
        <Field id="confirm" label="Confirm password" type={showConfirm ? "text" : "password"} placeholder="Repeat password"
          icon={Lock} value={form.confirm} error={errors.confirm} onChange={(v) => set("confirm", v)} delay={340}
          rightSlot={
            <button type="button" onClick={() => setShowConfirm((s) => !s)} className="mr-3 text-[oklch(0.45_0.03_252)] hover:text-[oklch(0.28_0.04_252)]" aria-label="Toggle confirm password">
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          } />
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-[oklch(0.35_0.03_252)] animate-fade-up" style={{ animationDelay: "380ms" }}>
        <input
          type="checkbox"
          checked={form.terms}
          onChange={(e) => set("terms", e.target.checked)}
          className="mt-0.5 size-4 cursor-pointer rounded border-[#dcdace] accent-[#f3a523]"
        />
        <span>
          I agree to the{" "}
          <a href="#" className="font-semibold underline-offset-2 hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="font-semibold underline-offset-2 hover:underline">Privacy Policy</a>.
        </span>
      </label>
      {errors.terms && <p className="mt-1 text-xs font-medium text-[oklch(0.55_0.22_27)]">{errors.terms}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="mt-6 h-12 w-full rounded-xl bg-[#f3a523] text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#e09412] hover:shadow-xl animate-fade-up"
        style={{ animationDelay: "420ms" }}
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Submitting request…
          </>
        ) : (
          <>
            Submit for approval <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}

// Phone field and related helpers removed per request

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Warehouse, User, Phone, AtSign, Lock, Eye, EyeOff, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getCsrfCookie, setupTenantOwner, getStoredUser } from "@/lib/api";
import { DashboardPage } from "./dashboard";

export const Route = createFileRoute("/tenant/setup")({
  component: TenantSetup,
  validateSearch: (search: Record<string, unknown>) => ({
    slug: (search.slug as string) || "",
  }),
});

const makeSchema = (t: (k: string) => string) => z.object({
  full_name: z.string().trim().min(2, t("zod.name_required")).max(255),
  phone_number: z.string().trim().min(6, t("zod.phone_required")).max(255),
  user_name: z.string().trim().min(3, t("zod.min_chars")).max(255).regex(/^[a-zA-Z0-9_-]+$/, t("zod.username_charset")),
  birthday: z.string().optional(),
  password: z.string().min(8, t("zod.min_chars")).max(72),
  confirm: z.string(),
}).superRefine((d, ctx) => {
  if (d.password !== d.confirm)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm"], message: t("zod.password_mismatch") });
});

type FormData = z.infer<ReturnType<typeof makeSchema>>;

function TenantSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = Route.useSearch();
  const user = getStoredUser();
  const schema = makeSchema(t);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormData>({
    full_name: "",
    phone_number: "",
    user_name: "",
    birthday: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(t("tenant.setup.fix_fields"));
      return;
    }

    setLoading(true);
    try {
      await getCsrfCookie();
      const birthday = form.birthday ? form.birthday : undefined;
      const res = await setupTenantOwner({
        full_name: form.full_name,
        phone_number: form.phone_number,
        user_name: form.user_name,
        birthday,
        password: form.password,
        password_confirmation: form.confirm,
      });

      toast.success(res.message || t("tenant.setup.success"));
      toast.success(t("tenant.setup.success") + " " + t("tenant.setup.login_at") + "/" + (slug || res.owner.tenant.url_slug) + "/login");
      setDone(true);
    } catch (error: any) {
      if (error.response?.status === 422) {
        const serverErrors = error.response.data.errors;
        if (serverErrors) {
          const firstKey = Object.keys(serverErrors)[0];
          toast.error(serverErrors[firstKey][0]);
        } else {
          toast.error(error.response.data.message || t("tenant.setup.validation_failed"));
        }
      } else {
        toast.error(t("common.try_again_later"));
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    id: keyof FormData,
    label: string,
    opts: { type?: string; placeholder?: string; icon: React.ElementType; rightSlot?: React.ReactNode }
  ) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-[#1a2942]">{label}</label>
      <div className={`flex items-center rounded-xl border bg-white transition-all focus-within:border-[#f3a523] focus-within:ring-4 focus-within:ring-[#f3a523]/15 ${errors[id] ? "border-red-400" : "border-[#dcdace]"}`}>
        <opts.icon className="ms-3 size-4 shrink-0 text-[#26384c]/50" />
        <input
          id={id}
          type={opts.type || "text"}
          placeholder={opts.placeholder}
          value={form[id] as string}
          onChange={(e) => set(id, e.target.value as any)}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-[#1a2942] placeholder:text-[#1a2942]/40 outline-none"
        />
        {opts.rightSlot}
      </div>
      {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
    </div>
  );

  const targetSlug = slug || user?.tenant?.url_slug;

  if (done) return <DashboardPage />;

  return (
    <main className="min-h-screen bg-[#0f1b2d]">
      <header className="border-b border-white/5 bg-[#0f1b2d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-6 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#f3a523] shadow-lg shadow-[#f3a523]/30">
            <Warehouse className="size-5 text-[#1a2942]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#f0ecdb]">{t("app.name")}</span>
          <div className="ms-auto"><LanguageToggle variant="header" /></div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#f0ecdb]">{t("tenant.setup.title")}</h1>
          <p className="mt-2 text-sm text-[#f0ecdb]/60">
            {t("tenant.setup.desc")} <span className="font-semibold text-[#f3a523]">{targetSlug || t("tenant.setup.company")}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl bg-[#f0ecdb] p-6 sm:p-8 shadow-2xl space-y-4">
          {renderField("full_name", t("tenant.setup.name"), { placeholder: t("placeholder.jane_doe"), icon: User })}
          {renderField("phone_number", t("tenant.setup.phone"), { placeholder: "09XXXXXXXX", icon: Phone })}
          {renderField("user_name", t("tenant.setup.username"), { placeholder: "jane_admin", icon: AtSign })}
          {renderField("birthday", t("tenant.setup.birthdate"), { placeholder: "YYYY-MM-DD", icon: Calendar })}
          {renderField("password", t("tenant.setup.password"), {
            type: showPwd ? "text" : "password",
            placeholder: t("placeholder.min_chars"),
            icon: Lock,
            rightSlot: (
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="me-3 text-[#26384c]/50 hover:text-[#1a2942]">
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            ),
          })}
          {renderField("confirm", t("tenant.setup.confirm_password"), {
            type: showConfirm ? "text" : "password",
            placeholder: t("placeholder.repeat_password"),
            icon: Lock,
            rightSlot: (
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="me-3 text-[#26384c]/50 hover:text-[#1a2942]">
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            ),
          })}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-3 font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c] disabled:opacity-60"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" /> {t("tenant.setup.setting_up")}</> : t("tenant.setup.submit")}
          </button>
        </form>
      </div>
    </main>
  );
}

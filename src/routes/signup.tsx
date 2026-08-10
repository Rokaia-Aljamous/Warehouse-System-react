import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Warehouse, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getStoredUser } from "@/lib/api";
import {
  saveUser,
  setSession,
  WAREHOUSE_IMG,
  findUserByEmail,
} from "@/lib/stockyard-store";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: `${i18n.t("title.signup")} — Stockyard` }] }),
});

const COUNTRIES = [
  { code: "+963", label: "SY +963" },
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+91", label: "IN +91" },
  { code: "+61", label: "AU +61" },
  { code: "+86", label: "CN +86" },
];

function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, []);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    cc: "+963",
    phone: "",
    birthdate: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.fullName ||
      !form.email ||
      !form.phone ||
      !form.birthdate ||
      !form.password
    )
      return toast.error(t("signup.fill_all"));
    if (form.password.length < 6) return toast.error(t("signup.password_min"));
    if (form.password !== form.confirm) return toast.error(t("signup.password_mismatch"));
    if (findUserByEmail(form.email))
      return toast.error(t("signup.email_taken"));
    const id = `u_${Date.now()}`;
    saveUser({
      id,
      fullName: form.fullName,
      email: form.email.trim().toLowerCase(),
      phone: `${form.cc} ${form.phone}`,
      password: form.password,
    });
    setSession({ userId: id });
    toast.success(t("signup.account_created"));
    navigate({ to: "/stockyard" });
  };

  return (
    <main className="grid min-h-screen bg-[#F0EBD8] text-[#1D2D44] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/stockyard" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#1D2D44]">
              <Warehouse className="size-5 text-[#F0EBD8]" />
            </div>
            <span className="text-lg font-bold">{t("app.name")}</span>
          </Link>
          <LanguageToggle variant="header" />
        </div>
        <h1 className="text-3xl font-bold">{t("signup.title")}</h1>
        <p className="mt-1 text-sm text-[#1D2D44]/70">
          {t("signup.have_account")}{" "}
          <a href="/?login=1" className="font-semibold underline">
            {t("auth.log_in")}
          </a>
        </p>

        <form
          onSubmit={submit}
          className="mt-6 max-w-md space-y-4 rounded-2xl border border-[#A7B3C3]/50 bg-white p-6 shadow-lg"
        >
          <Field label={t("signup.name")}>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
              placeholder="Jane Cooper"
            />
          </Field>
          <Field label={t("auth.email")}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
              placeholder="jane@company.com"
            />
          </Field>
          <Field label={t("signup.phone")}>
            <div className="flex gap-2">
              <select
                value={form.cc}
                onChange={(e) => setForm({ ...form, cc: e.target.value })}
                className={`${inputCls} w-28`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
                }
                className={`${inputCls} flex-1`}
                placeholder="5551234567"
              />
            </div>
          </Field>
          <Field label={t("signup.birthdate")}>
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label={t("signup.password")}>
            <PwdInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              show={showPwd}
              toggle={() => setShowPwd((s) => !s)}
              t={t}
            />
          </Field>
          <Field label={t("signup.confirm_password")}>
            <PwdInput
              value={form.confirm}
              onChange={(v) => setForm({ ...form, confirm: v })}
              show={showConfirm}
              toggle={() => setShowConfirm((s) => !s)}
              t={t}
            />
          </Field>
          <button className="w-full rounded-xl bg-[#1D2D44] py-3 font-semibold text-[#F0EBD8] hover:opacity-90">
            {t("signup.submit")}
          </button>
        </form>
      </div>
      <div className="hidden lg:block">
        <img src={WAREHOUSE_IMG} alt={t("signup.warehouse_alt")} className="h-full w-full object-cover" />
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#A7B3C3] bg-white px-3 py-2 text-sm text-[#1D2D44] outline-none focus:border-[#1D2D44]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function PwdInput({
  value,
  onChange,
  show,
  toggle,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} pe-10`}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute inset-y-0 end-2 flex items-center text-[#1D2D44]/60 hover:text-[#1D2D44]"
        aria-label={show ? t("common.hide_password") : t("common.show_password")}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

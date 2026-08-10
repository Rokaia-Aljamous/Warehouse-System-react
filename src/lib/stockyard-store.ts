// Simple localStorage-based store for the Stockyard demo app.
// All data lives in the browser; safe for SSR (guards against `window`).

export type SYUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string; // includes country code, e.g. "+1 5551234567"
  password: string;
};

export type SYPlan = "weekly" | "monthly" | "semiannual" | "annual";

export type SYSubscription = {
  userId: string;
  companyName: string;
  warehouseCount: number;
  slug: string;
  plan: SYPlan;
  status: "active" | "pending" | "cancelled";
  createdAt: string;
};

const K_USERS = "sy.users";
const K_SUBS = "sy.subs";
const K_SLUGS = "sy.verifiedSlugs";
const K_SESSION = "sy.session";

const isBrowser = () => typeof window !== "undefined";

function read<T>(k: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  if (!isBrowser()) return;
  localStorage.setItem(k, JSON.stringify(v));
}

// Users
export const getUsers = () => read<SYUser[]>(K_USERS, []);
export const saveUser = (u: SYUser) => {
  const users = getUsers();
  users.push(u);
  write(K_USERS, users);
};
export const findUserByPhone = (phone: string) =>
  getUsers().find((u) => u.phone.replace(/\s+/g, "") === phone.replace(/\s+/g, ""));
export const findUserByEmail = (email: string) =>
  getUsers().find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());

// Session
export const getSession = () => read<{ userId: string } | null>(K_SESSION, null);
export const setSession = (s: { userId: string } | null) => write(K_SESSION, s);

// Subscriptions
export const getSubs = () => read<SYSubscription[]>(K_SUBS, []);
export const saveSub = (s: SYSubscription) => {
  const subs = getSubs().filter((x) => x.slug !== s.slug);
  subs.push(s);
  write(K_SUBS, subs);
};
export const getSubBySlug = (slug: string) =>
  getSubs().find((s) => s.slug === slug.toLowerCase());

// Verified slugs (reserved/unique)
export const getVerifiedSlugs = (): string[] => read<string[]>(K_SLUGS, ["acme", "globex"]);
export const isSlugAvailable = (slug: string) => {
  const s = slug.toLowerCase().trim();
  if (!/^[a-z0-9-]{3,30}$/.test(s)) return false;
  const taken = new Set([...getVerifiedSlugs(), ...getSubs().map((x) => x.slug)]);
  return !taken.has(s);
};
export const reserveSlug = (slug: string) => {
  const s = slug.toLowerCase().trim();
  const arr = getVerifiedSlugs();
  if (!arr.includes(s)) {
    arr.push(s);
    write(K_SLUGS, arr);
  }
};

export const PLANS: { id: SYPlan; label: string; price: number; per: string }[] = [
  { id: "weekly", label: "Weekly", price: 29, per: "week" },
  { id: "monthly", label: "Monthly", price: 1, per: "month" },
  { id: "semiannual", label: "Semi-Annual", price: 499, per: "6 months" },
  { id: "annual", label: "Annual", price: 899, per: "year" },
];

export const WAREHOUSE_IMG =
  "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80";

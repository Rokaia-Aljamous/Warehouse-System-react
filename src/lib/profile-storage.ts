// Tiny localStorage helpers for demo profile pictures (base64 PNG/JPG).
const KEY = (role: "manager" | "admin") => `stockyard.profilePic.${role}`;

export function getProfilePic(role: "manager" | "admin"): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY(role));
}

export function setProfilePic(role: "manager" | "admin", dataUrl: string | null) {
  if (typeof window === "undefined") return;
  if (dataUrl) localStorage.setItem(KEY(role), dataUrl);
  else localStorage.removeItem(KEY(role));
  window.dispatchEvent(new CustomEvent("stockyard:profile-pic", { detail: { role } }));
}

export function subscribeProfilePic(role: "manager" | "admin", cb: (url: string | null) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<{ role: string }>;
    if (ce.detail?.role === role) cb(getProfilePic(role));
  };
  window.addEventListener("stockyard:profile-pic", handler);
  return () => window.removeEventListener("stockyard:profile-pic", handler);
}

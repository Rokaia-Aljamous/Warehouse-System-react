import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LanguageToggle({
  collapsed,
  variant = "sidebar",
}: {
  collapsed?: boolean;
  variant?: "sidebar" | "header";
}) {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(next);
    localStorage.setItem("i18nextLng", next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  const isAr = i18n.language.startsWith("ar");
  const label = isAr ? "English" : "العربية";

  if (variant === "header") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-white/10"
            aria-label={label}
          >
            <Globe className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream/70 transition hover:bg-white/10 hover:text-cream mb-1"
        >
          <Globe className="size-4 shrink-0" />
          {!collapsed && <span>{label}</span>}
        </button>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LanguageToggle({ collapsed }: { collapsed?: boolean }) {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  const label = i18n.language.startsWith("ar") ? "English" : "العربية";

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
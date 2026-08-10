import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MotionConfig } from "framer-motion";

import appCss from "../styles.css?url";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/i18n";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("common.page_not_found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("common.page_not_found.desc")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.go_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("common.error_loading")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("common.error_loading.desc")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.try_again")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.go_home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Stockyard — Warehouse Management" },
      { name: "description", content: "Unified warehouse management system" },
      { property: "og:title", content: "Stockyard" },
      { property: "og:description", content: "Unified warehouse management system" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cairo:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/logo.svg?v=2",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,});

function RootShell({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    const apply = () => {
      document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = i18n.language;

      const matches = router.state.matches;
      for (let i = matches.length - 1; i >= 0; i--) {
        const headFn = (matches[i] as unknown as { route?: { options?: { head?: () => unknown } } })
          .route?.options?.head;
        if (typeof headFn !== "function") continue;
        const head = headFn() as { meta?: Array<{ title?: string }> } | undefined;
        const title = head?.meta?.find((m) => m.title)?.title;
        if (title) {
          document.title = title;
          break;
        }
      }
    };
    apply();
    const unsub = i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, [i18n, router]);

  return (
    <html lang={i18n.language} dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const matchId = useRouterState({ select: (s) => s.matches[s.matches.length - 1]?.id });

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <Suspense fallback={null}>
            <div key={matchId} className="animate-page">
              <Outlet />
            </div>
          </Suspense>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}

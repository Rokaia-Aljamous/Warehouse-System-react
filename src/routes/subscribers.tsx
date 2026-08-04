import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchSubscribers, type BackendSubscriber } from "@/lib/subscribers-api";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/subscribers")({
  component: SubscribersPage,
  head: () => ({
    meta: [
      { title: `${i18n.t("title.subscribers")} — Stockyard` },
      { name: "description", content: i18n.t("title.subscribers_desc") },
    ],
  }),
});

function SubscribersPage() {
  const { t } = useTranslation();
  const [subs, setSubs] = useState<BackendSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSubscribers()
      .then(setSubs)
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message || t("subscribers.load_failed");
        setError(status ? `${status}: ${msg}` : msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="glass-light rounded-2xl p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("subscribers.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("subscribers.desc")}</p>
          </div>
          <LanguageToggle variant="header" />
        </div>

        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/40 hover:bg-transparent">
                <TableHead>{t("subscribers.name")}</TableHead>
                <TableHead>{t("subscribers.email")}</TableHead>
                <TableHead>{t("subscribers.company")}</TableHead>
                <TableHead>{t("subscribers.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger-fade">
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && error && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading && !error && subs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {t("subscribers.empty")}
                  </TableCell>
                </TableRow>
              )}
              {subs.map((s) => (
                <TableRow key={s.id} className="border-white/40">
                  <TableCell className="font-medium text-muted-foreground">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground">{s.tenant?.company_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.tenant?.status || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default SubscribersPage;

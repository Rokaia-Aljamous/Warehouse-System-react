import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { subscriptionStore, type SubscriptionRequest } from "@/lib/subscription-data";

export const Route = createFileRoute("/subscribers")({
  component: SubscribersPage,
  head: () => ({
    meta: [
      { title: "Subscribers — Stockyard" },
      { name: "description", content: "Read-only list of platform subscribers for admins." },
    ],
  }),
});

function SubscribersPage() {
  const [subs, setSubs] = useState<SubscriptionRequest[]>(() => (typeof window === "undefined" ? [] : subscriptionStore.list()));

  useEffect(() => {
    setSubs(subscriptionStore.list());
    const unsub = subscriptionStore.subscribe(() => setSubs(subscriptionStore.list()));
    return unsub;
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="glass-light rounded-2xl p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Platform Subscribers</h2>
            <p className="mt-1 text-sm text-muted-foreground">A simple, read-only list of users who have subscribed to the platform.</p>
          </div>
        </div>

        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/40 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    No subscribers yet.
                  </TableCell>
                </TableRow>
              )}
              {subs.map((s) => (
                <TableRow key={s.id} className="border-white/40">
                  <TableCell className="font-medium text-muted-foreground">{s.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
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

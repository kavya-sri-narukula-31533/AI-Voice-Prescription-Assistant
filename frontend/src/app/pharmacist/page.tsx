"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription } from "@/types";
import { Card, CardHeader, CardTitle, StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import { ClipboardList, Clock, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function PharmacistDashboardPage() {
  const { data: incoming, isLoading } = useQuery({
    queryKey: ["pharmacist-incoming"],
    queryFn: () =>
      prescriptionApi.list({ status: "sent_to_pharmacy", limit: 10 }).then((r) => r.data),
    refetchInterval: 15_000, // poll every 15s for real-time feel
  });

  const { data: preparing } = useQuery({
    queryKey: ["pharmacist-preparing"],
    queryFn: () =>
      prescriptionApi.list({ status: "preparing", limit: 50 }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: dispensed } = useQuery({
    queryKey: ["pharmacist-dispensed"],
    queryFn: () =>
      prescriptionApi.list({ status: "dispensed", limit: 50 }).then((r) => r.data),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pharmacy Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time prescription queue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Incoming Orders"
          value={incoming?.length ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Preparing"
          value={preparing?.length ?? 0}
          icon={<Loader2 className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Dispensed Today"
          value={dispensed?.length ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Incoming queue */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <CardTitle>Incoming Prescriptions</CardTitle>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
            <Link href="/pharmacist/orders">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>View all</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6"><PageLoader /></div>
        ) : incoming?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-300 mb-2" />
            <p className="text-gray-400">No pending prescriptions</p>
            <p className="text-sm text-gray-300">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {incoming?.map((rx: Prescription) => (
              <Link
                key={rx.id}
                href={`/pharmacist/orders/${rx.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {rx.patient?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {rx.patient?.full_name ?? "Unknown Patient"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rx.medicines.length} medicine(s) · {formatDateTime(rx.approved_at ?? rx.created_at)}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {rx.medicines.map((m) => m.medicine_name).join(", ")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={rx.status} />
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

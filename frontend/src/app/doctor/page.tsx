"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, prescriptionApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { StatCard, Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import {
  Users, FileText, Mic, CheckCircle2, Clock, TrendingUp, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

export default function DoctorDashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const { data: recentRx, isLoading: rxLoading } = useQuery({
    queryKey: ["recent-prescriptions"],
    queryFn: () => prescriptionApi.list({ limit: 5 }).then((r) => r.data),
  });

  if (statsLoading) return <PageLoader />;

  const byStatus = stats?.by_status ?? {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {getGreeting()}, Dr. {user?.full_name?.split(" ")[1] || user?.full_name} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here's what's happening with your patients today.
          </p>
        </div>
        <Link href="/doctor/prescriptions/new">
          <Button icon={<Mic className="h-4 w-4" />} size="lg">
            New Prescription
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Prescriptions"
          value={stats?.total_prescriptions ?? 0}
          icon={<FileText className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Total Patients"
          value={stats?.total_patients ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Awaiting Pharmacy"
          value={byStatus["sent_to_pharmacy"] ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Dispensed"
          value={byStatus["dispensed"] ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Prescriptions (Last 30 Days)</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats?.daily_prescriptions ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(l) => `Date: ${l}`} />
              <Line type="monotone" dataKey="count" stroke="#1a56db" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top medicines */}
        <Card>
          <CardHeader>
            <CardTitle>Top Prescribed Medicines</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.top_medicines?.slice(0, 8) ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a56db" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent prescriptions */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <CardTitle>Recent Prescriptions</CardTitle>
          <Link href="/doctor/prescriptions">
            <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
              View all
            </Button>
          </Link>
        </div>
        {rxLoading ? (
          <div className="p-6"><PageLoader /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentRx?.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No prescriptions yet</p>
            )}
            {recentRx?.map((rx: Record<string, unknown>) => (
              <Link
                key={rx.id as string}
                href={`/doctor/prescriptions/${rx.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {(rx.patient as Record<string, unknown>)?.full_name as string ?? "Patient"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(rx.medicines as unknown[])?.length ?? 0} medicine(s) · {formatDateTime(rx.created_at as string)}
                  </p>
                </div>
                <StatusBadge status={rx.status as "draft"} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { StatCard, Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { FileText, Users, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#1a56db", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  const statusData = Object.entries(stats?.by_status ?? {}).map(([status, count]) => ({
    name: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: count as number,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of prescription activity and trends</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Prescriptions" value={stats?.total_prescriptions ?? 0} icon={<FileText className="h-5 w-5" />} color="blue" />
        <StatCard title="Total Patients"      value={stats?.total_patients ?? 0}      icon={<Users className="h-5 w-5" />} color="green" />
        <StatCard title="Pending Pharmacy"    value={stats?.by_status?.sent_to_pharmacy ?? 0} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard title="Total Dispensed"     value={stats?.by_status?.dispensed ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily trend */}
        <Card>
          <CardHeader><CardTitle>Daily Prescriptions (30 days)</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.daily_prescriptions ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1a56db" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader><CardTitle>Prescription Status Distribution</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top medicines */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top 10 Most Prescribed Medicines</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.top_medicines ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a56db" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

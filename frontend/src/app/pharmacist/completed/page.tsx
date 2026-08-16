"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription } from "@/types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle2, Eye } from "lucide-react";

export default function PharmacistCompletedPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["pharmacist-dispensed"],
    queryFn: () => prescriptionApi.list({ status: "dispensed", limit: 50 }).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Completed Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orders?.length ?? 0} dispensed prescriptions</p>
      </div>

      <Card padding="none">
        {orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-400">No completed orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {orders?.map((rx: Prescription) => (
              <div key={rx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{rx.patient?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-500">
                    {rx.medicines.map(m => m.medicine_name).join(", ")} · Dispensed {formatDateTime(rx.dispensed_at ?? rx.updated_at)}
                  </p>
                </div>
                <Link href={`/pharmacist/orders/${rx.id}`}>
                  <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

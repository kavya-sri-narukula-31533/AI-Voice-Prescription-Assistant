"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription } from "@/types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import { ShoppingBag, CheckCircle2, Loader2, Package, Clock } from "lucide-react";

const PHARMACY_STATUSES = ["sent_to_pharmacy", "preparing", "ready", "dispensed"] as const;

const STATUS_STEPS = [
  { key: "sent_to_pharmacy", label: "Received by Pharmacy", icon: Package },
  { key: "preparing",        label: "Being Prepared",       icon: Loader2 },
  { key: "ready",            label: "Ready for Pickup",     icon: CheckCircle2 },
  { key: "dispensed",        label: "Dispensed",            icon: CheckCircle2 },
] as const;

export default function PatientOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["patient-orders"],
    queryFn: () => prescriptionApi.list({}).then((r) =>
      r.data.filter((rx: Prescription) => PHARMACY_STATUSES.includes(rx.status as typeof PHARMACY_STATUSES[number]))
    ),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Status</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your prescription orders in real time</p>
      </div>

      {orders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ShoppingBag className="h-14 w-14 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No active orders</p>
          <p className="text-sm text-gray-300 mt-1">Orders appear here after your doctor approves a prescription</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders?.map((rx: Prescription) => {
            const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === rx.status);
            return (
              <Card key={rx.id}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Prescription #{rx.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rx.medicines.map(m => m.medicine_name).join(", ")}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>

                {/* Progress tracker */}
                <div className="flex items-start gap-0">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStepIndex;
                    const active = i === currentStepIndex;
                    const last = i === STATUS_STEPS.length - 1;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className="flex items-center w-full">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            done
                              ? active
                                ? "bg-primary-600 text-white ring-4 ring-primary-100 scale-110"
                                : "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                          }`}>
                            {done && !active
                              ? <CheckCircle2 className="h-4 w-4" />
                              : <Icon className={`h-4 w-4 ${active ? "animate-pulse" : ""}`} />
                            }
                          </div>
                          {!last && (
                            <div className={`flex-1 h-1 transition-all ${done && !active ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                          )}
                        </div>
                        <p className={`text-xs mt-1.5 text-center max-w-[80px] leading-tight ${
                          active ? "text-primary-600 font-semibold" : done ? "text-green-600" : "text-gray-400"
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Pharmacist note */}
                {rx.pharmacist_notes && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    <p className="text-xs font-medium mb-0.5">Pharmacist Note</p>
                    {rx.pharmacist_notes}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {rx.dispensed_at
                    ? `Dispensed: ${formatDateTime(rx.dispensed_at)}`
                    : `Last updated: ${formatDateTime(rx.updated_at)}`
                  }
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

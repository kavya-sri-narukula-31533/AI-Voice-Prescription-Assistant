"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { prescriptionApi } from "@/lib/api";
import { Prescription, Medicine, PrescriptionStatus } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime, cn } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle2, Clock, Loader2, Package, User, Pill,
  AlertTriangle, Sparkles, Check, X,
} from "lucide-react";
import Link from "next/link";

const NEXT_STATUS: Partial<Record<PrescriptionStatus, { status: PrescriptionStatus; label: string; color: string }>> = {
  sent_to_pharmacy: { status: "preparing",  label: "Start Preparing",  color: "bg-amber-600 hover:bg-amber-700" },
  preparing:        { status: "ready",       label: "Mark as Ready",    color: "bg-blue-600 hover:bg-blue-700" },
  ready:            { status: "dispensed",   label: "Confirm Dispensed", color: "bg-green-600 hover:bg-green-700" },
};

export default function PharmacistOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const { data: rx, isLoading } = useQuery<Prescription>({
    queryKey: ["prescription", id],
    queryFn: () => prescriptionApi.get(id).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (newStatus: PrescriptionStatus) =>
      prescriptionApi.updatePharmacyStatus(id, {
        status: newStatus,
        pharmacist_notes: pharmacistNotes || undefined,
        medicine_availability: availability,
      }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prescription", id] });
      queryClient.invalidateQueries({ queryKey: ["pharmacist-incoming"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacist-orders"] });
      toast.success(`Status updated to: ${data.status.replace(/_/g, " ")}`);
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) return <PageLoader />;
  if (!rx) return <div className="text-center py-16 text-gray-400">Order not found</div>;

  const nextAction = NEXT_STATUS[rx.status];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pharmacist/orders">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order #{id.slice(0, 8).toUpperCase()}</h1>
              <StatusBadge status={rx.status} />
            </div>
            <p className="text-sm text-gray-500">{formatDateTime(rx.approved_at ?? rx.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Patient */}
      <Card>
        <CardHeader>
          <CardTitle><User className="h-4 w-4 inline mr-1.5 text-primary-500" />Patient</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ["Name",     rx.patient?.full_name ?? "—"],
            ["Age",      rx.patient?.age ? `${rx.patient.age}y` : "—"],
            ["Gender",   rx.patient?.gender ?? "—"],
            ["Phone",    rx.patient?.phone ?? "—"],
            ["Allergies",rx.patient?.allergies ?? "None"],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs text-gray-400 font-medium">{l}</p>
              <p className="text-gray-900 dark:text-white capitalize">{v}</p>
            </div>
          ))}
        </div>
        {rx.diagnosis && (
          <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs font-medium text-blue-600 mb-0.5">Diagnosis</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{rx.diagnosis}</p>
          </div>
        )}
      </Card>

      {/* Medicine checklist */}
      <Card>
        <CardHeader>
          <CardTitle><Pill className="h-4 w-4 inline mr-1.5 text-green-500" />Medicines</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {rx.medicines.map((med: Medicine) => (
            <div key={med.id} className="flex items-start gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{med.medicine_name}</span>
                  {med.strength && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{med.strength}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                  {med.dosage    && <span>💊 {med.dosage}</span>}
                  {med.frequency && <span>🕐 {med.frequency}</span>}
                  {med.duration  && <span>📅 {med.duration}</span>}
                  {med.quantity  && <span>🔢 Qty: {med.quantity}</span>}
                  {med.instructions && <span>📌 {med.instructions}</span>}
                </div>
              </div>
              {/* Availability toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">In stock?</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setAvailability(prev => ({ ...prev, [med.id!]: true }))}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors text-xs",
                      availability[med.id!] === true
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-green-100"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setAvailability(prev => ({ ...prev, [med.id!]: false }))}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      availability[med.id!] === false
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-100"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Summary */}
      {rx.ai_summary && (
        <div className="p-3.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 inline mr-1" />AI Summary
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">{rx.ai_summary}</p>
        </div>
      )}

      {/* Pharmacist notes + action */}
      {nextAction && (
        <Card>
          <CardTitle className="mb-3">Update Order Status</CardTitle>
          <Textarea
            label="Pharmacist notes (optional)"
            placeholder="Any notes about availability, substitutions, or patient instructions..."
            value={pharmacistNotes}
            onChange={(e) => setPharmacistNotes(e.target.value)}
            rows={2}
          />
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => updateMutation.mutate(nextAction.status)}
              loading={updateMutation.isPending}
              className={cn("flex-1", nextAction.color)}
            >
              {nextAction.label}
            </Button>
          </div>
        </Card>
      )}

      {rx.status === "dispensed" && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">Dispensed</p>
            {rx.dispensed_at && (
              <p className="text-xs text-green-600">{formatDateTime(rx.dispensed_at)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

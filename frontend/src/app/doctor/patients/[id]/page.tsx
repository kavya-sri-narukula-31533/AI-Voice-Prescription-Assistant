"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { patientApi, prescriptionApi } from "@/lib/api";
import { Patient, Prescription } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeft, Mic, User, Phone, Mail, MapPin,
  Droplets, AlertCircle, Heart, Calendar, FileText, Eye,
  ClipboardList, Activity,
} from "lucide-react";

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // ── Patient fetch ──────────────────────────────────────────────────────────
  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
  } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => patientApi.get(id).then((r) => r.data as Patient),
    retry: false,
  });

  // ── Prescriptions fetch (by patient_id) ───────────────────────────────────
  const { data: prescriptions, isLoading: rxLoading } = useQuery<Prescription[]>({
    queryKey: ["prescriptions", "patient", id],
    queryFn: () =>
      prescriptionApi.list({ patient_id: id, limit: 50 }).then((r) => r.data as Prescription[]),
    enabled: !!patient, // only run once patient is confirmed to exist
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (patientLoading) return <PageLoader />;

  // ── Not found / error ──────────────────────────────────────────────────────
  if (patientError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <User className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Patient not found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The patient you&apos;re looking for does not exist or you don&apos;t have access.
          </p>
        </div>
        <Button
          variant="outline"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.back()}
        >
          Back to Patients
        </Button>
      </div>
    );
  }

  const initials = patient.full_name.slice(0, 2).toUpperCase();
  const genderLabel = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/doctor/patients">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Patients
            </Button>
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {patient.full_name}
          </h1>
        </div>
        <Link href={`/doctor/prescriptions/new?patient=${patient.id}`}>
          <Button icon={<Mic className="h-4 w-4" />}>
            Prescribe
          </Button>
        </Link>
      </div>

      {/* ── Patient info card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{patient.full_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {patient.blood_group && (
                <Badge variant="danger">
                  <Droplets className="h-3 w-3" />
                  {patient.blood_group}
                </Badge>
              )}
              {genderLabel && <Badge variant="default">{genderLabel}</Badge>}
              {patient.age != null && (
                <Badge variant="info">{patient.age} yrs</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InfoField icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email} />
          <InfoField icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone} />
          <InfoField
            icon={<Calendar className="h-4 w-4" />}
            label="Age"
            value={patient.age != null ? `${patient.age} years` : null}
          />
          <InfoField
            icon={<Heart className="h-4 w-4" />}
            label="Gender"
            value={genderLabel}
          />
          <InfoField
            icon={<Droplets className="h-4 w-4" />}
            label="Blood Group"
            value={patient.blood_group}
          />
          <InfoField
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={patient.address}
          />
          <InfoField
            icon={<AlertCircle className="h-4 w-4" />}
            label="Known Allergies"
            value={patient.allergies}
            danger={!!patient.allergies}
          />
          <InfoField
            icon={<Activity className="h-4 w-4" />}
            label="Chronic Conditions"
            value={patient.chronic_conditions}
          />
        </div>

        {/* Medical history — full width if present */}
        {patient.medical_history && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Medical History
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {patient.medical_history}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Allergy alert banner ── */}
      {patient.allergies && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Allergy Warning</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{patient.allergies}</p>
          </div>
        </div>
      )}

      {/* ── Prescription history ── */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <CardTitle>Prescription History</CardTitle>
          <span className="text-xs text-gray-400">
            {rxLoading ? "Loading…" : `${prescriptions?.length ?? 0} record(s)`}
          </span>
        </div>

        {rxLoading ? (
          <div className="p-8">
            <PageLoader />
          </div>
        ) : !prescriptions?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No prescriptions yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one using the Prescribe button above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Medicines
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Diagnosis
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {prescriptions.map((rx) => (
                  <tr
                    key={rx.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                      {rx.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 max-w-[180px]">
                      {rx.medicines.length > 0
                        ? rx.medicines
                            .slice(0, 2)
                            .map((m) => m.medicine_name)
                            .join(", ") +
                          (rx.medicines.length > 2
                            ? ` +${rx.medicines.length - 2} more`
                            : "")
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                      {rx.diagnosis ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={rx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(rx.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/doctor/prescriptions/${rx.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="h-4 w-4" />}
                          aria-label="View prescription"
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────
function InfoField({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 ${danger ? "text-red-400" : "text-gray-400"}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-sm mt-0.5 ${
            danger
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {value ?? <span className="text-gray-400 font-normal italic">Not recorded</span>}
        </p>
      </div>
    </div>
  );
}

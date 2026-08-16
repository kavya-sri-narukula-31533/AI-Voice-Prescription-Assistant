"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api";
import { Patient } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { PatientModal } from "@/components/doctor/PatientModal";
import {
  Search, Plus, User, Phone, Mail, Droplets, AlertCircle, Eye, Mic,
} from "lucide-react";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: patients, isLoading, refetch } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => patientApi.list(search || undefined).then((r) => r.data),
    staleTime: 10_000,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients?.length ?? 0} registered patients</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          Add Patient
        </Button>
      </div>

      <Input
        placeholder="Search by name, phone or email..."
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients?.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
              <User className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No patients found</p>
              <Button icon={<Plus className="h-4 w-4" />} size="sm" className="mt-3" onClick={() => setShowModal(true)}>
                Register first patient
              </Button>
            </div>
          )}
          {patients?.map((p: Patient) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                  {p.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {[p.age && `${p.age}y`, p.gender && p.gender.charAt(0).toUpperCase() + p.gender.slice(1)].filter(Boolean).join(", ") || "No demographics"}
                  </p>
                </div>
                {p.blood_group && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                    <Droplets className="h-3 w-3" />
                    {p.blood_group}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4">
                {p.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {p.phone}
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.email}</span>
                  </div>
                )}
                {p.allergies && (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.allergies}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Link href={`/doctor/patients/${p.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full" icon={<Eye className="h-3.5 w-3.5" />}>
                    View
                  </Button>
                </Link>
                <Link href={`/doctor/prescriptions/new?patient=${p.id}`} className="flex-1">
                  <Button size="sm" className="w-full" icon={<Mic className="h-3.5 w-3.5" />}>
                    Prescribe
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PatientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { refetch(); setShowModal(false); }}
      />
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, Plus, X } from "lucide-react";
import { patientApi } from "@/lib/api";
import { Patient } from "@/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/shared/LoadingSpinner";

interface PatientSearchProps {
  selectedPatient: Patient | null;
  onSelect: (patient: Patient) => void;
  onClear: () => void;
  onCreateNew?: () => void;
}

export function PatientSearch({ selectedPatient, onSelect, onClear, onCreateNew }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patient-search", query],
    queryFn: () => patientApi.list(query, 0, 8).then((r) => r.data),
    enabled: query.length >= 1,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (selectedPatient) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
          {selectedPatient.full_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.full_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {[
              selectedPatient.age && `${selectedPatient.age}y`,
              selectedPatient.gender && selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1),
              selectedPatient.phone,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          aria-label="Remove patient"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search patient by name, phone, or email..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={cn(
            "w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300",
            "bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white",
            "focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            "placeholder:text-gray-400"
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {open && query.length >= 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
          {patients?.length === 0 && !isLoading && (
            <div className="p-3">
              <p className="text-sm text-gray-500 text-center mb-2">No patients found for "{query}"</p>
              {onCreateNew && (
                <button
                  onClick={() => { setOpen(false); onCreateNew(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Register new patient "{query}"
                </button>
              )}
            </div>
          )}

          {patients?.map((p: Patient) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{p.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[
                    p.age && `${p.age}y`,
                    p.gender,
                    p.phone,
                    p.email,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              {p.blood_group && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                  {p.blood_group}
                </span>
              )}
            </button>
          ))}

          {patients && patients.length > 0 && onCreateNew && (
            <button
              onClick={() => { setOpen(false); onCreateNew(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-gray-100 dark:border-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Register new patient
            </button>
          )}
        </div>
      )}
    </div>
  );
}

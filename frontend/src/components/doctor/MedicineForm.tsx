"use client";

import React from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Pill, Plus, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface PrescriptionFormValues {
  patient_id: string;
  diagnosis: string;
  notes: string;
  medicines: {
    medicine_name: string;
    generic_name?: string;
    strength?: string;
    quantity?: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }[];
}

interface MedicineFormProps {
  form: UseFormReturn<PrescriptionFormValues>;
  warnings?: string[];
}

const FREQUENCY_OPTIONS = [
  "Once daily (OD)", "Twice daily (BD)", "Three times a day (TDS)",
  "Four times a day (QDS)", "Every 6 hours", "Every 8 hours",
  "Every 12 hours", "At bedtime", "As needed (SOS)",
];

const DURATION_OPTIONS = [
  "3 days", "5 days", "7 days", "10 days", "14 days",
  "21 days", "1 month", "2 months", "3 months", "Ongoing",
];

export function MedicineForm({ form, warnings }: MedicineFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medicines",
  });

  const addMedicine = () => {
    append({
      medicine_name: "",
      generic_name: "",
      strength: "",
      quantity: undefined,
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
  };

  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-4">
      {/* Drug interaction warnings */}
      {warnings && warnings.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-700 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">Drug Interaction Warnings</p>
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400 pl-6">{w}</p>
          ))}
        </div>
      )}

      {/* Duplicate detection notice */}
      {fields.length > 1 && (() => {
        const names = fields.map((f, i) =>
          (form.watch(`medicines.${i}.medicine_name`) || "").toLowerCase().trim()
        );
        const dups = names.filter((n, i) => n && names.indexOf(n) !== i);
        return dups.length > 0 ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
            ⚠️ Duplicate medicine detected: <strong>{dups.join(", ")}</strong>
          </div>
        ) : null;
      })()}

      {/* Medicine rows */}
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="group relative p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            <Pill className="h-4 w-4 text-primary-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Medicine #{index + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(index)}
              className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove medicine"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Row 1: Name + Generic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Medicine name *"
              placeholder="e.g. Paracetamol"
              error={(errors.medicines?.[index] as Record<string, { message?: string }>)?.medicine_name?.message}
              {...register(`medicines.${index}.medicine_name`, { required: "Required" })}
            />
            <Input
              label="Generic name"
              placeholder="e.g. Acetaminophen"
              {...register(`medicines.${index}.generic_name`)}
            />
          </div>

          {/* Row 2: Strength + Quantity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Strength"
              placeholder="500mg"
              {...register(`medicines.${index}.strength`)}
            />
            <Input
              label="Quantity"
              type="number"
              placeholder="10"
              min={1}
              {...register(`medicines.${index}.quantity`, { valueAsNumber: true })}
            />
            <Input
              label="Dosage"
              placeholder="1 tablet"
              {...register(`medicines.${index}.dosage`)}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <input
                list={`freq-list-${index}`}
                placeholder="Twice daily"
                className={cn(
                  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
                  "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                  "dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                )}
                {...register(`medicines.${index}.frequency`)}
              />
              <datalist id={`freq-list-${index}`}>
                {FREQUENCY_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
          </div>

          {/* Row 3: Duration + Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration
              </label>
              <input
                list={`dur-list-${index}`}
                placeholder="5 days"
                className={cn(
                  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
                  "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                  "dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                )}
                {...register(`medicines.${index}.duration`)}
              />
              <datalist id={`dur-list-${index}`}>
                {DURATION_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <Input
              label="Instructions"
              placeholder="After food, with water"
              {...register(`medicines.${index}.instructions`)}
            />
          </div>
        </div>
      ))}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        onClick={addMedicine}
        icon={<Plus className="h-4 w-4" />}
        className="w-full border-dashed"
      >
        Add Medicine
      </Button>
    </div>
  );
}

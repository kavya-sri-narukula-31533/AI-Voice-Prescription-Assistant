"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { patientApi } from "@/lib/api";
import { Patient } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  full_name: z.string().min(2, "Full name required"),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => ({ value: b, label: b }));

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (patient: Patient) => void;
  initialName?: string;
}

export function PatientModal({ isOpen, onClose, onCreated, initialName }: PatientModalProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: initialName ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      patientApi.create(data as Record<string, unknown>).then((r) => r.data),
    onSuccess: (patient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["patient-search"] });
      toast.success(`Patient ${patient.full_name} registered!`);
      onCreated(patient);
      reset();
      onClose();
    },
    onError: () => toast.error("Failed to register patient"),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Patient" size="xl">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full name *"
            placeholder="Rahul Kumar"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
          <Input
            label="Age"
            type="number"
            placeholder="35"
            {...register("age", { valueAsNumber: true })}
          />
          <Select
            label="Gender"
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            {...register("gender")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="patient@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Select
            label="Blood group"
            options={BLOOD_GROUPS}
            placeholder="Select blood group"
            {...register("blood_group")}
          />
        </div>

        <Textarea
          label="Known allergies"
          placeholder="Penicillin, Sulfa drugs..."
          rows={2}
          {...register("allergies")}
        />

        <Textarea
          label="Chronic conditions"
          placeholder="Diabetes Type 2, Hypertension..."
          rows={2}
          {...register("chronic_conditions")}
        />

        <Textarea
          label="Address"
          placeholder="House no, Street, City..."
          rows={2}
          {...register("address")}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} className="flex-1">
            Register Patient
          </Button>
        </div>
      </form>
    </Modal>
  );
}

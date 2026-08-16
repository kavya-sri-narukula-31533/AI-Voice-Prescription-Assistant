"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Stethoscope, Mail, Lock, User, Phone, Building2, Hash } from "lucide-react";

import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(2, "Full name required"),
  phone: z.string().optional(),
  role: z.enum(["doctor", "pharmacist", "patient"]),
});

const doctorSchema = baseSchema.extend({
  specialization: z.string().min(2, "Required"),
  hospital: z.string().optional(),
  registration_number: z.string().min(2, "Required"),
});

type FormData = z.infer<typeof doctorSchema>;

const ROLE_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "patient", label: "Patient" },
];

const SPECIALIZATIONS = [
  "General Physician", "Cardiologist", "Dermatologist", "ENT Specialist",
  "Gastroenterologist", "Neurologist", "Oncologist", "Ophthalmologist",
  "Orthopedic Surgeon", "Pediatrician", "Psychiatrist", "Pulmonologist",
  "Radiologist", "Urologist", "Other"
].map(s => ({ value: s, label: s }));

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string>("doctor");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(selectedRole === "doctor" ? doctorSchema : baseSchema),
    defaultValues: { role: "doctor" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      let res;
      if (data.role === "doctor") {
        res = await authApi.registerDoctor(data);
      } else {
        res = await authApi.register(data);
      }

      toast.success("Account created successfully. Please login.");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-600 shadow-lg mb-3">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the AI Prescription Platform</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Account type"
              options={ROLE_OPTIONS}
              {...register("role")}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setValue("role", e.target.value as "doctor" | "pharmacist" | "patient");
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full name"
                placeholder="Dr. Priya Sharma"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.full_name?.message}
                {...register("full_name")}
              />
              <Input
                label="Phone number"
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="h-4 w-4" />}
                {...register("phone")}
              />
            </div>

            <Input
              label="Email address"
              type="email"
              placeholder="you@hospital.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register("password")}
            />

            {selectedRole === "doctor" && (
              <>
                <Select
                  label="Specialization"
                  options={SPECIALIZATIONS}
                  placeholder="Select specialization"
                  error={(errors as Record<string, { message?: string }>).specialization?.message}
                  {...register("specialization")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Hospital / Clinic"
                    placeholder="Apollo Hospital"
                    leftIcon={<Building2 className="h-4 w-4" />}
                    {...register("hospital")}
                  />
                  <Input
                    label="Registration No."
                    placeholder="MCI-12345"
                    leftIcon={<Hash className="h-4 w-4" />}
                    error={(errors as Record<string, { message?: string }>).registration_number?.message}
                    {...register("registration_number")}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

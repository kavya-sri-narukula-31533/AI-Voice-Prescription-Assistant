"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Stethoscope, Mail, Lock, Eye, EyeOff } from "lucide-react";

import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
  try {
    const res = await authApi.login(data.email, data.password);
    console.log("Login response:", res.data);
    const {
      access_token,
      refresh_token,
      role,
      full_name,
    } = res.data;

    // ✅ Save tokens FIRST
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    console.log("Access Token:", localStorage.getItem("access_token"));
    console.log("Refresh Token:", localStorage.getItem("refresh_token"));
    // ✅ Now /auth/me will include the Bearer token
    console.log("Calling /auth/me...");
    const meRes = await authApi.me();
    console.log("User profile:", meRes.data);
    setAuth(meRes.data, access_token, refresh_token);

    toast.success(`Welcome back, ${full_name}!`);

    const dest =
      role === "doctor"
        ? "/doctor"
        : role === "pharmacist"
        ? "/pharmacist"
        : "/patient";

    router.push(dest);
  } catch (err: unknown) {
  console.error("Full Error:", err);

  const msg =
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
    "Login failed. Please check your credentials.";

  console.error("Error Message:", msg);

  toast.error(msg);
}
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 shadow-lg mb-4">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Prescription</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Voice-powered prescription management</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="doctor@hospital.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary-600 font-medium hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-medium mb-1">Demo accounts:</p>
          <p>Doctor: doctor@demo.com / password123</p>
          <p>Pharmacist: pharma@demo.com / password123</p>
          <p>Patient: patient@demo.com / password123</p>
        </div>
      </div>
    </div>
  );
}

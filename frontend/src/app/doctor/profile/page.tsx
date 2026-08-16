"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { generateInitials } from "@/lib/utils";
import {
  User, Mail, Phone, Stethoscope, Hash, Building2,
  Edit3, KeyRound, LogOut, Save, X, CheckCircle2, AlertCircle,
} from "lucide-react";

// ── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { message: string; type: "success" | "error" }
function Toast({ message, type }: ToastMsg) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium animate-fade-in ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
      {type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
interface DoctorProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_active: boolean;
  specialization?: string | null;
  hospital?: string | null;
  registration_number?: string | null;
  qualifications?: string | null;
}

interface FormState {
  full_name: string;
  phone: string;
  specialization: string;
  hospital: string;
  registration_number: string;
  qualifications: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DoctorProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateUser, logout } = useAuthStore();

  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const [form, setForm] = useState<FormState>({
    full_name: "", phone: "", specialization: "",
    hospital: "", registration_number: "", qualifications: "",
  });

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<DoctorProfile>({
    queryKey: ["doctor-profile"],
    queryFn: () => profileApi.get().then((r) => r.data as DoctorProfile),
  });

  // Initialise form when data arrives
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        specialization: profile.specialization ?? "",
        hospital: profile.hospital ?? "",
        registration_number: profile.registration_number ?? "",
        qualifications: profile.qualifications ?? "",
      });
    }
  }, [profile]);

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => profileApi.update(data),
    onSuccess: (res) => {
      queryClient.setQueryData<DoctorProfile>(["doctor-profile"], res.data as DoctorProfile);
      updateUser({ full_name: (res.data as DoctorProfile).full_name, phone: (res.data as DoctorProfile).phone ?? undefined });
      setEditMode(false);
      showToast("Profile updated successfully", "success");
    },
    onError: () => showToast("Failed to update profile", "error"),
  });

  // ── Change password ────────────────────────────────────────────────────────
  const pwMutation = useMutation({
    mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
      authApi.changePassword(current_password, new_password),
    onSuccess: () => {
      setPwMode(false);
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setPwError("");
      showToast("Password changed successfully", "success");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(msg ?? "Failed to change password", "error");
    },
  });

  const handleLogout = () => { logout(); router.push("/login"); };

  const handleSaveProfile = () => {
    updateMutation.mutate({
      full_name: form.full_name,
      phone: form.phone || null,
      specialization: form.specialization,
      hospital: form.hospital || null,
      registration_number: form.registration_number,
      qualifications: form.qualifications || null,
    });
  };

  const handleChangePassword = () => {
    setPwError("");
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError("New passwords do not match"); return; }
    if (pwForm.new_password.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    pwMutation.mutate({ current_password: pwForm.current_password, new_password: pwForm.new_password });
  };

  const cancelEdit = () => {
    setEditMode(false);
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        specialization: profile.specialization ?? "",
        hospital: profile.hospital ?? "",
        registration_number: profile.registration_number ?? "",
        qualifications: profile.qualifications ?? "",
      });
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal and professional information</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          {!editMode && (
            <Button variant="outline" size="sm" icon={<Edit3 className="h-4 w-4" />} onClick={() => setEditMode(true)}>
              Edit Profile
            </Button>
          )}
        </CardHeader>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile?.full_name ? generateInitials(profile.full_name) : "DR"}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="info">Doctor</Badge>
              {profile?.is_active && <Badge variant="success">Active</Badge>}
            </div>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} leftIcon={<User className="h-4 w-4" />} required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} leftIcon={<Phone className="h-4 w-4" />} placeholder="+1 234 567 8900" />
              <Input label="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} leftIcon={<Stethoscope className="h-4 w-4" />} required />
              <Input label="Hospital / Clinic" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} leftIcon={<Building2 className="h-4 w-4" />} />
              <Input label="License Number" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} leftIcon={<Hash className="h-4 w-4" />} required />
              <Input label="Qualifications" value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="MBBS, MD, etc." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveProfile} loading={updateMutation.isPending} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
              <Button variant="outline" onClick={cancelEdit} icon={<X className="h-4 w-4" />}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <ProfileField icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email} />
            <ProfileField icon={<Phone className="h-4 w-4" />} label="Phone" value={profile?.phone} />
            <ProfileField icon={<Stethoscope className="h-4 w-4" />} label="Specialization" value={profile?.specialization} />
            <ProfileField icon={<Building2 className="h-4 w-4" />} label="Hospital / Clinic" value={profile?.hospital} />
            <ProfileField icon={<Hash className="h-4 w-4" />} label="License Number" value={profile?.registration_number} />
            <ProfileField icon={<User className="h-4 w-4" />} label="Qualifications" value={profile?.qualifications} />
          </div>
        )}
      </Card>

      {/* Security card */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          {!pwMode && (
            <Button variant="outline" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={() => setPwMode(true)}>
              Change Password
            </Button>
          )}
        </CardHeader>
        {pwMode ? (
          <div className="space-y-4 max-w-sm">
            <Input label="Current Password" type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} leftIcon={<KeyRound className="h-4 w-4" />} />
            <Input label="New Password" type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} leftIcon={<KeyRound className="h-4 w-4" />} hint="Minimum 8 characters" />
            <Input label="Confirm New Password" type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} leftIcon={<KeyRound className="h-4 w-4" />} error={pwError} />
            <div className="flex gap-3 pt-1">
              <Button onClick={handleChangePassword} loading={pwMutation.isPending} icon={<Save className="h-4 w-4" />}>Update Password</Button>
              <Button variant="outline" onClick={() => { setPwMode(false); setPwForm({ current_password: "", new_password: "", confirm_password: "" }); setPwError(""); }} icon={<X className="h-4 w-4" />}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Keep your account secure by using a strong, unique password.</p>
        )}
      </Card>

      {/* Account / Logout */}
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Sign out</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign out of your account on this device</p>
          </div>
          <Button variant="danger" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>Logout</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────
function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white mt-0.5">
          {value ?? <span className="text-gray-400 italic">Not set</span>}
        </p>
      </div>
    </div>
  );
}

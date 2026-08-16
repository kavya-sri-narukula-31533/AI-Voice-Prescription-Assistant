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
  User, Mail, Phone, Building2, Hash, MapPin,
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
interface PharmacistProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_active: boolean;
  pharmacy_name?: string | null;
  license_number?: string | null;
  address?: string | null;
}

interface FormState {
  full_name: string;
  phone: string;
  pharmacy_name: string;
  license_number: string;
  address: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PharmacistProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateUser, logout } = useAuthStore();

  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const [form, setForm] = useState<FormState>({ full_name: "", phone: "", pharmacy_name: "", license_number: "", address: "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<PharmacistProfile>({
    queryKey: ["pharmacist-profile"],
    queryFn: () => profileApi.get().then((r) => r.data as PharmacistProfile),
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        pharmacy_name: profile.pharmacy_name ?? "",
        license_number: profile.license_number ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => profileApi.update(data),
    onSuccess: (res) => {
      queryClient.setQueryData<PharmacistProfile>(["pharmacist-profile"], res.data as PharmacistProfile);
      updateUser({ full_name: (res.data as PharmacistProfile).full_name, phone: (res.data as PharmacistProfile).phone ?? undefined });
      setEditMode(false);
      showToast("Profile updated successfully", "success");
    },
    onError: () => showToast("Failed to update profile", "error"),
  });

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
      pharmacy_name: form.pharmacy_name || null,
      license_number: form.license_number || null,
      address: form.address || null,
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
      setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", pharmacy_name: profile.pharmacy_name ?? "", license_number: profile.license_number ?? "", address: profile.address ?? "" });
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal and pharmacy information</p>
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
          <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile?.full_name ? generateInitials(profile.full_name) : "PH"}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="success">Pharmacist</Badge>
              {profile?.is_active && <Badge variant="info">Active</Badge>}
            </div>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} leftIcon={<User className="h-4 w-4" />} required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} leftIcon={<Phone className="h-4 w-4" />} placeholder="+1 234 567 8900" />
              <Input label="Pharmacy Name" value={form.pharmacy_name} onChange={(e) => setForm({ ...form, pharmacy_name: e.target.value })} leftIcon={<Building2 className="h-4 w-4" />} />
              <Input label="License Number" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} leftIcon={<Hash className="h-4 w-4" />} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} leftIcon={<MapPin className="h-4 w-4" />} className="sm:col-span-2" />
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
            <ProfileField icon={<Building2 className="h-4 w-4" />} label="Pharmacy Name" value={profile?.pharmacy_name} />
            <ProfileField icon={<Hash className="h-4 w-4" />} label="License Number" value={profile?.license_number} />
            <ProfileField icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
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

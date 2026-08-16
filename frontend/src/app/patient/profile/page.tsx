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
  User, Mail, Phone, Calendar, Heart, Droplets, AlertTriangle, MapPin,
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
interface PatientProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_active: boolean;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  address?: string | null;
}

interface FormState {
  full_name: string;
  phone: string;
  age: string;
  gender: string;
  blood_group: string;
  allergies: string;
  address: string;
}

const GENDER_OPTIONS = ["male", "female", "other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PatientProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateUser, logout } = useAuthStore();

  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const [form, setForm] = useState<FormState>({ full_name: "", phone: "", age: "", gender: "", blood_group: "", allergies: "", address: "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<PatientProfile>({
    queryKey: ["patient-profile"],
    queryFn: () => profileApi.get().then((r) => r.data as PatientProfile),
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        age: profile.age != null ? String(profile.age) : "",
        gender: profile.gender ?? "",
        blood_group: profile.blood_group ?? "",
        allergies: profile.allergies ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => profileApi.update(data),
    onSuccess: (res) => {
      queryClient.setQueryData<PatientProfile>(["patient-profile"], res.data as PatientProfile);
      updateUser({ full_name: (res.data as PatientProfile).full_name, phone: (res.data as PatientProfile).phone ?? undefined });
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
      age: form.age ? parseInt(form.age, 10) : null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,
      allergies: form.allergies || null,
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
      setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", age: profile.age != null ? String(profile.age) : "", gender: profile.gender ?? "", blood_group: profile.blood_group ?? "", allergies: profile.allergies ?? "", address: profile.address ?? "" });
    }
  };

  if (isLoading) return <PageLoader />;

  const selectClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal and medical information</p>
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
          <div className="h-16 w-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile?.full_name ? generateInitials(profile.full_name) : "PT"}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="warning">Patient</Badge>
              {profile?.is_active && <Badge variant="success">Active</Badge>}
            </div>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} leftIcon={<User className="h-4 w-4" />} required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} leftIcon={<Phone className="h-4 w-4" />} placeholder="+1 234 567 8900" />
              <Input label="Age" type="number" min={0} max={150} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} leftIcon={<Calendar className="h-4 w-4" />} />

              {/* Gender */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={selectClass}>
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Blood group */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} className={selectClass}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <Input label="Known Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} leftIcon={<AlertTriangle className="h-4 w-4" />} placeholder="e.g. Penicillin, Peanuts" />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} leftIcon={<MapPin className="h-4 w-4" />} />
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
            <ProfileField icon={<Calendar className="h-4 w-4" />} label="Age" value={profile?.age != null ? `${profile.age} years` : null} />
            <ProfileField icon={<Heart className="h-4 w-4" />} label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null} />
            <ProfileField icon={<Droplets className="h-4 w-4" />} label="Blood Group" value={profile?.blood_group} />
            <ProfileField icon={<AlertTriangle className="h-4 w-4" />} label="Known Allergies" value={profile?.allergies} />
            <ProfileField icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
          </div>
        )}
      </Card>

      {/* Medical summary highlight */}
      {!editMode && (profile?.blood_group || profile?.allergies) && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-300">Medical Summary</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-4">
            {profile?.blood_group && (
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Blood Group: <strong>{profile.blood_group}</strong></span>
              </div>
            )}
            {profile?.allergies && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allergies: <strong>{profile.allergies}</strong></span>
              </div>
            )}
          </div>
        </Card>
      )}

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

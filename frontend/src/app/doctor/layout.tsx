"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  LayoutDashboard, Users, FileText, Mic, BarChart2, ClipboardList, User,
} from "lucide-react";

const sidebarItems = [
  { label: "Dashboard",        href: "/doctor",                   icon: LayoutDashboard },
  { label: "Patients",         href: "/doctor/patients",          icon: Users },
  { label: "New Prescription", href: "/doctor/prescriptions/new", icon: Mic },
  { label: "Prescriptions",    href: "/doctor/prescriptions",     icon: FileText },
  { label: "Analytics",        href: "/doctor/analytics",         icon: BarChart2 },
  { label: "Audit Logs",       href: "/doctor/audit-logs",        icon: ClipboardList },
  { label: "My Profile",       href: "/doctor/profile",           icon: User },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait until zustand-persist has finished reading from localStorage.
    // Without this guard, the layout redirects to /login on every page
    // refresh because the store starts with isAuthenticated=false before
    // the persisted state is loaded.
    if (!_hasHydrated) return;

    if (!isAuthenticated || user?.role !== "doctor") {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  // Show a loader while hydrating OR while the user isn't confirmed as a doctor.
  // This prevents a flash of the login redirect.
  if (!_hasHydrated || !isAuthenticated || user?.role !== "doctor") {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} title="Doctor Panel" />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

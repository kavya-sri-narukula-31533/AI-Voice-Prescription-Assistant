"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { FileText, ShoppingBag, User } from "lucide-react";

const sidebarItems = [
  { label: "My Prescriptions", href: "/patient",         icon: FileText },
  { label: "Order Status",     href: "/patient/orders",  icon: ShoppingBag },
  { label: "My Profile",       href: "/patient/profile", icon: User },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for zustand-persist rehydration before checking auth.
    if (!_hasHydrated) return;

    if (!isAuthenticated || user?.role !== "patient") {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  if (!_hasHydrated || !isAuthenticated || user?.role !== "patient") {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} title="Patient Portal" />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

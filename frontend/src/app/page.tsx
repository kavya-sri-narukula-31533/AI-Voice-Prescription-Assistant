"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { PageLoader } from "@/components/shared/LoadingSpinner";

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    const dest =
      user?.role === "doctor"
        ? "/doctor"
        : user?.role === "pharmacist"
        ? "/pharmacist"
        : "/patient";
    router.replace(dest);
  }, [isAuthenticated, user, router]);

  return <PageLoader />;
}

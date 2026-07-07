"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/store";

/** Redirector raíz: login → onboarding (rol) → playground. */
export default function Home() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (!user.role) router.replace("/onboarding");
    else router.replace("/playground");
  }, [hydrated, user, router]);

  return <div className="app-loading">Cargando Work.Code...</div>;
}

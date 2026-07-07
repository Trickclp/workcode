"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/store";

/** /work redirige a la sección por defecto según el rol. */
export default function WorkIndexPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated || !user?.role) return;
    router.replace(user.role === "profesor" ? "/work/classes" : "/work/tasks");
  }, [hydrated, user, router]);

  return <div className="app-loading">Abriendo Work...</div>;
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/store";
import { TeacherClasses, TeacherCreate, TeacherMetrics } from "@/components/work/teacher";
import { StudentGrades, StudentSubmissions, StudentTasks } from "@/components/work/student";

const SECTIONS: Record<string, { role: "profesor" | "alumno"; view: React.ComponentType }> = {
  classes: { role: "profesor", view: TeacherClasses },
  create: { role: "profesor", view: TeacherCreate },
  metrics: { role: "profesor", view: TeacherMetrics },
  tasks: { role: "alumno", view: StudentTasks },
  submissions: { role: "alumno", view: StudentSubmissions },
  grades: { role: "alumno", view: StudentGrades },
};

export default function WorkSectionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const entry = SECTIONS[params.section];

  // Si la sección no existe o no corresponde al rol, vuelve al índice de Work.
  useEffect(() => {
    if (!hydrated || !user?.role) return;
    if (!entry || entry.role !== user.role) router.replace("/work");
  }, [hydrated, user, entry, router]);

  if (!hydrated || !user?.role || !entry || entry.role !== user.role) {
    return <div className="app-loading">Cargando...</div>;
  }

  const View = entry.view;
  return <View />;
}

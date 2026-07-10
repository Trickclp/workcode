import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const SITE_URL = "https://workcode-ten.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Work.Code — Plataforma IDE Educativa",
  description:
    "Escribe, ejecuta y entrega código en 13 lenguajes. Auto-evaluación instantánea, debugger visual y AI Tutor para alumnos y profesores universitarios.",
  applicationName: "Work.Code",
  openGraph: {
    title: "Work.Code — Programa, entrega y califica en el navegador",
    description:
      "Plataforma IDE educativa: 13 lenguajes, auto-corrección instantánea, debugger visual y AI Tutor. Para alumnos y profesores universitarios.",
    url: SITE_URL,
    siteName: "Work.Code",
    locale: "es",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Work.Code — Plataforma IDE Educativa",
    description:
      "13 lenguajes, auto-corrección instantánea, debugger visual y AI Tutor. Para alumnos y profesores.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#181818",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

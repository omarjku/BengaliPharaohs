import type { Metadata, Viewport } from "next";
import { Geist, Hind_Siliguri } from "next/font/google";
import { Providers } from "@/components/app/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Fonts are downloaded at build time and served from our own origin, so Bangla renders offline.
const bangla = Hind_Siliguri({ variable: "--font-bangla", subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"] });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ধানসাথী · DhanSathi",
  description: "Offline rice leaf check and after-flood advice in Bangla, with hand-off to the agriculture officer.",
  appleWebApp: { capable: true, title: "ধানসাথী", statusBarStyle: "default" },
  icons: { apple: "/icon-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6b3e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes sets the class and the language provider sets `lang` before React hydrates.
    <html lang="bn" suppressHydrationWarning className={`${bangla.variable} ${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

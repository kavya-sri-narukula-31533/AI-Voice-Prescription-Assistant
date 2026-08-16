import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/shared/QueryProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Voice Prescription Assistant",
  description: "Digitize prescriptions with AI-powered voice recognition and NLP",
  keywords: ["healthcare", "prescription", "AI", "voice", "medical"],
  authors: [{ name: "AI Prescription Team" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--toast-bg, #1f2937)",
                  color: "#f9fafb",
                  borderRadius: "12px",
                  fontSize: "14px",
                },
                success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
                error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

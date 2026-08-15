import type { Metadata } from "next";
import { Literata, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppState";
import { Nav } from "@/components/Nav";

const display = Literata({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "КорпусСмета — расчёт корпусной мебели",
  description:
    "Быстрая прикидка и подробная смета встраиваемой корпусной мебели с экспортом в Excel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AppProvider>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Jersey_10, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const jersey10 = Jersey_10({
  variable: "--font-score",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "BantuIn: Bantuan Sekitar Kosmu",
  description:
    "Micro help board dan panic button untuk anak kos. Minta bantuan, kumpulin Karma Baik, dan bangun komunitas yang saling peduli dalam radius 500 meter.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dark = (await cookies()).get("theme")?.value === "dark";

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${pixelifySans.variable} ${jersey10.variable} h-full antialiased${
        dark ? " dark" : ""
      }`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

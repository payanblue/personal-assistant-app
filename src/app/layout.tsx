import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "나의 비서",
  description: "메모, 업무, 일정과 날씨를 가볍게 관리하는 개인비서",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assistant-icon.svg", apple: "/assistant-icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "나의 비서" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

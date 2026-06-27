import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navigation from "@/components/Navigation";
import AuthSessionProvider from "@/components/SessionProvider";
import QuickCapture from "@/components/QuickCapture";
import PushNotifications from "@/components/PushNotifications";
import FocusTimer from "@/components/FocusTimer";

export const metadata: Metadata = {
  title: "Efficiency",
  description: "Daily workflow for high performers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Efficiency" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('darkMode');if(s===null||s==='true')document.documentElement.classList.add('dark');})();` }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/push-sw.js');` }} />
      </head>
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white min-h-screen transition-colors duration-200">
        <AuthSessionProvider>
          <Navigation />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-32 sm:py-10">
            {children}
          </main>
          <QuickCapture />
          <PushNotifications />
          <FocusTimer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

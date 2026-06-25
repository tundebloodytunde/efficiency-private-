import "./globals.css";
import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import AuthSessionProvider from "@/components/SessionProvider";
import QuickCapture from "@/components/QuickCapture";
import PushNotifications from "@/components/PushNotifications";

export const metadata: Metadata = {
  title: "Efficiency",
  description: "Daily workflow for high performers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Efficiency" },
  icons: { apple: "/apple-touch-icon.png" },
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
          <main className="max-w-4xl mx-auto px-6 py-10">
            {children}
          </main>
          <QuickCapture />
          <PushNotifications />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

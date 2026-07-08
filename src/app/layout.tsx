import { Inter } from "next/font/google";
import "../index.css";
import { AuthProvider } from "../contexts/AuthContext";
import { SeedProvider } from "../components/SeedProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-gray-900 bg-gray-50`}>
        <AuthProvider>
          <SeedProvider>
            {children}
          </SeedProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

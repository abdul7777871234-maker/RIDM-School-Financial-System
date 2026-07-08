import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epwihiscgahxxhfmlrqn.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd2loaXNjZ2FoeHhoZm1scnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTgyNzIsImV4cCI6MjA5OTA5NDI3Mn0.nbXMqbcjHQVPZFseBsTEHif7Z0KMGjNV7wwTyad6Jsc',
  }
};

export default nextConfig;

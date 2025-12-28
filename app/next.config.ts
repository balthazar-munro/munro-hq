import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No env overrides - use .env.local values directly
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'snufktqyvetrevtdmzlt.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;

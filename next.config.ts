import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin', 'jose', 'jwks-rsa'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'mcjp.io',
          },
        ],
        destination: 'https://blog.mcjp.io/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

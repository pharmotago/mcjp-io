import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

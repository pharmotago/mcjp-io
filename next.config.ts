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
      { source: '/posts/money_cryptocurrency_risks', destination: '/posts/money_crypto_investments', permanent: true },
      { source: '/posts/life_work_life_balance', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
      { source: '/posts/life_balancing_career_family', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
      { source: '/posts/life_balancing_success', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
      { source: '/posts/discipline_habit_breaking', destination: '/posts/discipline_habit_creation', permanent: true },
      { source: '/posts/discipline_focus_techniques', destination: '/posts/discipline_focus_productivity', permanent: true },
      { source: '/posts/discipline_neuroplasticity_growth', destination: '/posts/discipline_neuroplasticity_enhancement', permanent: true },
      { source: '/posts/life_modern_mentorship', destination: '/posts/life_masculine_mentorship', permanent: true },
      { source: '/posts/life_power_of_mentorship', destination: '/posts/life_masculine_mentorship', permanent: true },
      { source: '/posts/discipline_physical_training', destination: '/posts/discipline_physical_cognitive_training', permanent: true },
    ];
  },
};

export default nextConfig;

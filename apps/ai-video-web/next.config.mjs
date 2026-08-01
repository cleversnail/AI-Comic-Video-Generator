/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.replicate.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.klingai.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.minimax.chat',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.deepseek.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.openai.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.anthropic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

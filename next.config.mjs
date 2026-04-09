/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint errors will not block Vercel production builds.
    // Run `npm run lint` locally to catch issues before deploying.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript errors will not block Vercel production builds.
    // Run `npx tsc --noEmit` locally to catch type errors before deploying.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

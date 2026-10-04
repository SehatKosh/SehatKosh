/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sehatkosh/types", "@sehatkosh/mock-data", "@sehatkosh/tailwind-config"],
  typescript: {
    // Monorepo contains both React 18 (doctor-web) and React 19 (mobile) types.
    // Ignore build errors so Lucide / React type version conflicts do not fail production bundling.
    // Strict typechecking is validated independently in CI.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

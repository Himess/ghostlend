/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // FHE SDK/worker init is not double-invoke friendly in dev
  eslint: { ignoreDuringBuilds: true }, // lint config noise (tsconfig include) — types are checked separately
};
export default nextConfig;

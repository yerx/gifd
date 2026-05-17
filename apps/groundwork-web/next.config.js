/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@groundwork/shared'],
  ...(process.env.NEXT_EXPORT === 'true' ? { output: 'export', trailingSlash: true } : {}),
};

module.exports = nextConfig;

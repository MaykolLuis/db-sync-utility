/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for static export
  output: 'export',
  
  // Enable trailing slash for better static file serving
  trailingSlash: true,
  
  // Custom webpack configuration for Electron
  webpack: (config, { isServer }) => {
    // Only modify client-side webpack config for Electron
    if (!isServer && process.env.NEXT_PUBLIC_IS_ELECTRON === 'true') {
      // Set the public path for dynamic imports to use relative paths
      config.output.publicPath = './_next/';
    }
    return config;
  },
  
  // Disable server components for Electron compatibility
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  // Base path for static assets
  basePath: process.env.NODE_ENV === 'production' ? '' : undefined,
  
  // Disable image optimization in development
  images: {
    unoptimized: true,
  },
  
  // Disable React StrictMode for better Electron compatibility
  reactStrictMode: false,
  
  // Handle TypeScript and ESLint during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Transpile required packages
  transpilePackages: ['date-fns', 'react-day-picker'],
  
  // Webpack configuration for Electron
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_IS_ELECTRON: 'true',
  },
};

export default nextConfig;

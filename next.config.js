/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
  // Handle SSH2 module native dependencies
  webpack: (config, { isServer }) => {
    // Handle SSH crypto modules that may not be available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Add these fallbacks for the ssh2 library
      fs: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      net: false,
      tls: false
    };

    // Add ssh2 to externals to prevent it from being bundled in client-side code
    if (!isServer) {
      config.externals = [...(config.externals || []), 'ssh2', 'bufferutil', 'utf-8-validate'];
    }

    // Specifically ignore native modules
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.node$/,
          // Use null-loader to ignore native modules
          loader: 'null-loader'
        }
      ],
    };

    return config;
  },
  // Disable TypeScript type checking for deployment
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

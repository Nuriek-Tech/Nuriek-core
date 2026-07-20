import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.core.nuriek.com" }],
        destination: "https://core.nuriek.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

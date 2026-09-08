import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next stops picking up the stray ~/package-lock.json.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // Mock/demo event images are hosted on Unsplash.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;

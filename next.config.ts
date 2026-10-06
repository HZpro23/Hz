import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be opened through the ngrok tunnel used for the
  // Telegram webhook / Mini App — otherwise Next blocks its client assets.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;

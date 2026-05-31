/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "pbxt.replicate.delivery" },
    ],
  },
  // Proxy Firebase auth routes through your own domain so browsers with
  // Tracking Prevention (Edge, Safari) don't block the auth iframe as
  // third-party. Firebase uses /__/auth/* to pass state; serving it from
  // your own domain makes it first-party.
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://colorbook-ed6df.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;

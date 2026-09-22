/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.CH2CH_STANDALONE === "1" ? { output: "standalone", outputFileTracingRoot: process.cwd() } : {}),
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" }
    ] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  }
};

export default nextConfig;

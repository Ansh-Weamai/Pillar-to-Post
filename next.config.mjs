/** @type {import('next').NextConfig} */
const nextConfig = {
  // These routes read data/*.json and public/sample-images/* via fs at
  // request time (not static import), which the build tracer doesn't always
  // pick up on its own — pin them explicitly so they're bundled into the
  // deployed function.
  outputFileTracingIncludes: {
    "/api/coverage-check": ["./data/**/*", "./public/sample-images/**/*"],
    "/api/check-room": ["./data/**/*"],
    "/api/upload-report": ["./data/**/*"],
  },
};

export default nextConfig;

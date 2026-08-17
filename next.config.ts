import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs", "pdf-parse", "@react-pdf/renderer"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "pdf-parse", "@react-pdf/renderer"],
};

export default nextConfig;

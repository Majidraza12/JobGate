import type { NextConfig } from "next";

const config: NextConfig = {
  webpack(webpackConfig, { dev }) {
    // Tool output written into the repo (browser test logs, design screenshots)
    // must not trigger rebuilds, or a test that logs on rebuild loops forever.
    if (dev) webpackConfig.watchOptions = { ...webpackConfig.watchOptions, ignored: ["**/node_modules/**", "**/.git/**", "**/.playwright-mcp/**", "**/.taste-skill/**", "**/eval/**", "**/test/**"] };
    return webpackConfig;
  },
};

export default config;

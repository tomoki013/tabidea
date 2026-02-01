/** @type {import('next-sitemap').IConfig} */
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");

const siteUrl = "https://tabide.ai";

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  outDir: "./public",
  exclude: [
    "/my-plans",
    "/my-plans/*",
    "/plan",
    "/plan/*",
    "/auth",
    "/auth/*",
    "/test",
    "/test/*",
    "/admin",
    "/admin/*",
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      {
        userAgent: "*",
        disallow: ["/test/", "/my-plans/", "/plan/", "/auth/", "/admin/"],
      },
    ],
  },
  additionalPaths: async (config) => {
    const paths = [];

    // Function to extract IDs from file content using Regex
    // This avoids needing to compile TypeScript files just for the sitemap config
    const extractIds = (filePath) => {
      try {
        if (!existsSync(filePath)) {
          console.warn(`File not found: ${filePath}`);
          return [];
        }
        const content = readFileSync(filePath, "utf-8");
        // Matches `id: "some-id"` or `id: 'some-id'`
        const regex = /id:\s*["']([^"']+)["']/g;
        let match;
        const ids = [];
        while ((match = regex.exec(content)) !== null) {
          ids.push(match[1]);
        }
        return ids;
      } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return [];
      }
    };

    const samplePlansPath = join(__dirname, "src/lib/sample-plans.ts");
    const additionalPlansPath = join(
      __dirname,
      "src/lib/additional-sample-plans.ts",
    );

    const ids = [
      ...extractIds(samplePlansPath),
      ...extractIds(additionalPlansPath),
    ];

    // Deduplicate IDs
    const uniqueIds = [...new Set(ids)];

    // Generate paths for each sample ID
    for (const id of uniqueIds) {
      // transform takes care of creating the object with default priority/changefreq if needed,
      // but here we manually create it to ensure it's added.
      // next-sitemap usually crawls pages, but for dynamic ones not in build we add them manually.
      paths.push(await config.transform(config, `/samples/${id}`));
    }

    return paths;
  },
};

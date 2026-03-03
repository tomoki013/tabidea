import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type FileEntry = {
  path: string;
  area: string;
  type: string;
  status: string;
  summary: string;
};

function runGitList(): string[] {
  const output = execSync("git ls-files --cached --others --exclude-standard", {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(".next/"))
    .filter((line) => !line.startsWith("node_modules/"));
}

function classifyArea(filePath: string): string {
  if (filePath.startsWith("src/app/")) return "App Router";
  if (filePath.startsWith("src/components/")) return "UI Components";
  if (filePath.startsWith("src/context/")) return "State Context";
  if (filePath.startsWith("src/data/")) return "Static Data";
  if (filePath.startsWith("src/lib/services/")) return "Domain Services";
  if (filePath.startsWith("src/lib/")) return "Library";
  if (filePath.startsWith("src/types/")) return "Type Definitions";
  if (filePath.startsWith("src/scripts/")) return "Maintenance Scripts";
  if (filePath.startsWith("src/test/")) return "Test Setup";
  if (filePath.startsWith("src/")) return "Source";
  if (filePath.startsWith("tests/")) return "E2E Tests";
  if (filePath.startsWith("supabase/migrations/")) return "Database Migrations";
  if (filePath.startsWith("supabase/")) return "Database";
  if (filePath.startsWith("docs/")) return "Documentation";
  if (filePath.startsWith("archive/unused/")) return "Archived/Unused";
  if (filePath.startsWith("archive/")) return "Archive";
  if (filePath.startsWith("public/")) return "Static Assets";
  if (filePath.startsWith("posts/")) return "Posts Submodule";
  if (filePath.startsWith(".vscode/")) return "Editor Config";
  return "Project Root";
}

function classifyType(filePath: string): string {
  if (/\.test\.(ts|tsx)$/.test(filePath)) return "Unit Test";
  if (/\.spec\.ts$/.test(filePath)) return "E2E Test";
  if (filePath.endsWith("/route.ts") || filePath.endsWith("/route.tsx")) return "API Route";
  if (filePath.endsWith("/page.tsx")) return "App Page";
  if (filePath.endsWith("/layout.tsx")) return "App Layout";
  if (filePath.endsWith("/loading.tsx")) return "App Loading";
  if (filePath.endsWith("/error.tsx")) return "App Error";
  if (filePath.includes("/actions/") && filePath.endsWith(".ts")) return "Server Action";
  if (filePath.endsWith(".tsx")) return "React Component";
  if (filePath.endsWith(".ts")) return "TypeScript Module";
  if (filePath.endsWith(".sql")) return "SQL Migration";
  if (filePath.endsWith(".json")) return "JSON";
  if (filePath.endsWith(".md")) return "Markdown";
  if (filePath.endsWith(".pdf")) return "PDF";
  if (filePath.endsWith(".css")) return "Stylesheet";
  if (filePath.endsWith(".mjs")) return "JS Module Config";
  if (filePath.endsWith(".js")) return "JavaScript Config";
  if (filePath.endsWith(".py")) return "Python Script";
  if (filePath.endsWith(".ttf")) return "Font Asset";
  if (/\.(jpg|jpeg|png|gif|webp|ico)$/.test(filePath)) return "Image Asset";
  if (filePath.endsWith(".gitignore") || filePath.endsWith(".gitmodules")) return "Git Config";
  if (filePath.startsWith(".")) return "Project Config";
  return "Other";
}

function classifyStatus(filePath: string, fileType: string): string {
  if (filePath.startsWith("archive/unused/")) return "Archived";
  if (fileType.includes("Test")) return "Test";
  if (filePath.startsWith("docs/")) return "Documented";
  return "Active";
}

function appRouteFromPath(filePath: string): string {
  const relative = filePath.replace(/^src\/app\//, "");
  const cleaned = relative
    .replace(/\/page\.tsx$/, "")
    .replace(/\/route\.tsx?$/, "")
    .replace(/\/layout\.tsx$/, "")
    .replace(/\/loading\.tsx$/, "")
    .replace(/\/error\.tsx$/, "")
    .replace(/\(.*?\)\//g, "");
  return cleaned ? `/${cleaned}` : "/";
}

function titleFromFile(filePath: string): string {
  const base = path.basename(filePath).replace(/\.[^.]+$/, "");
  return base.replace(/[-_]/g, " ");
}

function summarize(filePath: string, fileType: string): string {
  if (filePath.startsWith("archive/unused/")) {
    return "Archived unused file retained for reference and rollback.";
  }
  if (filePath.startsWith("docs/reference/file-catalog.md")) {
    return "Auto-generated catalog of repository files.";
  }
  if (filePath.startsWith("docs/")) {
    return "Project documentation for product, development, and operations.";
  }
  if (filePath.startsWith("supabase/migrations/")) {
    return `Database schema migration: ${path.basename(filePath)}.`;
  }
  if (filePath.startsWith("supabase/")) {
    return "Supabase schema or migration operations guide.";
  }
  if (fileType === "API Route") {
    return `HTTP endpoint handler for ${appRouteFromPath(filePath)}.`;
  }
  if (fileType === "App Page") {
    return `UI route entry for ${appRouteFromPath(filePath)}.`;
  }
  if (fileType === "App Layout") {
    return `Layout wrapper for ${appRouteFromPath(filePath)}.`;
  }
  if (fileType === "App Loading") {
    return `Loading-state UI for ${appRouteFromPath(filePath)}.`;
  }
  if (fileType === "App Error") {
    return `Error-state UI for ${appRouteFromPath(filePath)}.`;
  }
  if (fileType === "Server Action") {
    return `Server-side action logic for ${titleFromFile(filePath)}.`;
  }
  if (fileType === "React Component") {
    return `React UI component: ${titleFromFile(filePath)}.`;
  }
  if (fileType === "Unit Test" || fileType === "E2E Test") {
    return `Automated test coverage for ${titleFromFile(filePath)} behavior.`;
  }
  if (filePath.startsWith("src/data/itineraries/") && filePath.endsWith(".json")) {
    return `Static itinerary seed data: ${path.basename(filePath, ".json")}.`;
  }
  if (filePath.startsWith("src/types/")) {
    return `Shared TypeScript contracts for ${titleFromFile(filePath)} domain.`;
  }
  if (filePath.startsWith("src/lib/services/")) {
    return `Service-layer module for ${titleFromFile(filePath)} domain logic.`;
  }
  if (filePath.startsWith("src/lib/")) {
    return `Library module supporting ${titleFromFile(filePath)} functionality.`;
  }
  if (filePath.startsWith("src/components/")) {
    return `UI component module for ${titleFromFile(filePath)}.`;
  }
  if (filePath.startsWith("src/context/")) {
    return `React context provider for ${titleFromFile(filePath)} state.`;
  }
  if (filePath.startsWith("src/scripts/")) {
    return `Maintenance or verification script: ${path.basename(filePath)}.`;
  }
  if (filePath.startsWith("tests/")) {
    return `Playwright end-to-end verification for ${titleFromFile(filePath)}.`;
  }
  if (filePath.startsWith("public/")) {
    return `Static public asset used by client rendering.`;
  }
  if (filePath.startsWith("posts/")) {
    return "Git submodule content reference for blog source materials.";
  }
  if (filePath.endsWith("package.json")) {
    return "Node package manifest with scripts and dependencies.";
  }
  if (filePath.endsWith("pnpm-lock.yaml")) {
    return "Dependency lockfile managed by pnpm.";
  }
  if (filePath.endsWith("tsconfig.json")) {
    return "TypeScript compiler configuration.";
  }
  if (filePath.endsWith("next.config.ts")) {
    return "Next.js runtime and build configuration.";
  }
  if (filePath.endsWith("vitest.config.ts")) {
    return "Vitest test runner configuration.";
  }
  if (filePath.endsWith(".md")) {
    return "Markdown document for repository guidance.";
  }
  if (filePath.endsWith(".sql")) {
    return `SQL definition file: ${path.basename(filePath)}.`;
  }
  return "Repository file supporting build, runtime, or maintenance.";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function buildEntries(paths: string[]): FileEntry[] {
  return paths
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => {
      const type = classifyType(filePath);
      return {
        path: filePath,
        area: classifyArea(filePath),
        type,
        status: classifyStatus(filePath, type),
        summary: summarize(filePath, type),
      };
    });
}

function toMarkdown(entries: FileEntry[]): string {
  const lines: string[] = [];
  lines.push("# File Catalog");
  lines.push("");
  lines.push("Auto-generated by `pnpm docs:catalog`.");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push(`Total files: ${entries.length}`);
  lines.push("");
  lines.push("| Path | Area | Type | Status | Summary |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const entry of entries) {
    lines.push(
      `| ${escapeCell(entry.path)} | ${escapeCell(entry.area)} | ${escapeCell(entry.type)} | ${escapeCell(entry.status)} | ${escapeCell(entry.summary)} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const files = runGitList();
  const entries = buildEntries(files);
  const markdown = toMarkdown(entries);

  const outputPath = path.join("docs", "reference", "file-catalog.md");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, "utf8");

  console.log(`Generated ${outputPath} (${entries.length} files)`);
}

main();

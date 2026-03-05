import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { LanguageCode } from "@/lib/i18n/locales";

type MessageTree = Record<string, unknown>;

const MESSAGES_ROOT = path.join(process.cwd(), "src", "messages");

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      result[key] = deepMerge(baseValue, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

function collectJsonFiles(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const entries = readdirSync(directory)
    .map((entryName) => path.join(directory, entryName))
    .sort((a, b) => a.localeCompare(b));

  const files: string[] = [];

  for (const entryPath of entries) {
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      files.push(...collectJsonFiles(entryPath));
      continue;
    }

    if (entryStat.isFile() && entryPath.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

export function loadMessagesFromFiles(language: LanguageCode): MessageTree {
  const localeDirectory = path.join(MESSAGES_ROOT, language);
  const jsonFiles = collectJsonFiles(localeDirectory);

  return jsonFiles.reduce<MessageTree>((messages, jsonFilePath) => {
    const raw = readFileSync(jsonFilePath, "utf-8");
    const parsed = JSON.parse(raw) as MessageTree;
    return deepMerge(messages, parsed);
  }, {});
}


import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type MessageTree = Record<string, unknown>;
type LocaleCode = "ja" | "en";

const SUPPORTED_LOCALES: LocaleCode[] = ["ja", "en"];
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

function loadLocaleMessages(locale: LocaleCode): MessageTree {
  const localeDirectory = path.join(MESSAGES_ROOT, locale);
  const files = collectJsonFiles(localeDirectory);

  return files.reduce<MessageTree>((messages, jsonFilePath) => {
    const raw = readFileSync(jsonFilePath, "utf-8");
    const parsed = JSON.parse(raw) as MessageTree;
    return deepMerge(messages, parsed);
  }, {});
}

function flattenKeys(obj: MessageTree, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(value)) {
      const nested = flattenKeys(value, next);
      for (const nestedKey of nested) {
        keys.add(nestedKey);
      }
      continue;
    }

    keys.add(next);
  }

  return keys;
}

function missingKeys(source: Set<string>, target: Set<string>): string[] {
  return [...source].filter((key) => !target.has(key)).sort();
}

function main() {
  const [referenceLocale, ...otherLocales] = SUPPORTED_LOCALES;
  const referenceMessages = loadLocaleMessages(referenceLocale);
  const referenceKeys = flattenKeys(referenceMessages);

  const errors: string[] = [];

  for (const locale of otherLocales) {
    const localizedMessages = loadLocaleMessages(locale);
    const localizedKeys = flattenKeys(localizedMessages);

    const missingInLocalized = missingKeys(referenceKeys, localizedKeys);
    const extraInLocalized = missingKeys(localizedKeys, referenceKeys);

    if (missingInLocalized.length > 0) {
      errors.push(
        `[i18n:check] Missing in "${locale}" (${missingInLocalized.length}): ${missingInLocalized.join(", ")}`
      );
    }

    if (extraInLocalized.length > 0) {
      errors.push(
        `[i18n:check] Extra in "${locale}" (${extraInLocalized.length}): ${extraInLocalized.join(", ")}`
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`[i18n:check] OK (${SUPPORTED_LOCALES.join(", ")})`);
}

main();


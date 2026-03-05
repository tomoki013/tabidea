import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type MessageTree = Record<string, unknown>;
const MESSAGES_ROOT = path.join(process.cwd(), "src", "messages");
const REFERENCE_LOCALE = "ja";

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

function loadLocaleMessages(locale: string): MessageTree {
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

function detectLocales(): string[] {
  if (!statSync(MESSAGES_ROOT, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  return readdirSync(MESSAGES_ROOT)
    .map((entryName) => path.join(MESSAGES_ROOT, entryName))
    .filter((entryPath) => statSync(entryPath).isDirectory())
    .map((entryPath) => path.basename(entryPath))
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  const supportedLocales = detectLocales();
  if (!supportedLocales.includes(REFERENCE_LOCALE)) {
    console.error(
      `[i18n:check] Reference locale "${REFERENCE_LOCALE}" is missing in ${MESSAGES_ROOT}`
    );
    process.exit(1);
  }

  const otherLocales = supportedLocales.filter((locale) => locale !== REFERENCE_LOCALE);
  if (otherLocales.length === 0) {
    console.error("[i18n:check] No target locales found to validate.");
    process.exit(1);
  }

  const referenceLocale = REFERENCE_LOCALE;
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

  console.log(`[i18n:check] OK (${supportedLocales.join(", ")})`);
}

main();


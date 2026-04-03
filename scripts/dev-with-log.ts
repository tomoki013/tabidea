import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const LOG_DIR = path.join(process.cwd(), "logs");

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function resolvePnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function forwardChunk(
  stream: NodeJS.WriteStream,
  fileStream: ReturnType<typeof createWriteStream>,
  chunk: string | Buffer,
): void {
  stream.write(chunk);
  fileStream.write(chunk);
}

function main(): void {
  mkdirSync(LOG_DIR, { recursive: true });

  const logPath = path.join(LOG_DIR, `dev-${formatTimestamp(new Date())}.log`);
  const fileStream = createWriteStream(logPath, { flags: "a" });
  const nextArgs = ["exec", "next", "dev", ...process.argv.slice(2)];
  const child = spawn(resolvePnpmCommand(), nextArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });

  const banner = `[dev-with-log] Writing dev output to ${logPath}\n`;
  process.stdout.write(banner);
  fileStream.write(banner);

  child.stdout?.on("data", (chunk) =>
    forwardChunk(process.stdout, fileStream, chunk),
  );
  child.stderr?.on("data", (chunk) =>
    forwardChunk(process.stderr, fileStream, chunk),
  );

  const cleanupAndExit = (code: number) => {
    fileStream.end(() => {
      process.exit(code);
    });
  };

  const signalExitCodes: Partial<Record<NodeJS.Signals, number>> = {
    SIGINT: 130,
    SIGTERM: 143,
  };

  const forwardSignal = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  child.on("error", (error) => {
    const message = `[dev-with-log] Failed to start next dev: ${error.message}\n`;
    process.stderr.write(message);
    fileStream.write(message);
    cleanupAndExit(1);
  });

  child.on("close", (code, signal) => {
    if (signal) {
      cleanupAndExit(signalExitCodes[signal] ?? 1);
      return;
    }

    cleanupAndExit(code ?? 0);
  });
}

main();

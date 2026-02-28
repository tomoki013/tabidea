/**
 * Provider Factory テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getDefaultProviderName,
  selectProvider,
  getModelForPhase,
  areBothProvidersAvailable,
  resetProviderInstances,
} from "./factory";

// ============================================================================
// Mocks
// ============================================================================

// @ai-sdk/google をモック
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => {
    const fn = (modelName: string, opts?: Record<string, unknown>) => ({
      modelId: modelName,
      provider: "google",
      ...opts,
    });
    return fn;
  }),
}));

// @ai-sdk/openai をモック
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => {
    const fn = (modelName: string, opts?: Record<string, unknown>) => ({
      modelId: modelName,
      provider: "openai",
      ...opts,
    });
    return fn;
  }),
}));

// ============================================================================
// Setup
// ============================================================================

const originalEnv = { ...process.env };

beforeEach(() => {
  resetProviderInstances();
});

afterEach(() => {
  process.env = { ...originalEnv };
  resetProviderInstances();
});

// ============================================================================
// Tests
// ============================================================================

describe("getDefaultProviderName", () => {
  it("デフォルトで gemini を返す", () => {
    delete process.env.AI_DEFAULT_PROVIDER;
    expect(getDefaultProviderName()).toBe("gemini");
  });

  it("AI_DEFAULT_PROVIDER=openai で openai を返す", () => {
    process.env.AI_DEFAULT_PROVIDER = "openai";
    expect(getDefaultProviderName()).toBe("openai");
  });

  it("不明な値は gemini にフォールバック", () => {
    process.env.AI_DEFAULT_PROVIDER = "anthropic";
    expect(getDefaultProviderName()).toBe("gemini");
  });
});

describe("selectProvider", () => {
  it("Gemini キーがあれば Gemini プロバイダーを返す", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    delete process.env.AI_DEFAULT_PROVIDER;
    const provider = selectProvider("free");
    expect(provider.name).toBe("gemini");
  });

  it("Premium ユーザーはプロバイダー指定可能", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "test-key";
    const provider = selectProvider("premium", "openai");
    expect(provider.name).toBe("openai");
  });

  it("Free ユーザーはプロバイダー指定を無視", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.AI_DEFAULT_PROVIDER;
    const provider = selectProvider("free", "openai");
    expect(provider.name).toBe("gemini");
  });

  it("指定プロバイダーが利用不可ならフォールバック", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_DEFAULT_PROVIDER;

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = selectProvider("premium", "openai");
    expect(provider.name).toBe("gemini");
    consoleSpy.mockRestore();
  });

  it("デフォルトプロバイダーが利用不可なら代替を試行", () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.AI_DEFAULT_PROVIDER;

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = selectProvider("free");
    expect(provider.name).toBe("openai");
    consoleSpy.mockRestore();
  });

  it("両方利用不可ならエラー", () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_DEFAULT_PROVIDER;

    expect(() => selectProvider("free")).toThrow("No AI provider available");
  });
});

describe("getModelForPhase", () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    delete process.env.AI_DEFAULT_PROVIDER;
  });

  it("free ユーザーの outline は flash 相当モデル", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = getModelForPhase("outline", "free");
    expect(result.provider).toBe("gemini");
    expect(result.modelName).toContain("flash");
    expect(result.temperature).toBe(0.3);
    consoleSpy.mockRestore();
  });

  it("premium ユーザーの chunk は pro 相当モデル", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = getModelForPhase("chunk", "premium");
    expect(result.provider).toBe("gemini");
    expect(result.modelName).toContain("pro");
    expect(result.temperature).toBe(0.1);
    consoleSpy.mockRestore();
  });

  it("premium + OpenAI 指定で OpenAI モデルを返す", () => {
    process.env.OPENAI_API_KEY = "test-key";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = getModelForPhase("outline", "premium", "openai");
    expect(result.provider).toBe("openai");
    expect(result.modelName).toBe("gpt-4o");
    consoleSpy.mockRestore();
  });

  it("spot_extraction はティア共通", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const freeResult = getModelForPhase("spot_extraction", "free");
    const premiumResult = getModelForPhase("spot_extraction", "premium");
    expect(freeResult.modelName).toBe(premiumResult.modelName);
    consoleSpy.mockRestore();
  });
});

describe("areBothProvidersAvailable", () => {
  it("両方のキーがあれば true", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "test-key";
    expect(areBothProvidersAvailable()).toBe(true);
  });

  it("片方が欠けていれば false", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    delete process.env.OPENAI_API_KEY;
    expect(areBothProvidersAvailable()).toBe(false);
  });
});

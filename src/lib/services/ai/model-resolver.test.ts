/**
 * Model Resolver テスト
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolveModelForPhase, getDefaultProvider, listModelEnvVars } from "./model-resolver";

// ============================================================================
// Setup
// ============================================================================

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

// ============================================================================
// resolveModelForPhase
// ============================================================================

describe("resolveModelForPhase", () => {
  describe("Gemini デフォルト解決", () => {
    it("free/outline → gemini-2.5-flash", () => {
      const result = resolveModelForPhase("outline", "free", "gemini");
      expect(result.modelName).toBe("gemini-2.5-flash");
      expect(result.provider).toBe("gemini");
      expect(result.temperature).toBe(0.3);
      expect(result.source).toBe("default");
    });

    it("free/chunk → gemini-2.5-flash", () => {
      const result = resolveModelForPhase("chunk", "free", "gemini");
      expect(result.modelName).toBe("gemini-2.5-flash");
    });

    it("pro/chunk → gemini-3-flash-preview", () => {
      const result = resolveModelForPhase("chunk", "pro", "gemini");
      expect(result.modelName).toBe("gemini-3-flash-preview");
    });

    it("premium/outline → gemini-3-flash-preview", () => {
      const result = resolveModelForPhase("outline", "premium", "gemini");
      expect(result.modelName).toBe("gemini-3-flash-preview");
    });

    it("premium/chunk → gemini-3-pro-preview", () => {
      const result = resolveModelForPhase("chunk", "premium", "gemini");
      expect(result.modelName).toBe("gemini-3-pro-preview");
    });

    it("admin は premium と同じ解決", () => {
      const adminResult = resolveModelForPhase("chunk", "admin", "gemini");
      const premiumResult = resolveModelForPhase("chunk", "premium", "gemini");
      expect(adminResult.modelName).toBe(premiumResult.modelName);
    });

    it("anonymous は free と同じ解決", () => {
      const anonResult = resolveModelForPhase("outline", "anonymous", "gemini");
      const freeResult = resolveModelForPhase("outline", "free", "gemini");
      expect(anonResult.modelName).toBe(freeResult.modelName);
    });
  });

  describe("OpenAI デフォルト解決", () => {
    it("free/outline → gpt-4o-mini", () => {
      const result = resolveModelForPhase("outline", "free", "openai");
      expect(result.modelName).toBe("gpt-4o-mini");
      expect(result.provider).toBe("openai");
    });

    it("premium/chunk → gpt-4o", () => {
      const result = resolveModelForPhase("chunk", "premium", "openai");
      expect(result.modelName).toBe("gpt-4o");
    });
  });

  describe("環境変数による上書き", () => {
    it("AI_MODEL_OUTLINE_FREE で free/outline を上書き", () => {
      process.env.AI_MODEL_OUTLINE_FREE = "custom-model";
      const result = resolveModelForPhase("outline", "free", "gemini");
      expect(result.modelName).toBe("custom-model");
      expect(result.source).toBe("env_tier_specific");
    });

    it("AI_MODEL_CHUNK_PREMIUM_OPENAI でプロバイダー固有上書き", () => {
      process.env.AI_MODEL_CHUNK_PREMIUM_OPENAI = "gpt-5.2";
      const result = resolveModelForPhase("chunk", "premium", "openai");
      expect(result.modelName).toBe("gpt-5.2");
      expect(result.source).toBe("env_provider_specific");
    });

    it("プロバイダー固有がティア固有より優先される", () => {
      process.env.AI_MODEL_OUTLINE_PRO = "tier-model";
      process.env.AI_MODEL_OUTLINE_PRO_GEMINI = "provider-model";
      const result = resolveModelForPhase("outline", "pro", "gemini");
      expect(result.modelName).toBe("provider-model");
    });
  });

  describe("spot_extraction", () => {
    it("ティア共通で解決される", () => {
      const freeResult = resolveModelForPhase("spot_extraction", "free", "gemini");
      const premiumResult = resolveModelForPhase("spot_extraction", "premium", "gemini");
      expect(freeResult.modelName).toBe(premiumResult.modelName);
    });

    it("AI_MODEL_SPOT_EXTRACTION で上書き可能", () => {
      process.env.AI_MODEL_SPOT_EXTRACTION = "custom-spot-model";
      const result = resolveModelForPhase("spot_extraction", "free", "gemini");
      expect(result.modelName).toBe("custom-spot-model");
    });

    it("プロバイダー固有の上書きが優先", () => {
      process.env.AI_MODEL_SPOT_EXTRACTION = "common-model";
      process.env.AI_MODEL_SPOT_EXTRACTION_OPENAI = "openai-specific";
      const result = resolveModelForPhase("spot_extraction", "free", "openai");
      expect(result.modelName).toBe("openai-specific");
    });
  });

  describe("温度設定", () => {
    it("outline → 0.3", () => {
      const result = resolveModelForPhase("outline", "free", "gemini");
      expect(result.temperature).toBe(0.3);
    });

    it("chunk → 0.1", () => {
      const result = resolveModelForPhase("chunk", "free", "gemini");
      expect(result.temperature).toBe(0.1);
    });

    it("modify → 0.1", () => {
      const result = resolveModelForPhase("modify", "free", "gemini");
      expect(result.temperature).toBe(0.1);
    });

    it("spot_extraction → 0.1", () => {
      const result = resolveModelForPhase("spot_extraction", "free", "gemini");
      expect(result.temperature).toBe(0.1);
    });
  });
});

// ============================================================================
// getDefaultProvider
// ============================================================================

describe("getDefaultProvider", () => {
  it("デフォルトは gemini", () => {
    delete process.env.AI_DEFAULT_PROVIDER;
    expect(getDefaultProvider()).toBe("gemini");
  });

  it("環境変数で openai に変更可能", () => {
    process.env.AI_DEFAULT_PROVIDER = "openai";
    expect(getDefaultProvider()).toBe("openai");
  });

  it("不正な値は gemini にフォールバック", () => {
    process.env.AI_DEFAULT_PROVIDER = "invalid";
    expect(getDefaultProvider()).toBe("gemini");
  });
});

// ============================================================================
// listModelEnvVars
// ============================================================================

describe("listModelEnvVars", () => {
  it("AI_DEFAULT_PROVIDER を含む", () => {
    const vars = listModelEnvVars();
    expect(vars).toContain("AI_DEFAULT_PROVIDER");
  });

  it("フェーズ×ティア×プロバイダーの組み合わせを網羅", () => {
    const vars = listModelEnvVars();
    expect(vars).toContain("AI_MODEL_OUTLINE_FREE");
    expect(vars).toContain("AI_MODEL_CHUNK_PREMIUM_OPENAI");
    expect(vars).toContain("AI_MODEL_SPOT_EXTRACTION_GEMINI");
  });

  it("空でない配列を返す", () => {
    const vars = listModelEnvVars();
    expect(vars.length).toBeGreaterThan(10);
  });
});

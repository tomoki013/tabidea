import { vi, describe, it, expect } from "vitest";
import { throttle } from "./throttle";

describe("throttle", () => {
  it("executes the function immediately", () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);
    throttled();
    expect(func).toHaveBeenCalledTimes(1);
  });

  it("throttles calls within the time limit", () => {
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled(); // Call 1 (executes immediately)
    throttled(); // Call 2 (throttled)
    throttled(); // Call 3 (throttled)

    expect(func).toHaveBeenCalledTimes(1);
  });

  it("executes trailing call", async () => {
    vi.useFakeTimers();
    const func = vi.fn();
    const throttled = throttle(func, 100);

    throttled(); // Call 1 (executes immediately)
    throttled(); // Call 2 (should run after delay)

    expect(func).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);

    expect(func).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LanguageSwitcher from "./LanguageSwitcher";
import * as AuthContext from "@/context/AuthContext";
import * as userSettingsActions from "@/app/actions/user-settings";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockPathname = "/ja/pricing";
let mockQueryString = "from=header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => ({
    toString: () => mockQueryString,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const dictionary: Record<string, string> = {
      label: "Language",
      ja: "Japanese",
      en: "English",
    };
    return dictionary[key] ?? key;
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/actions/user-settings", () => ({
  updateDisplayLanguage: vi.fn(),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/ja/pricing";
    mockQueryString = "from=header";
    (AuthContext.useAuth as any).mockReturnValue({ isAuthenticated: true });
    (userSettingsActions.updateDisplayLanguage as any).mockResolvedValue({
      success: true,
    });
  });

  it("persists display language for authenticated users", async () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    await waitFor(() => {
      expect(userSettingsActions.updateDisplayLanguage).toHaveBeenCalledWith("en");
    });
    // mockPush is no longer called, window.location.href is set
  });

  it("does not call display language persistence for guests", async () => {
    (AuthContext.useAuth as any).mockReturnValue({ isAuthenticated: false });
    mockPathname = "/en/pricing";

    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Japanese" }));

    await waitFor(() => {
      expect(userSettingsActions.updateDisplayLanguage).not.toHaveBeenCalled();
    });
  });
});

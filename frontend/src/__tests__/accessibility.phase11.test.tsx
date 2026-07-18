import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublicLayout from "@/app/(public)/layout";
import { Navbar } from "@/components/navbar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/browse",
  useRouter: () => ({ push }),
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Jane Viewer",
      email: "jane@example.com",
      role: "USER",
    },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

describe("Phase 11 accessibility hardening", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("exposes a skip link and focusable main landmark on public pages", async () => {
    render(
      <PublicLayout>
        <h1>Browse</h1>
      </PublicLayout>,
    );

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    const main = screen.getByRole("main");

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");

    await userEvent.tab();
    expect(skipLink).toHaveFocus();
  });

  it("marks active primary navigation and exposes catalog search", () => {
    render(<Navbar />);

    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("search", { name: /search catalog/i })).toHaveLength(2);
  });

  it("closes profile and mobile menus with Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const profileButton = screen.getByRole("button", {
      name: /open profile menu/i,
    });
    await user.click(profileButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    expect(profileButton).toHaveFocus();

    const mobileButton = screen.getByRole("button", { name: /open menu/i });
    await user.click(mobileButton);
    expect(
      screen.getByRole("navigation", { name: /mobile navigation/i }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", { name: /mobile navigation/i }),
      ).not.toBeInTheDocument();
    });
    expect(mobileButton).toHaveFocus();
  });
});

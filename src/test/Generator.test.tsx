import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Generator from "@/components/Generator";
import { ru } from "@/shared/i18n/ru";
import { useAuthUIStore } from "@/store/authStore";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Generator (Excuse Module M2)", () => {
  beforeEach(() => {
    cleanup();
    useAuthUIStore.setState({ isAuthModalOpen: false });
  });

  it("renders with initial placeholder and category controls", () => {
    renderWithProviders(<Generator />);
    expect(
      screen.getByRole("heading", { name: new RegExp(ru.excuses.heading, "i") })
    ).toBeDefined();
    expect(screen.getByText(ru.excuses.placeholder)).toBeDefined();
    expect(
      screen.getByRole("button", { name: new RegExp(ru.excuses.generateButton, "i") })
    ).toBeDefined();
  });

  it("renders all 5 standard categories: rude, polite, technical, absurd, custom", () => {
    renderWithProviders(<Generator />);
    expect(screen.getByRole("button", { name: /НАГЛЫЕ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /ВЕЖЛИВЫЕ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /ТЕХНИЧЕСКИЕ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /АБСУРДНЫЕ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /СВОИ/i })).toBeDefined();
  });

  it("generates an excuse and updates counter when button clicked", async () => {
    renderWithProviders(<Generator />);
    const generateBtn = screen.getByRole("button", {
      name: new RegExp(ru.excuses.generateButton, "i"),
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      const counterText = screen.getByText(new RegExp(`${ru.excuses.sessionCountPrefix} 1`));
      expect(counterText).toBeDefined();
    });

    const copyBtn = screen.getByRole("button", {
      name: new RegExp(ru.excuses.copyButton, "i"),
    });
    expect(copyBtn).toBeDefined();
  });

  it("shows custom manager when 'СВОИ' category tab is selected", async () => {
    renderWithProviders(<Generator />);
    const customTabBtn = screen.getByRole("button", { name: /СВОИ/i });
    fireEvent.click(customTabBtn);

    await waitFor(() => {
      expect(screen.getByText(ru.excuses.custom.title)).toBeDefined();
      expect(screen.getByText(ru.excuses.custom.loginBtn)).toBeDefined();
    });
  });

  it("clicking 'Дай отговорку' on custom tab when unauthenticated prompts login", async () => {
    renderWithProviders(<Generator />);
    const customTabBtn = screen.getByRole("button", { name: /СВОИ/i });
    fireEvent.click(customTabBtn);

    const generateBtn = screen.getByRole("button", {
      name: new RegExp(ru.excuses.generateButton, "i"),
    });
    fireEvent.click(generateBtn);

    // Should trigger auth modal
    await waitFor(() => {
      expect(useAuthUIStore.getState().isAuthModalOpen).toBe(true);
    });
  });
});

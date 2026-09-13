import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { RegisterForm } from "@/features/auth/ui/RegisterForm";
import { AuthModal } from "@/features/auth/ui/AuthModal";
import { UserNav } from "@/features/auth/ui/UserNav";
import { useAuthUIStore } from "@/store/authStore";
import { ru } from "@/shared/i18n/ru";

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
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Auth Module", () => {
  beforeEach(() => {
    cleanup();
    useAuthUIStore.setState({ isAuthModalOpen: false, authModalTab: "login" });
  });

  it("renders LoginForm with inputs and submit button", () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByPlaceholderText(ru.auth.emailPlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(ru.auth.passwordPlaceholder)).toBeDefined();
    expect(
      screen.getByRole("button", { name: ru.auth.submitLogin })
    ).toBeDefined();
  });

  it("validates invalid email and short password on LoginForm submit", async () => {
    renderWithProviders(<LoginForm />);

    const submitBtn = screen.getByRole("button", { name: ru.auth.submitLogin });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(ru.auth.errors.invalidEmail)).toBeDefined();
      expect(screen.getByText(ru.auth.errors.passwordTooShort)).toBeDefined();
    });
  });

  it("renders RegisterForm with password policy hint", () => {
    renderWithProviders(<RegisterForm />);

    expect(screen.getByPlaceholderText(ru.auth.emailPlaceholder)).toBeDefined();
    expect(
      screen.getByRole("button", { name: ru.auth.submitRegister })
    ).toBeDefined();
    expect(screen.getByText(/хэширование bcrypt/i)).toBeDefined();
  });

  it("opens AuthModal when state is open", () => {
    useAuthUIStore.setState({ isAuthModalOpen: true, authModalTab: "login" });
    renderWithProviders(<AuthModal />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(ru.auth.loginTitle)).toBeDefined();
  });

  it("displays register tab in AuthModal when tab is register", () => {
    useAuthUIStore.setState({ isAuthModalOpen: true, authModalTab: "register" });
    renderWithProviders(<AuthModal />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(ru.auth.registerTitle)).toBeDefined();
  });

  it("renders UserNav login and register buttons when unauthenticated", () => {
    renderWithProviders(<UserNav />);

    expect(screen.getByRole("button", { name: ru.nav.login })).toBeDefined();
    expect(screen.getByRole("button", { name: ru.nav.register })).toBeDefined();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PWAInstallButton } from "@/shared/pwa/PWAInstallButton";
import { OfflineIndicator } from "@/shared/pwa/OfflineIndicator";
import { ru } from "@/shared/i18n/ru";

describe("PWA Components & Hooks (Module M5)", () => {
  it("renders PWA install button when installable event fires", async () => {
    render(<PWAInstallButton variant="header" />);

    // Trigger beforeinstallprompt event
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt") as any;
    event.prompt = promptSpy;
    event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    act(() => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole("button", { name: new RegExp(ru.pwa.installBtn, "i") });
    expect(button).toBeDefined();

    // Click install button
    await act(async () => {
      fireEvent.click(button);
    });

    expect(promptSpy).toHaveBeenCalled();
  });

  it("renders offline indicator when network is offline", async () => {
    render(<OfflineIndicator />);

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeDefined();
    expect(screen.getByText(new RegExp(ru.pwa.offline.title, "i"))).toBeDefined();

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    const status = await screen.findByRole("status");
    expect(status).toBeDefined();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Soundboard from "@/widgets/soundboard/Soundboard";
import { engine } from "@/audio/engine";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderSoundboard() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Soundboard />
    </QueryClientProvider>
  );
}

describe("Soundboard (Module M3 + M4 Uploads Integration)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useUIStore.setState({ awkwardnessLevel: 35 });
    engine.stopAll();
  });

  afterEach(() => {
    engine.stopAll();
    vi.useRealTimers();
  });

  it("renders all four standard categories and sound buttons", () => {
    renderSoundboard();

    // Check categories
    expect(screen.getByText(ru.soundboard.groups.renovation.title)).toBeDefined();
    expect(screen.getByText(ru.soundboard.groups.family.title)).toBeDefined();
    expect(screen.getByText(ru.soundboard.groups.tech.title)).toBeDefined();
    expect(screen.getByText(ru.soundboard.groups.other.title)).toBeDefined();

    // Check sound items
    expect(screen.getByText(ru.soundboard.sounds.drill.label)).toBeDefined();
    expect(screen.getByText(ru.soundboard.sounds.jackhammer.label)).toBeDefined();
    expect(screen.getByText(ru.soundboard.sounds.baby.label)).toBeDefined();
    expect(screen.getByText(ru.soundboard.sounds.static.label)).toBeDefined();
    expect(screen.getByText(ru.soundboard.sounds.doorbell.label)).toBeDefined();
  });

  it("renders upload button for adding user custom soundboards", () => {
    renderSoundboard();
    const uploadButtons = screen.getAllByText(ru.soundboard.uploadButton);
    expect(uploadButtons.length).toBeGreaterThan(0);
  });

  it("toggles sound ON and calls engine.start", () => {
    const startSpy = vi.spyOn(engine, "start");
    renderSoundboard();

    const drillBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.sounds.drill.label, "i"),
    });
    expect(drillBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(drillBtn);

    expect(startSpy).toHaveBeenCalledWith("drill", undefined);
    expect(drillBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles sound OFF manually when clicked again", () => {
    const stopSpy = vi.spyOn(engine, "stop");
    renderSoundboard();

    const drillBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.sounds.drill.label, "i"),
    });

    // Start
    fireEvent.click(drillBtn);
    expect(drillBtn.getAttribute("aria-pressed")).toBe("true");

    // Stop manually
    fireEvent.click(drillBtn);
    expect(stopSpy).toHaveBeenCalledWith("drill");
    expect(drillBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("automatically disables the button when the duration expires", () => {
    vi.useFakeTimers();
    const stopSpy = vi.spyOn(engine, "stop");
    renderSoundboard();

    const doorbellBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.sounds.doorbell.label, "i"),
    });

    fireEvent.click(doorbellBtn);
    expect(doorbellBtn.getAttribute("aria-pressed")).toBe("true");

    // Doorbell has 8s duration. Advance timer by 9 seconds
    act(() => {
      vi.advanceTimersByTime(9000);
    });

    expect(stopSpy).toHaveBeenCalledWith("doorbell");
    expect(doorbellBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("smoothly adjusts awkwardness level volume via Web Audio API", () => {
    const setVolumeSpy = vi.spyOn(engine, "setVolume");
    renderSoundboard();

    const slider = screen.getByLabelText(ru.soundboard.awkwardLevel);
    expect(slider).toBeDefined();

    fireEvent.change(slider, { target: { value: "85" } });

    expect(setVolumeSpy).toHaveBeenCalledWith((85 / 100) * 0.9);
    expect(useUIStore.getState().awkwardnessLevel).toBe(85);
    expect(screen.getByText("85%")).toBeDefined();
  });

  it("stops all active sounds when 'stopAll' button is clicked", () => {
    const stopAllSpy = vi.spyOn(engine, "stopAll");
    renderSoundboard();

    const drillBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.sounds.drill.label, "i"),
    });
    const babyBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.sounds.baby.label, "i"),
    });

    fireEvent.click(drillBtn);
    fireEvent.click(babyBtn);

    const stopAllBtn = screen.getByRole("button", {
      name: new RegExp(ru.soundboard.stopAll, "i"),
    });
    expect(stopAllBtn).toBeDefined();

    fireEvent.click(stopAllBtn);

    expect(stopAllSpy).toHaveBeenCalled();
    expect(drillBtn.getAttribute("aria-pressed")).toBe("false");
    expect(babyBtn.getAttribute("aria-pressed")).toBe("false");
  });
});

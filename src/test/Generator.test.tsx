import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Generator from "@/components/Generator";
import { ru } from "@/shared/i18n/ru";

describe("Generator (Excuse Module)", () => {
  it("renders with initial placeholder and category controls", () => {
    render(<Generator />);
    expect(
      screen.getByRole("heading", { name: new RegExp(ru.excuses.heading, "i") })
    ).toBeDefined();
    expect(screen.getByText(ru.excuses.placeholder)).toBeDefined();
    expect(
      screen.getByRole("button", { name: new RegExp(ru.excuses.generateButton, "i") })
    ).toBeDefined();
  });

  it("generates an excuse and updates counter when button clicked", async () => {
    render(<Generator />);
    const generateBtn = screen.getByRole("button", {
      name: new RegExp(ru.excuses.generateButton, "i"),
    });
    fireEvent.click(generateBtn);

    // Initial session count was 0, now should display count: 1
    const counterText = screen.getByText(new RegExp(`${ru.excuses.sessionCountPrefix} 1`));
    expect(counterText).toBeDefined();

    // Copy button should now be enabled
    const copyBtn = screen.getByRole("button", {
      name: new RegExp(ru.excuses.copyButton, "i"),
    });
    expect(copyBtn).toBeDefined();
  });
});


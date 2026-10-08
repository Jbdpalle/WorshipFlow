import { describe, it, expect } from "vitest";
import { dynamicsStep, DYNAMICS_STEP_COUNT } from "@/lib/songs/dynamics";

describe("dynamicsStep", () => {
  it("maps the five preset levels to 1–5 in order", () => {
    expect(["Intimate", "Light", "Building", "Strong", "Full"].map(dynamicsStep)).toEqual([1, 2, 3, 4, 5]);
    expect(DYNAMICS_STEP_COUNT).toBe(5);
  });

  it("returns 0 for unset or custom labels so nothing is mis-drawn", () => {
    expect(dynamicsStep(null)).toBe(0);
    expect(dynamicsStep(undefined)).toBe(0);
    expect(dynamicsStep("")).toBe(0);
    expect(dynamicsStep("Driving")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { FuelMetering } from "./metering.js";

describe("fuel metering", () => {
  it("consumes fuel", () => {
    const metering = new FuelMetering();
    metering.setFuel(10);
    metering.consumeFuel(3);
    expect(metering.getFuel()).toBe(7);
  });

  it("throws when fuel exhausted", () => {
    const metering = new FuelMetering();
    metering.setFuel(1);
    expect(() => metering.consumeFuel(2)).toThrow();
  });
});

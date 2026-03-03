export class FuelMetering {
  private fuel = 0;

  setFuel(amount: number): void {
    this.fuel = Math.max(0, Math.floor(amount));
  }

  getFuel(): number {
    return this.fuel;
  }

  consumeFuel(amount: number): void {
    const consume = Math.max(0, Math.floor(amount));
    if (consume > this.fuel) {
      this.fuel = 0;
      throw new Error("fuel exhausted");
    }
    this.fuel -= consume;
  }

  syncFuel(current: number): void {
    this.fuel = Math.max(0, Math.floor(current));
  }
}

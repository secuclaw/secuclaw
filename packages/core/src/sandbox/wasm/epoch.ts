export class EpochInterrupt {
  private deadline = 0;
  private running = false;

  startEpoch(timeoutMs: number): void {
    this.running = true;
    this.deadline = Date.now() + timeoutMs;
  }

  endEpoch(): void {
    this.running = false;
    this.deadline = 0;
  }

  setDeadline(deadlineEpochMs: number): void {
    this.deadline = deadlineEpochMs;
    this.running = true;
  }

  checkInterrupt(): void {
    if (this.running && Date.now() > this.deadline) {
      this.running = false;
      throw new Error("epoch interrupted: deadline exceeded");
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

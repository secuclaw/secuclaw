export class Watchdog {
  private timer: NodeJS.Timeout | null = null;
  private lastFeed = 0;
  private alive = false;

  start(timeoutMs: number, onTimeout: () => void): void {
    this.stop();
    this.alive = true;
    this.lastFeed = Date.now();

    this.timer = setInterval(() => {
      if (!this.alive) {
        return;
      }
      if (Date.now() - this.lastFeed > timeoutMs) {
        this.alive = false;
        onTimeout();
      }
    }, Math.max(10, timeoutMs / 4));
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.alive = false;
  }

  feed(): void {
    this.lastFeed = Date.now();
    this.alive = true;
  }

  isAlive(): boolean {
    return this.alive;
  }
}

export interface ConfigBackup {
  id: string;
  createdAt: number;
  config: Record<string, unknown>;
}

export class ConfigRollback {
  private readonly backups: ConfigBackup[] = [];

  save(config: Record<string, unknown>): string {
    const id = `backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.backups.push({
      id,
      createdAt: Date.now(),
      config: structuredClone(config),
    });
    if (this.backups.length > 20) {
      this.backups.shift();
    }
    return id;
  }

  rollback(id?: string): Record<string, unknown> {
    const target = id
      ? this.backups.find((backup) => backup.id === id)
      : this.backups[this.backups.length - 1];

    if (!target) {
      throw new Error("no backup found");
    }

    return structuredClone(target.config);
  }

  listBackups(): ConfigBackup[] {
    return [...this.backups];
  }
}

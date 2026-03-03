export interface VersionedConfig {
  version: string;
  payload: Record<string, unknown>;
}

type MigrationFn = (payload: Record<string, unknown>) => Record<string, unknown>;

export class ConfigMigrator {
  private readonly migrations = new Map<string, MigrationFn>();

  register(version: string, migration: MigrationFn): void {
    this.migrations.set(version, migration);
  }

  getVersion(config: VersionedConfig): string {
    return config.version;
  }

  isCompatible(currentVersion: string, targetVersion: string): boolean {
    if (currentVersion === targetVersion) {
      return true;
    }
    return this.migrations.has(`${currentVersion}->${targetVersion}`);
  }

  migrate(config: VersionedConfig, targetVersion: string): VersionedConfig {
    if (config.version === targetVersion) {
      return config;
    }

    const key = `${config.version}->${targetVersion}`;
    const migration = this.migrations.get(key);
    if (!migration) {
      throw new Error(`no migration path: ${key}`);
    }

    return {
      version: targetVersion,
      payload: migration(config.payload),
    };
  }
}

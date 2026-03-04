import type {
  STIXBundle,
  STIXObject,
  STIXType,
  STIXParseResult,
  STIXValidationOptions,
  STIXCommonProperties,
} from './types.js';

const STIX_ID_PATTERN = /^([a-z][a-z0-9-]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

const VALID_STIX_TYPES: Set<STIXType> = new Set([
  'bundle', 'attack-pattern', 'campaign', 'course-of-action', 'grouping',
  'identity', 'indicator', 'infrastructure', 'intrusion-set', 'location',
  'malware', 'malware-analysis', 'note', 'observed-data', 'opinion',
  'report', 'threat-actor', 'tool', 'vulnerability', 'relationship', 'sighting',
]);

export class STIXParser {
  private errors: Array<{ path: string; message: string }> = [];
  private warnings: Array<{ path: string; message: string }> = [];
  private options: STIXValidationOptions;

  constructor(options: STIXValidationOptions = {}) {
    this.options = {
      strict: true,
      allowCustomProperties: true,
      validateExternalRefs: false,
      ...options,
    };
  }

  parse(json: string): STIXParseResult {
    this.errors = [];
    this.warnings = [];

    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (e) {
      return {
        success: false,
        errors: [{ path: '$', message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}` }],
      };
    }

    const bundle = this.parseBundle(data);
    
    if (this.errors.length > 0) {
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }

    const stats = this.calculateStats(bundle.objects);

    return {
      success: true,
      bundle,
      objects: bundle.objects,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
      stats,
    };
  }

  private parseBundle(data: unknown): STIXBundle {
    if (!this.isObject(data)) {
      this.errors.push({ path: '$', message: 'Bundle must be an object' });
      return this.createEmptyBundle();
    }

    const obj = data as Record<string, unknown>;

    if (obj.type !== 'bundle') {
      this.errors.push({ path: '$.type', message: `Expected type 'bundle', got '${obj.type}'` });
      return this.createEmptyBundle();
    }

    if (obj.spec_version !== '2.1') {
      if (this.options.strict) {
        this.errors.push({ path: '$.spec_version', message: `Expected spec_version '2.1', got '${obj.spec_version}'` });
      } else {
        this.warnings.push({ path: '$.spec_version', message: `STIX version ${String(obj.spec_version)} may have compatibility issues` });
      }
    }

    if (!obj.id || !STIX_ID_PATTERN.test(obj.id as string)) {
      if (!obj.id) {
        obj.id = this.generateBundleId();
      } else {
        this.errors.push({ path: '$.id', message: `Invalid STIX ID format: ${String(obj.id)}` });
      }
    }

    const objects: STIXObject[] = [];
    const objectsData = obj.objects;

    if (Array.isArray(objectsData)) {
      for (let i = 0; i < objectsData.length; i++) {
        const parsed = this.parseObject(objectsData[i], `$.objects[${i}]`);
        if (parsed) {
          objects.push(parsed);
        }
      }
    }

    return {
      type: 'bundle',
      spec_version: '2.1',
      id: obj.id as string,
      created: new Date().toISOString(),
      objects,
    };
  }

  private parseObject(data: unknown, path: string): STIXObject | null {
    if (!this.isObject(data)) {
      this.errors.push({ path, message: 'Object must be an object' });
      return null;
    }

    const obj = data as Record<string, unknown>;
    const type = obj.type as STIXType;

    if (!type || !VALID_STIX_TYPES.has(type)) {
      this.errors.push({ path: `${path}.type`, message: `Invalid or unknown STIX type: ${String(type)}` });
      return null;
    }

    this.validateCommonProperties(obj, path);

    if (type === 'relationship') {
      this.validateRelationship(obj, path);
    }

    return obj as unknown as STIXObject;
  }

  private validateCommonProperties(obj: Record<string, unknown>, path: string): void {
    const props = obj as Partial<STIXCommonProperties>;

    if (!props.id || !STIX_ID_PATTERN.test(props.id)) {
      if (!props.id) {
        this.errors.push({ path: `${path}.id`, message: 'Missing required property: id' });
      } else {
        this.errors.push({ path: `${path}.id`, message: `Invalid STIX ID format: ${props.id}` });
      }
    }

    if (!props.created) {
      if (this.options.strict) {
        this.errors.push({ path: `${path}.created`, message: 'Missing required property: created' });
      }
    } else if (!TIMESTAMP_PATTERN.test(props.created)) {
      this.errors.push({ path: `${path}.created`, message: `Invalid timestamp format: ${props.created}` });
    }

    if (props.modified && !TIMESTAMP_PATTERN.test(props.modified)) {
      this.errors.push({ path: `${path}.modified`, message: `Invalid timestamp format: ${props.modified}` });
    }

    if (props.confidence !== undefined) {
      if (typeof props.confidence !== 'number' || props.confidence < 0 || props.confidence > 100) {
        this.errors.push({ path: `${path}.confidence`, message: 'Confidence must be a number between 0 and 100' });
      }
    }

    if (props.external_references && !Array.isArray(props.external_references)) {
      this.errors.push({ path: `${path}.external_references`, message: 'external_references must be an array' });
    }

    if (props.revoked !== undefined && typeof props.revoked !== 'boolean') {
      this.errors.push({ path: `${path}.revoked`, message: 'revoked must be a boolean' });
    }
  }

  private validateRelationship(obj: Record<string, unknown>, path: string): void {
    const rel = obj as Record<string, unknown>;

    if (!rel.relationship_type) {
      this.errors.push({ path: `${path}.relationship_type`, message: 'Missing required property: relationship_type' });
    }

    if (!rel.source_ref) {
      this.errors.push({ path: `${path}.source_ref`, message: 'Missing required property: source_ref' });
    } else if (!STIX_ID_PATTERN.test(rel.source_ref as string)) {
      this.errors.push({ path: `${path}.source_ref`, message: `Invalid STIX ID format: ${rel.source_ref}` });
    }

    if (!rel.target_ref) {
      this.errors.push({ path: `${path}.target_ref`, message: 'Missing required property: target_ref' });
    } else if (!STIX_ID_PATTERN.test(rel.target_ref as string)) {
      this.errors.push({ path: `${path}.target_ref`, message: `Invalid STIX ID format: ${rel.target_ref}` });
    }
  }

  private calculateStats(objects: STIXObject[]): { total: number; byType: Record<STIXType, number> } {
    const byType: Partial<Record<STIXType, number>> = {};

    for (const obj of objects) {
      const type = (obj as unknown as Record<string, unknown>).type as STIXType;
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: objects.length,
      byType: byType as Record<STIXType, number>,
    };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private createEmptyBundle(): STIXBundle {
    return {
      type: 'bundle',
      spec_version: '2.1',
      id: this.generateBundleId(),
      created: new Date().toISOString(),
      objects: [],
    };
  }

  private generateBundleId(): string {
    const globalCrypto = (typeof crypto !== 'undefined') ? crypto : (globalThis as any).crypto;

    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
      const uuid = globalCrypto.randomUUID();
      return `bundle--${uuid}`;
    }

    if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalCrypto.getRandomValues(bytes);

      // Per RFC 4122, set version to 4 (random) and variant to 10xx
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const byteToHex: string[] = [];
      for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 0x100).toString(16).slice(1));
      }

      const bth = byteToHex;
      const uuid =
        bth[bytes[0]] + bth[bytes[1]] + bth[bytes[2]] + bth[bytes[3]] + '-' +
        bth[bytes[4]] + bth[bytes[5]] + '-' +
        bth[bytes[6]] + bth[bytes[7]] + '-' +
        bth[bytes[8]] + bth[bytes[9]] + '-' +
        bth[bytes[10]] + bth[bytes[11]] + bth[bytes[12]] + bth[bytes[13]] + bth[bytes[14]] + bth[bytes[15]];

      return `bundle--${uuid}`;
    }

    // As a last resort, fall back to a timestamp-based ID without using Math.random.
    const fallbackUuid = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
    return `bundle--${fallbackUuid}`;
  }
}

export function parseSTIX(json: string, options?: STIXValidationOptions): STIXParseResult {
  const parser = new STIXParser(options);
  return parser.parse(json);
}

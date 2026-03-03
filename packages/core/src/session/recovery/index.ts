/**
 * Session Recovery Mechanism
 * 
 * 7-phase session recovery with validation and repair.
 */

// ============================================================================
// Types
// ============================================================================

export interface SessionMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

export interface SessionState {
  id: string;
  messages: SessionMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: "missing" | "corrupt" | "order" | "timestamp";
  severity: "low" | "medium" | "high";
  message: string;
  affectedMessages?: string[];
}

export interface RecoveryResult {
  success: boolean;
  recoveredState?: SessionState;
  lostMessages: SessionMessage[];
  issues: ValidationIssue[];
}

// ============================================================================
// Validator
// ============================================================================

/**
 * Validates session message integrity
 */
export class SessionValidator {
  /**
   * Validate a session state
   */
  validate(state: SessionState): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Check for missing messages
    const messageCount = state.messages.length;
    if (messageCount === 0) {
      issues.push({ type: "missing", severity: "high", message: "No messages in session" });
    }
    
    // Check message order
    let lastTimestamp = 0;
    for (const msg of state.messages) {
      if (msg.timestamp < lastTimestamp) {
        issues.push({
          type: "order",
          severity: "medium",
          message: "Messages are not in chronological order",
          affectedMessages: [msg.id],
        });
      }
      lastTimestamp = msg.timestamp;
    }
    
    // Check for corrupt messages
    for (const msg of state.messages) {
      if (!msg.id || !msg.role || !msg.content) {
        issues.push({
          type: "corrupt",
          severity: "high",
          message: "Message missing required fields",
          affectedMessages: [msg.id],
        });
      }
    }
    
    // Check timestamps (not too far in future or past)
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (const msg of state.messages) {
      if (msg.timestamp > now + 60000) {
        issues.push({
          type: "timestamp",
          severity: "low",
          message: "Message timestamp is in the future",
          affectedMessages: [msg.id],
        });
      }
      if (msg.timestamp < now - oneDayMs * 30) {
        issues.push({
          type: "timestamp",
          severity: "low",
          message: "Message is older than 30 days",
          affectedMessages: [msg.id],
        });
      }
    }
    
    return {
      valid: issues.filter(i => i.severity === "high").length === 0,
      issues,
    };
  }
}

// ============================================================================
// Repair
// ============================================================================

/**
 * Repairs corrupted session state
 */
export class SessionRepair {
  /**
   * Repair session state
   */
  repair(state: SessionState): RecoveryResult {
    const validator = new SessionValidator();
    const validation = validator.validate(state);
    
    if (validation.valid) {
      return { success: true, recoveredState: state, lostMessages: [], issues: [] };
    }
    
    // Repair actions
    const repaired = { ...state, messages: [...state.messages] };
    const lostMessages: SessionMessage[] = [];
    
    // Fix order
    repaired.messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove corrupt messages
    repaired.messages = repaired.messages.filter(msg => {
      if (!msg.id || !msg.role || !msg.content) {
        lostMessages.push(msg);
        return false;
      }
      return true;
    });
    
    // Remove duplicates
    const seen = new Set<string>();
    repaired.messages = repaired.messages.filter(msg => {
      if (seen.has(msg.id)) {
        lostMessages.push(msg);
        return false;
      }
      seen.add(msg.id);
      return true;
    });
    
    // Update timestamps
    repaired.updatedAt = Date.now();
    
    return {
      success: true,
      recoveredState: repaired,
      lostMessages,
      issues: validation.issues,
    };
  }
}

// ============================================================================
// Checkpoint
// ============================================================================

/**
 * Session checkpoint management
 */
export class CheckpointManager {
  private checkpoints: Map<string, SessionState> = new Map();
  private readonly MAX_CHECKPOINTS = 10;
  
  /**
   * Create a checkpoint
   */
  createCheckpoint(state: SessionState): void {
    const checkpoint = { ...state };
    this.checkpoints.set(state.id, checkpoint);
    
    // Limit checkpoints
    if (this.checkpoints.size > this.MAX_CHECKPOINTS) {
      const first = this.checkpoints.keys().next().value;
      if (first) this.checkpoints.delete(first);
    }
  }
  
  /**
   * Get checkpoint
   */
  getCheckpoint(id: string): SessionState | undefined {
    return this.checkpoints.get(id);
  }
  
  /**
   * List checkpoints
   */
  listCheckpoints(): string[] {
    return Array.from(this.checkpoints.keys());
  }
  
  /**
   * Delete checkpoint
   */
  deleteCheckpoint(id: string): void {
    this.checkpoints.delete(id);
  }
}

// ============================================================================
// Recovery
// ============================================================================

/**
 * Main session recovery orchestrator
 */
export class SessionRecovery {
  private validator = new SessionValidator();
  private repair = new SessionRepair();
  private checkpoint = new CheckpointManager();
  
  /**
   * Phase 1: Validate state
   */
  validate(state: SessionState): ValidationResult {
    return this.validator.validate(state);
  }
  
  /**
   * Phase 2-5: Repair state
   */
  repairState(state: SessionState): RecoveryResult {
    return this.repair.repair(state);
  }
  
  /**
   * Phase 6: Create checkpoint
   */
  createCheckpoint(state: SessionState): void {
    this.checkpoint.createCheckpoint(state);
  }
  
  /**
   * Phase 7: Restore from checkpoint
   */
  restoreFromCheckpoint(id: string): SessionState | undefined {
    return this.checkpoint.getCheckpoint(id);
  }
  
  /**
   * Full recovery process
   */
  recover(state: SessionState): RecoveryResult {
    // Phase 1: Validate
    const validation = this.validate(state);
    if (validation.valid) {
      return { success: true, recoveredState: state, lostMessages: [], issues: [] };
    }
    
    // Phase 2-5: Repair
    const repairResult = this.repairState(state);
    if (!repairResult.success) {
      return repairResult;
    }
    
    // Phase 6: Create checkpoint
    if (repairResult.recoveredState) {
      this.createCheckpoint(repairResult.recoveredState);
    }
    
    return repairResult;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create session recovery system
 */
export function createSessionRecovery(): SessionRecovery {
  return new SessionRecovery();
}

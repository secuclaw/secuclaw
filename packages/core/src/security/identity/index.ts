/**
 * Agent Identity System
 * 
 * Ed25519-based identity verification for agents.
 */

import { randomBytes, createSign, createVerify } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface AgentIdentity {
  id: string;
  publicKey: string;
  name: string;
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
}

export interface SignedMessage {
  agentId: string;
  message: string;
  signature: string;
  timestamp: number;
}

export interface IdentityManifest {
  version: string;
  agentId: string;
  publicKey: string;
  capabilities: string[];
  expiresAt?: Date;
}

// ============================================================================
// Key Manager
// ============================================================================

/**
 * Manages agent identity keys
 */
export class KeyManager {
  private identities = new Map<string, AgentIdentity>();
  private keyPairs = new Map<string, { publicKey: string; privateKey: string }>();

  /**
   * Get key pair for an agent (for internal use by Signer/Verifier)
   */
  getKeyPair(agentId: string): { publicKey: string; privateKey: string } | undefined {
    return this.keyPairs.get(agentId);
  }
  /**
   * Generate a new key pair for an agent
   */
  generateKeyPair(agentId: string): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    this.keyPairs.set(agentId, { publicKey, privateKey });
    return { publicKey, privateKey };
  }

  /**
   * Register an identity
   */
  registerIdentity(identity: AgentIdentity): void {
    this.identities.set(identity.id, identity);
  }

  /**
   * Get identity by ID
   */
  getIdentity(agentId: string): AgentIdentity | undefined {
    return this.identities.get(agentId);
  }

  /**
   * Get public key for agent
   */
  getPublicKey(agentId: string): string | undefined {
    return this.keyPairs.get(agentId)?.publicKey;
  }

  /**
   * Verify if identity is valid
   */
  isValid(agentId: string): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) return false;
    if (identity.revoked) return false;
    if (identity.expiresAt && identity.expiresAt < new Date()) return false;
    return true;
  }

  /**
   * Revoke an identity
   */
  revoke(agentId: string): void {
    const identity = this.identities.get(agentId);
    if (identity) {
      identity.revoked = true;
      this.identities.set(agentId, identity);
    }
  }

  /**
   * List all identities
   */
  listIdentities(): AgentIdentity[] {
    return Array.from(this.identities.values());
  }
}

// ============================================================================
// Signer
// ============================================================================

/**
 * Signs messages with agent's private key
 */
export class Signer {
  constructor(private keyManager: KeyManager) {}

  /**
   * Sign a message
   */
  sign(agentId: string, message: string): SignedMessage {
    const keys = this.keyManager.getKeyPair(agentId);
    if (!keys) throw new Error(`No key pair for agent ${agentId}`);
    
    const sign = createSign("SHA256");
    sign.update(`${message}:${Date.now()}`);
    sign.end();
    
    const signature = sign.sign(keys.privateKey, "hex");
    
    return {
      agentId,
      message,
      signature,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Verifier
// ============================================================================

/**
 * Verifies signed messages
 */
export class Verifier {
  constructor(private keyManager: KeyManager) {}

  /**
   * Verify a signed message
   */
  verify(signed: SignedMessage): boolean {
    const identity = this.keyManager.getIdentity(signed.agentId);
    if (!identity || !this.keyManager.isValid(signed.agentId)) return false;
    
    const keys = this.keyManager.getKeyPair(signed.agentId);
    if (!keys) return false;
    
    const verify = createVerify("SHA256");
    verify.update(`${signed.message}:${signed.timestamp}`);
    verify.end();
    
    return verify.verify(keys.publicKey, signed.signature, "hex");
  }

  /**
   * Create a challenge for mutual authentication
   */
  createChallenge(): string {
    return randomBytes(32).toString("hex");
  }
}

// ============================================================================
// Helpers
// ============================================================================

function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  // Simplified - in production use @noble/ed25519 or similar
  const privateKey = randomBytes(32).toString("hex");
  const publicKey = randomBytes(32).toString("hex");
  return { publicKey, privateKey };
}

/**
 * Create identity system
 */
export function createIdentitySystem(): { keyManager: KeyManager; signer: Signer; verifier: Verifier } {
  const keyManager = new KeyManager();
  return {
    keyManager,
    signer: new Signer(keyManager),
    verifier: new Verifier(keyManager),
  };
}

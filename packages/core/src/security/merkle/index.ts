/**
 * Merkle Audit Trail System
 * 
 * Cryptographic audit logging using Merkle trees.
 */

import { createHash, randomBytes } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  data: unknown;
  previousHash: string;
}

export interface AuditProof {
  entry: AuditEntry;
  path: MerkleProofNode[];
  rootHash: string;
}

export interface MerkleProofNode {
  hash: string;
  position: "left" | "right";
}

// ============================================================================
// Hash Function
// ============================================================================

/**
 * Hash function for Merkle tree
 */
export function hash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ============================================================================
// Merkle Tree
// ============================================================================

/**
 * Merkle tree implementation
 */
export class MerkleTree {
  private root?: MerkleNode;
  private leaves: MerkleNode[] = [];

  /**
   * Add an entry to the tree
   */
  addEntry(entry: AuditEntry): void {
    const leaf = this.createLeaf(entry);
    this.leaves.push(leaf);
    this.rebuild();
  }

  /**
   * Get the root hash
   */
  getRootHash(): string {
    return this.root?.hash || "empty";
  }

  /**
   * Get all entries
   */
  getEntries(): AuditEntry[] {
    return this.leaves.map((l: MerkleNode) => JSON.parse(l.data!));
  }
  /**
   * Get proof for an entry
   */
  getProof(entryId: string): AuditProof | undefined {
    const leafIndex = this.leaves.findIndex(l => l.data === entryId);
    if (leafIndex === -1) return undefined;
    
    const entry = this.leaves[leafIndex];
    const path = this.buildProofPath(leafIndex);
    
    return {
      entry: JSON.parse(entry.data!),
      path,
      rootHash: this.getRootHash(),
    };
  }

  /**
   * Verify a proof
   */
  static verifyProof(proof: AuditProof): boolean {
    let currentHash = hash(JSON.stringify(proof.entry));
    
    for (const node of proof.path) {
      if (node.position === "left") {
        currentHash = hash(node.hash + currentHash);
      } else {
        currentHash = hash(currentHash + node.hash);
      }
    }
    
    return currentHash === proof.rootHash;
  }

  /**
   * Create a leaf node
   */
  private createLeaf(entry: AuditEntry): MerkleNode {
    return {
      hash: hash(JSON.stringify(entry)),
      data: JSON.stringify(entry),
    };
  }

  /**
   * Create an internal node
   */
  private createNode(left: MerkleNode, right?: MerkleNode): MerkleNode {
    const data = left.hash + (right?.hash || "");
    return {
      hash: hash(data),
      left,
      right,
    };
  }

  /**
   * Rebuild the tree
   */
  private rebuild(): void {
    if (this.leaves.length === 0) {
      this.root = undefined;
      return;
    }
    
    let currentLevel = [...this.leaves];
    
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(this.createNode(left, right));
      }
      
      currentLevel = nextLevel;
    }
    
    this.root = currentLevel[0];
  }

  /**
   * Build proof path
   */
  private buildProofPath(leafIndex: number): MerkleProofNode[] {
    const path: MerkleProofNode[] = [];
    let index = leafIndex;
    let level = [...this.leaves];
    
    while (level.length > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      
      if (siblingIndex < level.length) {
        path.push({
          hash: level[siblingIndex].hash,
          position: index % 2 === 0 ? "right" : "left",
        });
      }
      
      // Move up
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        nextLevel.push(this.createNode(left, right));
      }
      
      level = nextLevel;
      index = Math.floor(index / 2);
    }
    
    return path;
  }
}

// ============================================================================
// Audit Chain
// ============================================================================

/**
 * Audit chain with chaining
 */
export class AuditChain {
  private tree = new MerkleTree();
  private lastHash = "genesis";
  
  /**
   * Add an audit entry
   */
  add(action: string, actor: string, data: unknown): AuditEntry {
    const entry: AuditEntry = {
      id: randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      action,
      actor,
      data,
      previousHash: this.lastHash,
    };
    
    this.tree.addEntry(entry);
    this.lastHash = this.tree.getRootHash();
    
    return entry;
  }

  /**
   * Get current root hash
   */
  getRootHash(): string {
    return this.tree.getRootHash();
  }

  /**
   * Verify entry
   */
  verify(entryId: string): boolean {
    const proof = this.tree.getProof(entryId);
    if (!proof) return false;
    return MerkleTree.verifyProof(proof);
  }

  /**
   * Get all entries
   */
  getEntries(): AuditEntry[] {
    return this.tree.getEntries();
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create audit chain
 */
export function createAuditChain(): AuditChain {
  return new AuditChain();
}

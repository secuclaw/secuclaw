---
summary: "Memory and context management in SecuClaw."
read_when:
  - Understanding memory system
  - Configuring context retention
title: "Memory"
---

# Memory

SecuClaw uses a hybrid memory system for knowledge retrieval and context management.

## Overview

```
┌─────────────────────────────────────────┐
│           Memory System                 │
├─────────────────────────────────────────┤
│  Vector Store    │  Full-Text Search   │
│  (ChromaDB)      │  (BM25)             │
├─────────────────────────────────────────┤
│         Hybrid Ranking Engine           │
└─────────────────────────────────────────┘
```

## Configuration

```json5
{
  memory: {
    enabled: true,
    vectorStore: {
      provider: "chromadb",
      dimension: 1536,
    },
    bm25: {
      enabled: true,
      k1: 1.5,
      b: 0.75,
    },
    topK: 10,
    minScore: 0.7,
  },
}
```

## Memory Types

### Short-term Memory

Conversation context within a session.

- Session-based isolation
- Automatic cleanup on session end

### Long-term Memory

Persistent knowledge stored in vector database.

- Security incident patterns
- IOC databases
- Vulnerability knowledge

## Usage

```bash
# Query memory
secuclaw memory query "previous SQL injection incidents"

# Add to memory
secuclaw memory add --type ioc --data "192.0.2.1 malware-c2"

# Clear memory
secuclaw memory clear --session session-id
```

## Hybrid Search

Combines vector similarity and BM25 for optimal results:

1. Vector search finds semantically similar content
2. BM25 finds exact keyword matches
3. Results are re-ranked using hybrid scoring

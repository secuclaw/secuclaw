# @secuclaw/edge

Lite runtime for SecuClaw edge deployments.

## Features
- Fast bootstrap with lazy module loading
- Minimal agent and gateway
- Memory optimization utilities
- Edge-safe shell/file/web tools

## Usage

```ts
import { bootstrap } from "@secuclaw/edge";

const runtime = await bootstrap();
console.log(runtime.getResourceUsage());
```

## Targets
- Startup time: < 100ms (runtime bootstrap path)
- Idle memory: < 20MB (depends on host, workload, and enabled modules)
- ARM compatible (Node.js 18+)

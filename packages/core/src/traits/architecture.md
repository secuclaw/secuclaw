# Trait-Driven Architecture (Phase 3)

## Goals
- Runtime-swappable implementations for provider/channel/tool/memory/agent
- Plugin-friendly registration model
- Backward-compatible incremental migration

## Shape
- `traits/*.ts` provides stable capability contracts
- Existing modules can implement these traits directly or via adapters
- `TraitRegistry` stores runtime bindings by trait kind + id

## Migration Strategy
1. Add trait contracts (non-breaking)
2. Add trait-aware registries/factories in each subsystem
3. Gradually migrate callsites to consume traits
4. Keep legacy APIs available until all integrations are migrated

## Runtime Switching
- Register multiple implementations for the same trait kind
- Select via config and dynamic factory lookup
- Fallback to default implementation if selected trait is unavailable

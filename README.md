# D&D Combat Widget — ChatGPT Site

Adapted from https://github.com/pizzapizza1987-bot/dnd-combat-widget, preserving its Eastern Watch tactical map, combatant selector, and command dock.

- Primary and only MCP tool: `open_dnd_combat`
- Verified deployed Streamable HTTP endpoint: `/api/mcp`. The handler also accepts `/mcp`, but Sites currently reserves that public route.
- UI resource: MCP Apps HTML with both the standard message bridge and the existing ChatGPT compatibility bridge.
- Standalone Site: displays the interface; sending requires a ChatGPT host bridge and authoritative tool result.
- No database, dice rolls, automated resolution, token movement, or authoritative state writes.

## Player-safe contract

ChatGPT must construct player-safe arguments **before calling the tool**. MCP hosts may expose arguments, so never include DM notes, hidden enemies, hidden coordinates, or undisclosed mechanics in arguments. The server also projects an allowlisted result, removes non-visible entities, strips arbitrary extra fields and notes, and removes enemy movement mechanics. For coordinates to appear, `positionPlayerVisible` must explicitly be true; otherwise x/y/z are null. Text fields such as names must already be safe to reveal. The renderer cannot infer whether a name contains a secret.

Each declaration contains encounterId, stateRevision, round, phase, a unique declarationId, and kind=proposal. ChatGPT must reject stale or duplicate declarations and adjudicate according to campaign rules. Supply a new revision using `open_dnd_combat` afterward. UI selection and view fitting are presentation-only. Pending declarations remain locked until a different authoritative revision is received; failed delivery keeps the typed text for retry.

The original map is an Eastern Watch Station schematic; it is not generated geometry or an authoritative movement calculator. Do not use it to disclose unvisited areas or imply scale accuracy beyond the supplied campaign map.

## Build and verify

`npm ci`, `npm run build`, `npm test`, `npx tsc --noEmit`.

Sites deploys the Worker in `dist/server/index.js` with its generated Wrangler configuration. The source Next.js adapter is retained for compatibility (`npm run build:next`). The Site's MCP implementation shares the player-safe projection with that adapter.

## Connection status

The existing Sites plugin is published and recognized. Version 4 rebuilds the inline UI as a fixed 500px surface with one MCP Apps bridge, no canvas, no resize observers, and an optional SVG display of disclosed positions. Real-device ChatGPT rendering still requires confirmation. Older interactive UI is retained as a reference in public/combat-widget-interactive.html.

GitHub is a synchronized source mirror; pushing there does not automatically update the Sites publication.

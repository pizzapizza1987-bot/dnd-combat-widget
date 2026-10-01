# D&D Combat Widget — ChatGPT Site

Player-safe D&D tactical combat UI for ChatGPT. ChatGPT remains the sole combat authority.

- Primary and only MCP tool: `open_dnd_combat`
- Authoritative MCP server: the Worker in `src/worker.ts`
- MCP endpoints served by that same Worker: `/api/mcp` and `/mcp`
- Single UI resource URI: `ui://dnd-combat/combat-v5.html`
- No database, dice rolls, automated resolution, token movement, or authoritative state writes

## Player-safe contract

ChatGPT must construct player-safe arguments **before calling the tool**. MCP hosts may expose arguments, so never include DM notes, hidden enemies, hidden coordinates, or undisclosed mechanics in arguments. The server also projects an allowlisted result, removes non-visible entities, strips arbitrary extra fields and notes, and removes enemy movement mechanics. For coordinates to appear, `positionPlayerVisible` must explicitly be true; otherwise x/y/z are null. Text fields such as names must already be safe to reveal.

Each future declaration will contain encounterId, stateRevision, round, phase, a unique declarationId, and kind=proposal. ChatGPT must reject stale or duplicate declarations and adjudicate according to campaign rules. Supply a new revision using `open_dnd_combat` afterward.

## Version 5 recovery build

Version 5 deliberately isolates MCP startup from every optional widget feature.

The current embedded UI is fixed at 500 px and contains no canvas, SVG map, ResizeObserver, DPR scaling, fullscreen request, host-size notification, or chat-message sending. It displays only startup checkpoints and player-safe combat state.

The view bridge is intentionally tiny. It does **not** bundle the MCP Apps client SDK. Instead it implements the stable MCP Apps JSON-RPC iframe handshake directly over `postMessage`:

1. `UI parsed`
2. `Bridge parsed`
3. `Connecting`
4. `MCP initialized`
5. `Tool result received`

This makes native-app failure location visible. If `Bridge parsed` never appears, the generated bridge did not parse or execute. If startup stops at `Connecting`, the failure is in the host initialization handshake. If `MCP initialized` appears but no result arrives, the problem is result delivery rather than JavaScript parsing.

Declarations, SVG, fullscreen, and tactical-map features stay disabled until this recovery build survives the Android ChatGPT app.

## One MCP/resource path

The previous duplicate Next.js MCP route has been removed. Sites deploys the Worker in `dist/server/index.js`; that Worker owns both `/api/mcp` and `/mcp` and registers one combat resource URI. There is no second raw-HTML resource path that can silently drift from the generated widget.

## Build and verify

Run:

```text
npm ci
npm run build
npm test
npx tsc --noEmit
```

The build now parses the generated bridge JavaScript and every inline `<script>` in the final `build/widget.html`. A malformed or truncated generated script fails the build immediately. CI runs the build, tests, and TypeScript checks on pull requests and pushes to `main`.

The test suite reads the actual generated `build/widget.html`, not a mocked bridge, and the mobile regression test targets the current v5 widget instead of the retired interactive HTML.

## Publishing

GitHub is a synchronized source mirror. Pushing or merging this repository does **not** automatically replace the already-published ChatGPT Site/plugin. After this branch passes CI, the same source must be synchronized into the existing Sites project and republished before the live plugin will use version 5.

import { createMcpHandler } from "mcp-handler";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { combatStateSchema, playerSafeOutputSchema, playerSafeState } from "../../src/state";
import fs from "node:fs/promises";
import path from "node:path";

const UI_VERSION = "2026-09-30-sites-1";
const RESOURCE_URI = `ui://dnd-combat/live-combat.html?v=${UI_VERSION}`;

const handler = createMcpHandler(async (server) => {
  const widgetHtml = await fs.readFile(
    path.join(process.cwd(), "public", "combat-widget.html"),
    "utf8",
  );

  registerAppResource(
    server,
    "D&D Combat",
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: { prefersBorder: false },
            "openai/ui": { availableDisplayModes: ["inline", "fullscreen"] },
            "openai/widgetDescription": "Interactive tactical combat map and live command dock. Commands return to ChatGPT for authoritative DM adjudication.",
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "open_dnd_combat",
    {
      title: "D&D Combat",
      description: "Open the live D&D tactical combat widget for an active encounter. Use whenever combat is active. Supply PLAYER-SAFE state only; never pass DM-only mechanics, hidden enemies, or secret coordinates.",
      inputSchema: {
        combatState: combatStateSchema,
      },
      outputSchema:playerSafeOutputSchema.shape,
  annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI, visibility: ["model"] },
        "openai/outputTemplate": RESOURCE_URI,
        "openai/toolInvocation/invoking": "Opening combat…",
        "openai/toolInvocation/invoked": "Combat ready",
        "openai/resultCanProduceWidget": true,
      },
    },
    async ({ combatState }) => {
      const safeState = playerSafeState(combatState);
      return {
        content: [
          {
            type: "text" as const,
            text: `Combat active: round ${safeState.round}, ${safeState.phase}.`,
          },
        ],
        structuredContent: { combatState: safeState },
      };
    },
  );
});

export const GET = handler;
export const POST = handler;

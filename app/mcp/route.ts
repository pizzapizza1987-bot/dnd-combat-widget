import { createMcpHandler } from "mcp-handler";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const UI_VERSION = "2026-10-01-2";
const RESOURCE_URI = `ui://dnd-combat/live-combat.html?v=${UI_VERSION}`;

const combatantSchema = z.object({
  entityId: z.string(),
  name: z.string(),
  side: z.enum(["party", "hostile"]),
  movementFt: z.number().nullable().optional(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  z: z.number().default(0),
  positionCertainty: z.string(),
  positionBasis: z.string(),
  playerVisible: z.boolean(),
  positionPlayerVisible: z.boolean().optional().default(false),
});

const combatStateSchema = z.object({
  schemaVersion: z.string().optional(),
  authority: z.string().optional(),
  campaignId: z.string(),
  encounterId: z.string(),
  stateRevision: z.string(),
  round: z.number().int().min(1),
  phase: z.string(),
  map: z.object({
    mapId: z.string().optional(),
    sourceScaleStatus: z.string().optional(),
    north: z.string().optional(),
    scale: z.object({
      pixelsPerFoot: z.number().positive().optional(),
      status: z.string().optional(),
      confidence: z.string().optional(),
      basis: z.string().optional(),
      manualCalibrationMayOverride: z.boolean().optional(),
    }).optional(),
  }).optional(),
  combatants: z.array(combatantSchema),
});

const outputSchema = z.object({
  combatState: combatStateSchema,
});

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
      description: "Open the live D&D tactical combat widget for an active encounter. Use whenever combat is active. Supply PLAYER-SAFE state only; never pass DM-only mechanics, hidden enemies, secret rolls, or undisclosed coordinates.",
      inputSchema: {
        combatState: combatStateSchema,
      },
      outputSchema: {
        combatState: combatStateSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        "openai/outputTemplate": RESOURCE_URI,
        "openai/toolInvocation/invoking": "Opening combat…",
        "openai/toolInvocation/invoked": "Combat ready",
        "openai/resultCanProduceWidget": true,
      },
    },
    async ({ combatState }) => {
      const parsed = combatStateSchema.parse(combatState);
      const safeState = {
        ...parsed,
        combatants: parsed.combatants
          .filter((c) => c.playerVisible === true)
          .map((c) => ({
            ...c,
            x: c.positionPlayerVisible === true ? c.x : null,
            y: c.positionPlayerVisible === true ? c.y : null,
          })),
      };

      const structuredContent = outputSchema.parse({ combatState: safeState });

      return {
        content: [
          {
            type: "text" as const,
            text: `Combat active: round ${safeState.round}, ${safeState.phase}.`,
          },
        ],
        structuredContent,
      };
    },
  );
});

export const GET = handler;
export const POST = handler;

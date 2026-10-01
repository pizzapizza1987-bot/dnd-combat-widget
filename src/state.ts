import { z } from "zod";
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
  positionPlayerVisible: z.boolean().default(false),
});

export const combatStateSchema = z.object({
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

export function playerSafeState(input: unknown) {
 const parsed = combatStateSchema.parse(input);
 return {
   schemaVersion: parsed.schemaVersion, authority: 'ChatGPT',
   campaignId: parsed.campaignId, encounterId: parsed.encounterId,
   stateRevision: parsed.stateRevision, round: parsed.round, phase: parsed.phase,
   map: parsed.map ? { mapId: parsed.map.mapId } : undefined,
   combatants: parsed.combatants.filter(c => c.playerVisible === true).map(c => ({
     entityId: c.entityId, name: c.name, side: c.side, playerVisible: true,
     positionPlayerVisible: c.positionPlayerVisible,
     x: c.positionPlayerVisible ? c.x : null,
     y: c.positionPlayerVisible ? c.y : null,
     z: c.positionPlayerVisible ? c.z : null,
     positionCertainty: c.positionPlayerVisible ? 'disclosed' : 'undisclosed',
     positionBasis: c.positionPlayerVisible ? 'Player-known position' : 'Position not disclosed',
     movementFt: c.side === 'party' ? c.movementFt : null,
   }))
 };
}

export const playerSafeOutputSchema = z.object({combatState: combatStateSchema.extend({
 authority: z.literal('ChatGPT'),
 combatants: z.array(combatantSchema.extend({z:z.number().nullable(),playerVisible:z.literal(true)})),
})});

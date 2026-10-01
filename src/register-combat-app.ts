import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import {
  combatStateSchema,
  playerSafeOutputSchema,
  playerSafeState,
} from './state';

export const COMBAT_RESOURCE_URI='ui://dnd-combat/combat-v5.html';

export function registerCombatApp(server:any, html:string){
  registerAppResource(
    server,
    'D&D Combat',
    COMBAT_RESOURCE_URI,
    {mimeType:RESOURCE_MIME_TYPE},
    async()=>({
      contents:[{
        uri:COMBAT_RESOURCE_URI,
        mimeType:RESOURCE_MIME_TYPE,
        text:html,
        _meta:{
          ui:{
            prefersBorder:false,
            csp:{connectDomains:[],resourceDomains:[]},
          },
          'openai/widgetDescription':'Player-safe D&D combat recovery view. ChatGPT alone resolves combat.',
          'openai/widgetPrefersBorder':false,
          'openai/ui':{availableDisplayModes:['inline']},
        },
      }],
    }),
  );

  registerAppTool(
    server,
    'open_dnd_combat',
    {
      title:'D&D Combat',
      description:'Primary tool: open or refresh the D&D tactical combat interface. ChatGPT is the sole authority. Supply only player-safe state: never send hidden enemies, DM-only details, secret notes, or undisclosed coordinates in arguments. Set positionPlayerVisible=true ONLY for coordinates already known to the player; otherwise supply null coordinates. Widget declarations are unexecuted proposals tied to stateRevision; adjudicate them in the conversation, then call this tool with the new authoritative revision. Do not treat a declaration as a resolved action.',
      inputSchema:{combatState:combatStateSchema},
      outputSchema:playerSafeOutputSchema.shape,
      annotations:{
        readOnlyHint:true,
        destructiveHint:false,
        openWorldHint:false,
      },
      _meta:{
        ui:{resourceUri:COMBAT_RESOURCE_URI,visibility:['model']},
        'openai/outputTemplate':COMBAT_RESOURCE_URI,
        'openai/toolInvocation/invoking':'Opening combat…',
        'openai/toolInvocation/invoked':'Combat ready',
        'openai/widgetAccessible':false,
        'openai/resultCanProduceWidget':true,
      },
    },
    async({combatState}:any)=>{
      const safe=playerSafeState(combatState);
      return{
        content:[{
          type:'text',
          text:`Combat widget ready. Recovery build is display-only while MCP startup is verified. Round ${safe.round}, ${safe.phase}. Revision ${safe.stateRevision}. ChatGPT remains authoritative.`,
        }],
        structuredContent:{combatState:safe},
      };
    },
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { combatStateSchema, playerSafeOutputSchema, playerSafeState } from './state';
import html from '../build/widget.html';
const uri='ui://dnd-combat/combat-rebuilt-v4.html';
function server() {
 const mcp=new McpServer({name:'dnd-combat-widget',version:'1.1.0'});
 registerAppResource(mcp,'D&D Combat',uri,{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{uri,mimeType:RESOURCE_MIME_TYPE,text:html,_meta:{ui:{prefersBorder:false,csp:{connectDomains:[],resourceDomains:[]}},'openai/widgetDescription':'Player-safe tactical map and declaration dock. ChatGPT alone resolves combat.','openai/widgetPrefersBorder':false,'openai/ui':{availableDisplayModes:['inline','fullscreen']}}}]}));
 registerAppTool(mcp,'open_dnd_combat',{
  title:'D&D Combat',
  description:'Primary tool: open or refresh the D&D tactical combat interface. ChatGPT is the sole authority. Supply only player-safe state: never send hidden enemies, DM-only details, secret notes, or undisclosed coordinates in arguments. Set positionPlayerVisible=true ONLY for coordinates already known to the player; otherwise supply null coordinates. Widget declarations are unexecuted proposals tied to stateRevision; adjudicate them in the conversation, then call this tool with the new authoritative revision. Do not treat a declaration as a resolved action.',
  inputSchema:{combatState:combatStateSchema},
  outputSchema:playerSafeOutputSchema.shape,
  annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
  _meta:{ui:{resourceUri:uri,visibility:['model']},'openai/outputTemplate':uri,'openai/toolInvocation/invoking':'Opening combat…','openai/toolInvocation/invoked':'Combat ready','openai/widgetAccessible':false,'openai/resultCanProduceWidget':true}
 },async({combatState})=>{const safe=playerSafeState(combatState);return{content:[{type:'text',text:`Combat widget ready. Actions are proposals for DM adjudication. Round ${safe.round}, ${safe.phase}. Revision ${safe.stateRevision}. ChatGPT remains authoritative.`}],structuredContent:{combatState:safe}}});
 return mcp;
}
export default {
 async fetch(request:Request):Promise<Response>{
  const path=new URL(request.url).pathname;
  if(path==='/mcp'||path==='/mcp/'||path==='/api/mcp'||path==='/api/mcp/') {
   // Discovery is public; data-bearing calls require the Sites trusted identity.
   if(request.method==='POST') {
    let body:any;
    try { body=await request.clone().json(); } catch { return Response.json({error:'Invalid JSON'},{status:400}); }
    if(body?.method==='tools/call'&&!request.headers.get('oai-authenticated-user-id'))
     return Response.json({error:'Authenticated Sites identity required'},{status:401});
   }
   const mcp=server();
   const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
   await mcp.connect(transport);
   const response=await transport.handleRequest(request);
   return response;
  }
  if(path==='/'||path==='/combat-widget.html')return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(path==='/health')return Response.json({ok:true,tool:'open_dnd_combat',authority:'ChatGPT'});
  return new Response('Not found',{status:404});
 }
};

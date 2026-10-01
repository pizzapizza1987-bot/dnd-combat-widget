import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import html from '../build/widget.html';
import { registerCombatApp } from './register-combat-app';

function server(){
  const mcp=new McpServer({name:'dnd-combat-widget',version:'1.2.0'});
  registerCombatApp(mcp,html);
  return mcp;
}

export default {
  async fetch(request:Request):Promise<Response>{
    const path=new URL(request.url).pathname;

    if(path==='/mcp'||path==='/mcp/'||path==='/api/mcp'||path==='/api/mcp/'){
      // Discovery is public; data-bearing calls require the Sites trusted identity.
      if(request.method==='POST'){
        let body:any;
        try{
          body=await request.clone().json();
        }catch{
          return Response.json({error:'Invalid JSON'},{status:400});
        }
        if(body?.method==='tools/call'&&!request.headers.get('oai-authenticated-user-id')){
          return Response.json({error:'Authenticated Sites identity required'},{status:401});
        }
      }

      const mcp=server();
      const transport=new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator:undefined,
        enableJsonResponse:true,
      });
      await mcp.connect(transport);
      return transport.handleRequest(request);
    }

    if(path==='/'||path==='/combat-widget.html'){
      return new Response(html,{headers:{
        'content-type':'text/html; charset=utf-8',
        'cache-control':'no-store',
        'x-content-type-options':'nosniff',
      }});
    }

    if(path==='/health'){
      return Response.json({
        ok:true,
        tool:'open_dnd_combat',
        authority:'ChatGPT',
        recoveryBuild:'v5',
      });
    }

    return new Response('Not found',{status:404});
  },
};

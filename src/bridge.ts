type JsonRpcResult={jsonrpc:'2.0';id:number;result?:unknown;error?:{message?:string}|unknown};
type JsonRpcNotification={jsonrpc:'2.0';method:string;params?:any};
type PendingRequest={resolve:(value:unknown)=>void;reject:(error:Error)=>void};

const pending=new Map<number,PendingRequest>();
let nextId=1;

function checkpoint(label:string){
  window.dispatchEvent(new CustomEvent('dnd:checkpoint',{detail:label}));
}

function fail(error:unknown){
  const message=error instanceof Error?error.message:String(error);
  window.dispatchEvent(new CustomEvent('dnd:error',{detail:message}));
}

function sendRequest(method:string,params:unknown){
  const id=nextId++;
  const promise=new Promise<unknown>((resolve,reject)=>{
    pending.set(id,{resolve,reject});
  });
  window.parent.postMessage({jsonrpc:'2.0',id,method,params},'*');
  return promise;
}

function sendNotification(method:string,params:unknown={}){
  window.parent.postMessage({jsonrpc:'2.0',method,params},'*');
}

window.addEventListener('message',event=>{
  if(event.source!==window.parent) return;
  const data=event.data as JsonRpcResult|JsonRpcNotification|undefined;
  if(!data||data.jsonrpc!=='2.0') return;

  if('id' in data&&typeof data.id==='number'){
    const request=pending.get(data.id);
    if(!request) return;
    pending.delete(data.id);
    if('error' in data&&data.error){
      const message=typeof data.error==='object'&&data.error&&'message' in data.error
        ?String(data.error.message)
        :String(data.error);
      request.reject(new Error(message));
    }else{
      request.resolve(data.result);
    }
    return;
  }

  if('method' in data&&data.method==='ui/notifications/tool-result'){
    checkpoint('Tool result received');
    window.dispatchEvent(new CustomEvent('dnd:result',{
      detail:data.params?.structuredContent,
    }));
  }
});

checkpoint('Bridge parsed');

if(window.parent!==window){
  checkpoint('Connecting');
  sendRequest('ui/initialize',{
    appCapabilities:{},
    appInfo:{name:'D&D Combat',version:'1.3.0'},
    protocolVersion:'2026-01-26',
  })
    .then(()=>{
      sendNotification('ui/notifications/initialized',{});
      (window as Window&{dndBridge?:{connected:true}}).dndBridge={connected:true};
      checkpoint('MCP initialized');
      window.dispatchEvent(new Event('dnd:connected'));
    })
    .catch(fail);
}

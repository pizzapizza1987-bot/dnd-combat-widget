import { App } from '@modelcontextprotocol/ext-apps';
const app = new App({ name: 'D&D Combat', version: '1.2.0' }, {}, { autoResize: false });
app.onhostcontextchanged = context => { if (context.displayMode) window.dispatchEvent(new CustomEvent('dnd:mode', {detail:context.displayMode})); };
app.ontoolresult = result => window.dispatchEvent(new CustomEvent('dnd:result', { detail: result.structuredContent }));
if (window.parent !== window) {
 app.connect().then(() => {
  // Fixed inline surface: never measure and resize the host in a feedback loop.
  void app.sendSizeChanged({height:500}).catch(error => window.dispatchEvent(new CustomEvent('dnd:error', {detail:error.message})));
  const mode=app.getHostContext()?.displayMode;
  if(mode) window.dispatchEvent(new CustomEvent('dnd:mode', {detail:mode}));
  (window as any).dndBridge = { requestDisplayMode: (params: {mode:'inline'|'fullscreen'}) => app.requestDisplayMode(params), sendFollowUpMessage: async ({prompt}: {prompt:string}) => {
   const result = await app.sendMessage({ role: 'user', content: [{type:'text', text:prompt}] });
   if (result.isError) throw new Error('ChatGPT did not accept the declaration.');
  }};
  window.dispatchEvent(new Event('dnd:connected'));
 }).catch(error => window.dispatchEvent(new CustomEvent('dnd:error', {detail:error.message})));
}

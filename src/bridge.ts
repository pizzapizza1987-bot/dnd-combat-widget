import { App } from '@modelcontextprotocol/ext-apps';

function checkpoint(label: string) {
  window.dispatchEvent(new CustomEvent('dnd:checkpoint', { detail: label }));
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(new CustomEvent('dnd:error', { detail: message }));
}

checkpoint('Bridge parsed');

const app = new App(
  { name: 'D&D Combat', version: '1.3.0' },
  {},
  { autoResize: false },
);

app.ontoolresult = result => {
  checkpoint('Tool result received');
  window.dispatchEvent(
    new CustomEvent('dnd:result', { detail: result.structuredContent }),
  );
};

if (window.parent !== window) {
  checkpoint('Connecting');
  app.connect()
    .then(() => {
      // Recovery build: deliberately no size notifications, fullscreen requests,
      // ui/message calls, graphics, or local combat resolution. The only goal is
      // to prove that the MCP Apps ui/initialize handshake survives native hosts.
      (window as Window & { dndBridge?: { connected: true } }).dndBridge = {
        connected: true,
      };
      checkpoint('MCP initialized');
      window.dispatchEvent(new Event('dnd:connected'));
    })
    .catch(fail);
}

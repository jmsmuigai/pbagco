// MCP (Model Context Protocol) server for PBAG, mounted at POST /mcp
// (Streamable HTTP, stateless). Lets any MCP-capable AI agent — Claude,
// Gemini CLI, ChatGPT connectors, a promoter's own assistant — discover PBAG
// shows, check availability, read PBAG info and file booking requests.
// Payments are deliberately NOT exposed: buyers always pay on pbagco.com.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOLS } from './tools.js';

function build(db) {
  const server = new McpServer({ name: 'pbag-consortium', version: '1.0.0' });
  for (const t of TOOLS) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.schema }, async (args) => {
      const result = await t.run(db, args || {}, { source: 'mcp' });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
  }
  return server;
}

export function mountMcp(app, db) {
  app.post('/mcp', async (req, res) => {
    try {
      const server = build(db);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('[mcp]', e);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  });
  const nope = (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: use POST)' }, id: null });
  app.get('/mcp', nope);
  app.delete('/mcp', nope);
}

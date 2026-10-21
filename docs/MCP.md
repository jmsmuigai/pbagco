# PBAG MCP server

Endpoint: `POST https://pbagco.com/mcp` (Streamable HTTP, stateless, no auth — read-mostly public data).

Tools: `list_upcoming_events`, `check_ticket_availability`, `get_pbag_info`, `check_booking_dates`, `request_booking`, `recommend_comedy`.
The same tools power Cue (Gemini function calling) — one tool layer in `server/tools.js`. Payments are intentionally not exposed; agents send buyers to pbagco.com to pay.

Connect from Claude Desktop / Claude Code: `claude mcp add --transport http pbag https://pbagco.com/mcp`
Test: `npx @modelcontextprotocol/inspector` → URL `http://localhost:8080/mcp`.

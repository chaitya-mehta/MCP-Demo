import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./index.js";
import { closePool } from "./db/index.js";

/**
 * Enterprise MCP Server - HTTP & Server-Sent Events (SSE) Transport
 * Designed for Cloud Deployment (Railway, Render, Fly.io, Cloud Run).
 */

const app = express();
app.use(cors());

// Active client transport sessions
const activeTransports = new Map<string, SSEServerTransport>();

/**
 * Healthcheck endpoint for cloud hosting platforms (Railway, Render, Kubernetes).
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    server: "enterprise-directory-mcp-server",
    protocol: "Model Context Protocol (MCP)",
    transport: "SSE (Server-Sent Events)",
    activeSessions: activeTransports.size,
    uptime: Math.floor(process.uptime())
  });
});

/**
 * Root informational endpoint.
 */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Enterprise Directory MCP Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; background: #0f172a; color: #f8fafc; }
          h1 { color: #38bdf8; }
          code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #f472b6; }
          .card { background: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #334155; }
          .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; margin-right: 6px; }
        </style>
      </head>
      <body>
        <h1><span class="status"></span>Enterprise Directory MCP Server</h1>
        <p>This is a live <strong>Model Context Protocol (MCP)</strong> Server backed by PostgreSQL & TypeORM.</p>
        
        <div class="card">
          <h3>Connection Endpoints</h3>
          <p><strong>SSE Stream:</strong> <code>GET /sse</code></p>
          <p><strong>Message Post:</strong> <code>POST /messages?sessionId=...</code></p>
          <p><strong>Health Check:</strong> <code>GET /health</code></p>
        </div>

        <div class="card">
          <h3>Claude Desktop Connection</h3>
          <p>Connect this remote server in Claude Desktop's <code>claude_desktop_config.json</code>:</p>
          <pre style="background:#0b1120; padding:12px; border-radius:6px; overflow-x:auto;">
{
  "mcpServers": {
    "enterprise-directory": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://${_req.headers.host || "your-server-url"}/sse"]
    }
  }
}</pre>
        </div>
      </body>
    </html>
  `);
});

/**
 * SSE Connection Endpoint
 * Claude Desktop or remote MCP clients establish a persistent SSE stream here.
 */
app.get("/sse", async (req: Request, res: Response) => {
  console.log(`[MCP SSE] New incoming SSE connection from ${req.ip}`);

  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;

  activeTransports.set(sessionId, transport);
  console.log(`[MCP SSE] Session established: ${sessionId} (Active sessions: ${activeTransports.size})`);

  res.on("close", () => {
    console.log(`[MCP SSE] Session closed: ${sessionId}`);
    activeTransports.delete(sessionId);
  });

  const mcpServer = createServer();
  await mcpServer.connect(transport);
});

/**
 * Message Post Endpoint
 * Clients post JSON-RPC messages to this endpoint referencing their SSE sessionId.
 */
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "Missing required 'sessionId' query parameter" });
    return;
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: `Session not found: ${sessionId}` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

const PORT = parseInt(process.env.PORT || "3000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`=================================================`);
  console.log(`  Enterprise MCP Server (HTTP & SSE Cloud Mode)  `);
  console.log(`=================================================`);
  console.log(`Server listening on port: ${PORT}`);
  console.log(`SSE Endpoint:    http://localhost:${PORT}/sse`);
  console.log(`Healthcheck:     http://localhost:${PORT}/health`);
  console.log(`Database Target: ${process.env.DATABASE_URL ? "Cloud Database (DATABASE_URL)" : "Local PostgreSQL"}`);
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\n[MCP Server] Received ${signal}. Closing HTTP server and DB connections...`);
  server.close(async () => {
    try {
      await closePool();
      console.log("[MCP Server] All connections closed cleanly. Exiting.");
      process.exit(0);
    } catch (err) {
      console.error("[MCP Server] Error during database shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

import "reflect-metadata";
import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./index.js";
import { closePool } from "./db/index.js";

/**
 * Enterprise MCP Server - Dual HTTP & SSE Transport
 * Supports both:
 * 1. Streamable HTTP (Modern MCP protocol for Claude Custom Connectors, Claude Desktop, Cursor)
 * 2. Legacy HTTP+SSE Transport (GET /sse stream + POST /messages for older clients and mcp-remote)
 */

const app = express();
app.use(cors());
app.use(express.json());

interface SessionRecord {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  type: "streamable" | "sse";
  lastActive: number;
}

// Active client transport sessions
const sessions = new Map<string, SessionRecord>();

// Clean up idle sessions (30 minute timeout)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - IDLE_TIMEOUT_MS;
  for (const [id, session] of sessions.entries()) {
    if (session.lastActive < cutoff) {
      sessions.delete(id);
      session.transport.close().catch(() => {});
    }
  }
}, 60000).unref();

/**
 * Core MCP Request Handler
 * Handles Streamable HTTP requests (POST, GET, DELETE) and legacy SSE connections.
 */
async function handleMcpRequest(req: Request, res: Response) {
  const sessionId = (req.headers["mcp-session-id"] as string) || (req.query.sessionId as string);
  const existingSession = sessionId ? sessions.get(sessionId) : undefined;

  // 1. Existing Streamable HTTP session
  if (existingSession && existingSession.type === "streamable") {
    existingSession.lastActive = Date.now();
    await (existingSession.transport as StreamableHTTPServerTransport).handleRequest(req, res, req.body);
    return;
  }

  // 2. New Streamable HTTP Initialization (Claude Custom Connectors / Streamable Clients)
  if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
    console.log(`[MCP Streamable] New incoming initialization request from ${req.ip}`);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        console.log(`[MCP Streamable] Session initialized: ${sid}`);
        sessions.set(sid, {
          transport,
          type: "streamable",
          lastActive: Date.now()
        });
      }
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && sessions.has(sid)) {
        console.log(`[MCP Streamable] Session closed: ${sid}`);
        sessions.delete(sid);
      }
    };

    const mcpServer = createServer();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // 3. Legacy SSE GET Connection (mcp-remote / legacy clients)
  if (req.method === "GET" && (req.headers.accept?.includes("text/event-stream") || !sessionId)) {
    console.log(`[MCP SSE] New incoming SSE connection from ${req.ip}`);

    const transport = new SSEServerTransport("/messages", res);
    const sid = transport.sessionId;

    sessions.set(sid, {
      transport,
      type: "sse",
      lastActive: Date.now()
    });

    console.log(`[MCP SSE] SSE Session established: ${sid} (Active sessions: ${sessions.size})`);

    res.on("close", () => {
      console.log(`[MCP SSE] SSE Session closed: ${sid}`);
      sessions.delete(sid);
    });

    const mcpServer = createServer();
    await mcpServer.connect(transport);
    return;
  }

  // 4. Legacy SSE Message Post to the same endpoint
  if (sessionId && req.method === "POST" && existingSession?.type === "sse") {
    await (existingSession.transport as SSEServerTransport).handlePostMessage(req, res, req.body);
    return;
  }

  // Fallback / Invalid session
  if (sessionId && !existingSession) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Session not found or expired" },
      id: null
    });
    return;
  }

  res.status(400).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Bad Request: Invalid MCP request" },
    id: null
  });
}

/**
 * Healthcheck endpoint for cloud hosting platforms (Railway, Render, Kubernetes).
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    server: "enterprise-directory-mcp-server",
    protocol: "Model Context Protocol (MCP)",
    transports: ["Streamable HTTP", "SSE (Server-Sent Events)"],
    activeSessions: sessions.size,
    uptime: Math.floor(process.uptime())
  });
});

/**
 * MCP Endpoints
 * Claude Custom Connectors and remote clients can use /sse, /mcp, or root /.
 */
app.all("/sse", handleMcpRequest);
app.all("/mcp", handleMcpRequest);

/**
 * Legacy SSE Message Post Endpoint (/messages?sessionId=...)
 */
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const session = sessionId ? sessions.get(sessionId) : undefined;

  if (!sessionId) {
    res.status(400).json({ error: "Missing required 'sessionId' query parameter" });
    return;
  }

  if (!session || session.type !== "sse") {
    res.status(404).json({ error: `SSE Session not found: ${sessionId}` });
    return;
  }

  await (session.transport as SSEServerTransport).handlePostMessage(req, res, req.body);
});

/**
 * Root Endpoint
 * - POST: Handles Streamable HTTP if client calls root /
 * - GET: Returns HTML Dashboard if accessed in a browser
 */
app.post("/", async (req: Request, res: Response) => {
  if (isInitializeRequest(req.body) || req.headers["mcp-session-id"]) {
    await handleMcpRequest(req, res);
  } else {
    res.status(404).json({ error: "Not an MCP endpoint" });
  }
});

app.get("/", (req: Request, res: Response) => {
  // If client requested SSE on root /
  if (req.headers.accept?.includes("text/event-stream")) {
    handleMcpRequest(req, res);
    return;
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Enterprise Directory MCP Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 20px; line-height: 1.6; background: #0f172a; color: #f8fafc; }
          h1 { color: #38bdf8; display: flex; align-items: center; gap: 10px; }
          code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #f472b6; font-family: monospace; }
          .card { background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #334155; }
          .status { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; }
          .badge { background: #0369a1; color: #e0f2fe; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
          pre { background: #0b1120; padding: 14px; border-radius: 6px; overflow-x: auto; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <h1><span class="status"></span>Enterprise Directory MCP Server <span class="badge">Live</span></h1>
        <p>This is a live <strong>Model Context Protocol (MCP)</strong> Server backed by PostgreSQL & TypeORM.</p>
        
        <div class="card">
          <h3>Compatible Endpoints</h3>
          <p><strong>Claude Custom Connector / Modern MCP:</strong> <code>https://${req.headers.host || "your-app.onrender.com"}/sse</code> or <code>/mcp</code></p>
          <p><strong>Legacy SSE Stream:</strong> <code>GET /sse</code></p>
          <p><strong>Message Post:</strong> <code>POST /messages?sessionId=...</code></p>
          <p><strong>Health Check:</strong> <code>GET /health</code></p>
        </div>

        <div class="card">
          <h3>Claude Desktop Configuration (Alternative)</h3>
          <p>Add to <code>claude_desktop_config.json</code>:</p>
          <pre>{
  "mcpServers": {
    "enterprise-directory": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://${req.headers.host || "your-app.onrender.com"}/sse"]
    }
  }
}</pre>
        </div>
      </body>
    </html>
  `);
});

const PORT = parseInt(process.env.PORT || "3000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`=================================================`);
  console.log(`  Enterprise MCP Server (Dual Streamable + SSE)  `);
  console.log(`=================================================`);
  console.log(`Server listening on port: ${PORT}`);
  console.log(`Streamable HTTP: http://localhost:${PORT}/sse and /mcp`);
  console.log(`Legacy SSE:      http://localhost:${PORT}/sse`);
  console.log(`Healthcheck:     http://localhost:${PORT}/health`);
  console.log(`Database Target: ${process.env.DATABASE_URL ? "Cloud Database (DATABASE_URL)" : "Local PostgreSQL"}`);
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\n[MCP Server] Received ${signal}. Closing all sessions and DB connections...`);
  
  // Close active transports
  for (const [id, session] of sessions.entries()) {
    try {
      await session.transport.close();
    } catch {
      // ignore
    }
  }
  sessions.clear();

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

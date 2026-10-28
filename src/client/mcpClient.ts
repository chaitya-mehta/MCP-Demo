import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Enterprise MCP Client Wrapper
 *
 * Establishes a standard MCP connection to the MCP Server over stdio.
 * Discovers tools dynamically and executes tool requests strictly via the
 * Model Context Protocol JSON-RPC specification.
 */
export class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;

  /**
   * Initializes and connects to the MCP Server subprocess.
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("[MCP Client] Already connected.");
      return;
    }

    // Resolve path to the server entrypoint (supports both TypeScript source and compiled dist)
    const tsServerPath = path.resolve(__dirname, "../server/index.ts");
    const jsServerPath = path.resolve(__dirname, "../server/index.js");

    let command = process.execPath;
    let args: string[];

    if (fs.existsSync(tsServerPath)) {
      args = ["--import", "tsx", tsServerPath];
    } else if (fs.existsSync(jsServerPath)) {
      args = [jsServerPath];
    } else {
      throw new Error(`MCP Server entrypoint not found at ${tsServerPath} or ${jsServerPath}`);
    }

    console.log(`[MCP Client] Connecting to MCP Server via stdio transport...`);
    console.log(`[MCP Client] Spawning server process: ${command} ${args.join(" ")}`);

    try {
      this.transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || "development"
        }
      });

      this.client = new Client(
        {
          name: "enterprise-mcp-client",
          version: "1.0.0"
        },
        {
          capabilities: {}
        }
      );

      // Handle process errors
      this.transport.onerror = (error) => {
        console.error("[MCP Client Transport Error]:", error);
      };

      this.transport.onclose = () => {
        console.log("[MCP Client] Server transport connection closed.");
        this.isConnected = false;
      };

      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log("[MCP Client] Successfully connected to MCP server!");
    } catch (error) {
      this.isConnected = false;
      console.error("[MCP Client] Connection failure:", error);
      throw new Error(
        `Failed to connect to MCP Server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Discovers all available tools exposed by the MCP server.
   * Tool schemas are retrieved dynamically over the wire.
   */
  public async discoverTools() {
    this.assertConnected();

    try {
      const response = await this.client!.listTools();
      return response.tools;
    } catch (error) {
      console.error("[MCP Client] Error listing tools:", error);
      throw error;
    }
  }

  /**
   * Invokes an MCP tool by name with specified arguments over JSON-RPC.
   */
  public async callTool(toolName: string, toolArguments: Record<string, unknown> = {}) {
    this.assertConnected();

    console.log(`\n[MCP Client] >>> Calling Tool: "${toolName}"`);
    console.log(`[MCP Client] Arguments:`, JSON.stringify(toolArguments));

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: toolArguments
      });

      console.log(`[MCP Client] <<< Received response from MCP Server:`);
      return result;
    } catch (error) {
      console.error(`[MCP Client] Tool invocation error for "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * Closes the MCP client and terminates the server subprocess cleanly.
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected && !this.client) {
      return;
    }

    console.log("[MCP Client] Closing connection to MCP server...");
    try {
      if (this.client) {
        await this.client.close();
      }
      this.isConnected = false;
      this.client = null;
      this.transport = null;
      console.log("[MCP Client] Disconnected cleanly.");
    } catch (error) {
      console.error("[MCP Client] Error during disconnection:", error);
    }
  }

  public getRawClient(): Client | null {
    return this.client;
  }

  private assertConnected(): void {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP Client is not connected. Call connect() first.");
    }
  }
}

import fs from "fs";
import path from "path";
import os from "os";

/**
 * Automates adding this Node.js MCP server to Claude Desktop,
 * supporting standard locations as well as custom/portable Claude-Data profiles.
 */

function getClaudeConfigPaths(): string[] {
  const paths: string[] = [];
  const home = os.homedir();

  // 1. Check AppData/Local/Claude-Data/*/claude_desktop_config.json
  const localClaudeData = path.join(home, "AppData", "Local", "Claude-Data");
  if (fs.existsSync(localClaudeData)) {
    try {
      const entries = fs.readdirSync(localClaudeData, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const candidate = path.join(localClaudeData, entry.name, "claude_desktop_config.json");
          if (fs.existsSync(candidate)) {
            paths.push(candidate);
          }
        }
      }
    } catch {}
  }

  // 2. Standard Windows Roaming AppData
  const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  const standardWin = path.join(appData, "Claude", "claude_desktop_config.json");
  paths.push(standardWin);

  // 3. macOS
  if (process.platform === "darwin") {
    paths.push(path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"));
  }

  // Return unique paths, prioritizing files that already exist on disk
  const unique = Array.from(new Set(paths));
  return unique.sort((a, b) => {
    const aExists = fs.existsSync(a) ? 1 : 0;
    const bExists = fs.existsSync(b) ? 1 : 0;
    return bExists - aExists;
  });
}

function installServerToClaude() {
  console.log("=================================================");
  console.log("   Claude Desktop MCP Auto-Installer (Node.js)   ");
  console.log("=================================================\n");

  const configPaths = getClaudeConfigPaths();
  const serverPath = path.resolve(process.cwd(), "src", "server", "index.ts");
  const nodeExecutable = process.execPath;
  const serverKey = "demo-mcp-server";

  console.log(`Detected Platform: ${process.platform}`);
  console.log(`Node Executable:    ${nodeExecutable}`);
  console.log(`Server Entrypoint:  ${serverPath}\n`);

  let updatedCount = 0;

  for (const configPath of configPaths) {
    const configDir = path.dirname(configPath);

    // If file doesn't exist and we already found and updated an existing one, skip creating redundant empty ones
    if (!fs.existsSync(configPath) && updatedCount > 0) {
      continue;
    }

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      try {
        const rawContent = fs.readFileSync(configPath, "utf-8");
        config = JSON.parse(rawContent);
        console.log(`-> Found active config: ${configPath}`);
      } catch (err) {
        console.warn(`-> Warning: Could not parse JSON at ${configPath}. Initializing clean config.`);
        config = {};
      }
    } else {
      console.log(`-> Creating new configuration file at: ${configPath}`);
    }

    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      config.mcpServers = {};
    }

    // Register our server, preserving all existing servers and user preferences
    config.mcpServers[serverKey] = {
      command: nodeExecutable,
      args: [
        "--import",
        "tsx",
        serverPath
      ]
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`✓ Updated: ${configPath}`);
    updatedCount++;
  }

  console.log("\n=================================================");
  console.log(`SUCCESS! "${serverKey}" is registered in Claude Desktop!`);
  console.log("=================================================\n");
  console.log("Registered Server Definition:");
  console.log(JSON.stringify({
    [serverKey]: {
      command: nodeExecutable,
      args: ["--import", "tsx", serverPath]
    }
  }, null, 2));

  console.log("\nNext Steps:");
  console.log("1. Restart Claude Desktop completely (Quit from system tray and re-open).");
  console.log("2. Open a new chat in Claude and click the Hammer (Tools) icon.");
  console.log("3. You should see both 'manim-server' and 'demo-mcp-server' active!");
}

installServerToClaude();

# Adding this Node.js MCP Server to Claude Desktop

In Python, FastMCP provides `uv run fastmcp install claude-desktop <file.py>` to automatically register an MCP server into Claude Desktop.

In this Node.js / TypeScript project, you can achieve the exact same automated 1-command registration, or inspect your configuration file directly.

---

## ⚡ Method 1: Automated 1-Command Installation (Executed & Verified)

To register (or update) the server into your Claude Desktop profile at any time, run:

### Windows (PowerShell / Command Prompt):
```powershell
npm.cmd run install:claude
```

### macOS / Linux:
```bash
npm run install:claude
```

### What this command does:
1. Automatically detects your Claude Desktop profile locations:
   - **Your Active Profile Path**:  
     `C:\Users\pca156\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\claude_desktop_config.json`
   - **Standard Fallback Path**:  
     `%APPDATA%\Claude\claude_desktop_config.json`
2. Automatically detects the exact Node.js binary (`C:\nvm4w\nodejs\node.exe`), preventing Windows PATH / NVM `ENOENT` issues.
3. Preserves all existing MCP servers (e.g. `manim-server`) and preferences.
4. Adds / updates `demo-mcp-server`.

---

## 🛠 Method 2: Your Active Configuration Snippet

Your active configuration file is located at:
```text
C:\Users\pca156\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\claude_desktop_config.json
```

Inside, the `mcpServers` section has been updated with:

```json
{
  "mcpServers": {
    "manim-server": {
      "command": "C:\\Users\\pca156\\Desktop\\manim-mcp-server\\.venv\\Scripts\\python.exe",
      "args": [
        "C:\\Users\\pca156\\Desktop\\manim-mcp-server\\src\\manim_server.py"
      ],
      "env": {
        "MANIM_EXECUTABLE": "C:\\Users\\pca156\\Desktop\\manim-mcp-server\\.venv\\Scripts\\manim.exe"
      }
    },
    "demo-mcp-server": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "--import",
        "tsx",
        "D:\\DemoMCP\\src\\server\\index.ts"
      ]
    }
  }
}
```

---

## 🔄 Verification & Usage in Claude Desktop

1. **Restart Claude Desktop**:
   - Completely quit Claude Desktop (Right-click system tray icon -> **Quit**).
   - Reopen Claude Desktop.

2. **Verify Connected Tools**:
   - In any new chat, click the **Hammer (Tools)** icon in the message prompt area.
   - You will see both `manim-server` and `demo-mcp-server` active, with 4 enterprise tools:
     - `getEmployeeDetails`
     - `listEmployees`
     - `calculateSalaryBreakdown`
     - `getProjectDetails`

3. **Sample Prompts to Ask Claude**:
   - *"Show me all employees in the organization."*
   - *"Look up employee details for employee ID 101."*
   - *"Calculate salary breakdown with basic 65,000 and allowances 12,000."*
   - *"What is the tech stack and status of project P101?"*

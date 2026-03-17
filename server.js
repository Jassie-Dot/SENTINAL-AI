/**
 * ====================================
 * NOVA AI – ADVANCED ASSISTANT (Refactored)
 * ====================================
 * Modular Architecture
 * - AIHandler: Intelligence & Reasoning
 * - SocketManager: Real-time Comms
 * - PluginLoader: Extension System
 */

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

// Modules
import PluginLoader from "./lib/plugin-loader.js";
import ContextManager from "./lib/context-manager.js";
import IntentRecognizer from "./lib/intent-recognizer.js";
import AIHandler from "./lib/ai-handler.js";
import SocketManager from "./lib/socket-manager.js";
import systemTools from "./lib/system-tools.js"; // Helper for legacy APIs
import LongTermMemory from "./lib/long-term-memory.mjs";
import SystemDiagnostics from "./lib/system-diagnostics.mjs";
import SelfEvolutionEngine from "./lib/self-evolution-engine.mjs";
import InternetIntelligence from "./lib/internet-intelligence.mjs";

// Constants
const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url); // Legacy compat

// Initialize Core Systems
const app = express();
const httpServer = createServer(app);

// Singletons
const pluginLoader = new PluginLoader();
const contextManager = new ContextManager(30); // Increased history limit
const intentRecognizer = new IntentRecognizer();
const aiHandler = new AIHandler({
  ollamaEndpoint: process.env.OLLAMA_HOST,
  ollamaModel: process.env.OLLAMA_MODEL,
  groqApiKey: process.env.GROQ_API_KEY
});
contextManager.setAIHandler(aiHandler);
const longTermMemory = new LongTermMemory(aiHandler);
const systemDiagnostics = new SystemDiagnostics();
const internetIntelligence = new InternetIntelligence();
const selfEvolutionEngine = new SelfEvolutionEngine(aiHandler, pluginLoader, internetIntelligence);

const socketManager = new SocketManager(
  httpServer,
  contextManager,
  pluginLoader,
  aiHandler,
  intentRecognizer
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static("public"));

/* ===================== REST API ===================== */

/**
 * Health Check
 */
app.get("/api/health", async (req, res) => {
  res.json({
    ok: true,
    server: "online",
    ai: aiHandler.currentProvider,
    plugins: pluginLoader.getAllPlugins().length,
    timestamp: new Date().toISOString()
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get("/api/system/info", async (req, res) => {
  try {
    const snap = await systemDiagnostics.getFullSnapshot();
    const os = await import('os');

    res.json({
      ok: true,
      os: `${snap.os.distro} (${snap.os.platform})`,
      uptime: Math.round(os.uptime()),
      cpu: `${snap.cpu.manufacturer} ${snap.cpu.brand} (${snap.cpu.cores} Cores)`,
      ram: `${snap.memory.total} GB`,
      memoryUsage: snap.memory.percent,
      status: snap.status
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/config/location", async (req, res) => {
  const locationPlugin = pluginLoader.getPlugin("location");
  if (locationPlugin?.getCurrentLocation) {
    try {
      const location = await locationPlugin.getCurrentLocation();
      res.json({ ok: true, location });
    } catch (err) {
      res.json({ ok: false, error: "Location unavailable" });
    }
  } else {
    res.json({ ok: false, error: "Location plugin not loaded" });
  }
});

app.get("/api/evolution/log", (req, res) => res.json(selfEvolutionEngine.getEvolutionLog()));

app.post("/api/evolution/trigger", async (req, res) => {
  try {
    const result = await selfEvolutionEngine.runEvolutionCycle();
    const log = selfEvolutionEngine.getEvolutionLog();
    const fullLog = Array.isArray(selfEvolutionEngine.evolutionLog) ? selfEvolutionEngine.evolutionLog : null;
    const total = fullLog ? fullLog.length : log.length;
    const successes = fullLog
      ? fullLog.filter((entry) => entry && entry.success).length
      : log.filter((entry) => entry && entry.success).length;
    const fitness = total ? Math.round((successes / total) * 100) : 0;

    res.json({
      ok: true,
      success: result.success,
      result,
      generation: total,
      fitness,
      mutations: successes,
      message: result.message,
      error: result.error
    });
  } catch (err) {
    console.error("[API] Evolution failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Legacy Chat API (Poll-based)
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message: userInput } = req.body;
    const sessionId = req.ip || 'default';

    if (!userInput?.trim()) {
      return res.status(400).json({ ok: false, error: "No message" });
    }

    contextManager.addMessage(sessionId, "user", userInput);

    // 1. Intent & Plugins
    const intentAnalysis = intentRecognizer.parse(userInput);
    const pluginResponse = await pluginLoader.handleIntent(intentAnalysis.intent, userInput, { sessionId });

    if (pluginResponse?.success) {
      contextManager.addMessage(sessionId, "assistant", pluginResponse.message);
      return res.json({ ok: true, reply: pluginResponse.message, data: pluginResponse.data });
    }

    // 2. AI Fallback (Non-streaming for REST)
    let reply = "";
    const context = {
      userName: "Sir",
      timeStr: new Date().toLocaleTimeString(),
      dateStr: new Date().toLocaleDateString(),
      cwd: process.cwd(),
      memoryContext: await longTermMemory.getRelevantContext(userInput),
      emotionalContext: ""
    };
    const systemPrompt = aiHandler.buildSystemPrompt(context);
    const history = contextManager.getFormattedHistory(sessionId);

    await aiHandler.generateResponse(
      [{ role: "system", content: systemPrompt }, ...history],
      null, // No socket
      (token) => reply += token
    );

    contextManager.addMessage(sessionId, "assistant", reply);
    longTermMemory.extractFacts(userInput, reply);
    res.json({ ok: true, reply });

  } catch (err) {
    console.error("[API] Error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ===================== SERVER STARTUP ===================== */

async function startServer() {
  try {
    // 1. Initialize Plugins
    await pluginLoader.initialize();

    // 2. Initialize AI
    await aiHandler.initialize();

    // 3. Initialize Socket
    socketManager.initialize();

    // 4. Start HTTP Server
    httpServer.listen(PORT, () => {
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║     SENTINAL MARK IV - UPGRADED         ║");
      console.log("╚════════════════════════════════════════╝");
      console.log(`\n[SERVER] Running on port ${PORT}`);
      console.log(`[AI] Provider: ${aiHandler.currentProvider}`);
      console.log(`[PLUGINS] ${pluginLoader.getAllPlugins().length} loaded`);
    });

  } catch (err) {
    console.error("[FATAL] Startup failed:", err);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on("SIGINT", () => {
  console.log("\n[SYSTEM] Shutting down...");
  // Save memory etc.
  const memPlugin = pluginLoader.getPlugin('Memory System');
  if (memPlugin?.saveMemory) memPlugin.saveMemory();
  process.exit(0);
});

startServer();

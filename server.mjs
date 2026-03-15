/**
 * ====================================
 * SENTINAL SERVER v4.1 (ESM) — Production Grade
 * ====================================
 */

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

// Core Modules
import PluginLoader from "./lib/plugin-loader.mjs";
import ContextManager from "./lib/context-manager.mjs";
import IntentRecognizer from "./lib/intent-recognizer.mjs";
import AIHandler from "./lib/ai-handler.mjs";
import SocketManager from "./lib/socket-manager.mjs";
import AutonomyEngine from "./lib/autonomy-engine.mjs";
import * as systemTools from "./lib/system-tools.mjs";

// Advanced AI Systems
import ThinkingEngine from "./lib/thinking-engine.mjs";
import Consciousness from "./lib/consciousness.mjs";
import SelfEvolutionEngine from "./lib/self-evolution-engine.mjs";
import InternetIntelligence from "./lib/internet-intelligence.mjs";
import LongTermMemory from "./lib/long-term-memory.mjs";
import SystemDiagnostics from "./lib/system-diagnostics.mjs";
import SelfHealingEngine from "./lib/self-healing-engine.mjs";
import EmpathicVision from "./lib/empathic-vision.mjs";

// Feelings Intelligence
import feelingsModule from "./lib/feelings-module.mjs";

const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── RATE LIMITER (in-memory, per IP) ────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60_000;

function rateLimit(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_WINDOW) {
        entry = { count: 1, windowStart: now };
    } else {
        entry.count++;
    }
    rateLimitMap.set(ip, entry);

    if (entry.count > RATE_LIMIT) {
        return res.status(429).json({ ok: false, error: 'Rate limit exceeded. Slow down, Sir.' });
    }
    next();
}

// ─── INITIALIZE CORE SYSTEMS ──────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const pluginLoader = new PluginLoader();
const contextManager = new ContextManager(30);
const intentRecognizer = new IntentRecognizer();
const aiHandler = new AIHandler({
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    geminiThinkModel: process.env.GEMINI_THINK_MODEL,
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL,
    ollamaEndpoint: process.env.OLLAMA_HOST,
    ollamaModel: process.env.OLLAMA_MODEL,
});

contextManager.setAIHandler(aiHandler);
const autonomyEngine = new AutonomyEngine(aiHandler, pluginLoader);

const socketManager = new SocketManager(httpServer, contextManager, pluginLoader, aiHandler, intentRecognizer, autonomyEngine, systemTools);

const consciousness = new Consciousness();
const internetIntelligence = new InternetIntelligence();
const longTermMemory = new LongTermMemory(aiHandler);
const thinkingEngine = new ThinkingEngine(aiHandler, consciousness, internetIntelligence);
const selfEvolutionEngine = new SelfEvolutionEngine(aiHandler, pluginLoader, internetIntelligence);
const systemDiagnostics = new SystemDiagnostics();
const selfHealingEngine = new SelfHealingEngine(aiHandler, pluginLoader);
const empathicVision = new EmpathicVision(aiHandler, consciousness);

// ─── GLOBALS (for inter-module access) ───────────────────────────────────────
global.sentinalAI = aiHandler;
global.sentinalPlugins = pluginLoader;
global.sentinalConsciousness = consciousness;
global.sentinalInternet = internetIntelligence;
global.sentinalDiagnostics = systemDiagnostics;
global.sentinalHealing = selfHealingEngine;
global.sentinalEmpathy = empathicVision;
global.sentinalMemory = longTermMemory;
global.sentinalFeelings = feelingsModule;
global.sentinalAutonomy = autonomyEngine;
global.sentinalSystemTools = systemTools;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(rateLimit);
app.use(express.static(path.join(__dirname, "public")));

// Request timeout middleware (30s)
app.use((req, res, next) => {
    req.setTimeout(30_000, () => {
        res.status(408).json({ ok: false, error: 'Request timeout' });
    });
    next();
});

/* ===================== REST API ===================== */

app.get("/api/health", async (req, res) => {
    res.json({
        ok: true,
        server: "online",
        ai: aiHandler.currentProvider,
        plugins: pluginLoader.getAllPlugins().length,
        consciousness: consciousness.getSnapshot(),
        feelings: feelingsModule.getDisplaySummary(),
        autonomy: autonomyEngine.getStatus(),
        timestamp: new Date().toISOString()
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message: userInput } = req.body;
        const sessionId = req.ip || 'default';

        if (!userInput?.trim()) {
            return res.status(400).json({ ok: false, error: "No message" });
        }

        // Process through feelings
        feelingsModule.processUserInput(userInput, sessionId);

        contextManager.addMessage(sessionId, "user", userInput);
        let intentAnalysis = intentRecognizer.parse(userInput);

        // Sub-60% confidence means we aren't sure it's a command, fall back to conversational AI
        if (intentAnalysis.confidence < 0.6) {
            intentAnalysis.intent = 'conversation.general';
        }

        if (intentAnalysis.intent !== 'conversation.general' && intentAnalysis.intent !== 'system.foul_mode') {
            const pluginResponse = await pluginLoader.handleIntent(intentAnalysis.intent, userInput, {
                sessionId,
                aiHandler,
                pluginLoader,
                systemTools,
                autonomyEngine
            });
            if (pluginResponse?.success) {
                contextManager.addMessage(sessionId, "assistant", pluginResponse.message);
                return res.json({ ok: true, reply: pluginResponse.message, data: pluginResponse.data });
            }
        }

        if (intentAnalysis.intent === 'system.foul_mode') {
            consciousness.setUserEmotion('foul_mode');
        }

        let reply = "";
        const ctx = {
            userName: "Sir",
            timeStr: new Date().toLocaleTimeString(),
            dateStr: new Date().toLocaleDateString(),
            cwd: process.cwd(),
            memoryContext: await longTermMemory.getRelevantContext(userInput),
            emotionalContext: `${consciousness.getMoodDescription()}\n${feelingsModule.getAIInjection()}`
        };
        const systemPrompt = aiHandler.buildSystemPrompt(ctx);
        const history = contextManager.getFormattedHistory(sessionId);

        const autonomousResult = await autonomyEngine.handleRequest({
            userInput,
            sessionId,
            history,
            systemPrompt,
            intentAnalysis
        });
        if (autonomousResult?.handled) {
            contextManager.addMessage(sessionId, "assistant", autonomousResult.reply);
            consciousness.onInteraction('autonomy', { userInput, reply: autonomousResult.reply });
            longTermMemory.extractFacts(userInput, autonomousResult.reply);
            return res.json({
                ok: true,
                reply: autonomousResult.reply,
                autonomy: {
                    plan: autonomousResult.plan,
                    observations: autonomousResult.observations
                }
            });
        }

        await aiHandler.generateResponse(
            [{ role: "system", content: systemPrompt }, ...history],
            null,
            (token) => reply += token
        );

        contextManager.addMessage(sessionId, "assistant", reply);
        consciousness.onInteraction('chat', { userInput, reply });
        longTermMemory.extractFacts(userInput, reply);
        res.json({ ok: true, reply });

    } catch (err) {
        console.error("[API] Error:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ─── FEELINGS API ─────────────────────────────────────────────────────────────

app.get("/api/feelings", (req, res) => {
    res.json({ ok: true, ...feelingsModule.getState() });
});

app.post("/api/feelings/update", (req, res) => {
    const { emotion } = req.body;
    if (!emotion) return res.status(400).json({ ok: false, error: 'emotion field required' });
    const state = feelingsModule.setUserEmotion(emotion);
    res.json({ ok: true, ...state });
});

app.post("/api/feelings/analyze", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text field required' });
    const result = feelingsModule.processUserInput(text, 'api');
    const context = await feelingsModule.generateEmpathicContext(text);
    res.json({ ok: true, ...result, empathicContext: context });
});

// ─── EXISTING ENDPOINTS ───────────────────────────────────────────────────────

app.get("/api/consciousness", (req, res) => res.json(consciousness.getState()));
app.get("/api/thoughts", (req, res) => res.json(thinkingEngine.getRecentThoughts(20)));

app.get("/api/config/location", async (req, res) => {
    const locationPlugin = pluginLoader.getPlugin("location");
    if (locationPlugin) {
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
    const result = await selfEvolutionEngine.runEvolutionCycle();
    res.json({ ok: true, result });
});

/* ===================== SERVER STARTUP ===================== */

export async function startServer() {
    try {
        // 1. Consciousness
        await consciousness.initialize();
        console.log('[CONSCIOUSNESS] State loaded');

        // 2. Plugins
        await pluginLoader.initialize();

        // 3. AI
        await aiHandler.initialize();

        // 4. Feelings Module
        const io = socketManager.getIO();
        feelingsModule.initialize({ io, consciousness, aiHandler });
        console.log('[FEELINGS] Emotional intelligence online');

        // 5. Socket
        socketManager.initialize(thinkingEngine, consciousness, selfEvolutionEngine, empathicVision, longTermMemory);

        // 6. Diagnostics & Healing
        systemDiagnostics.startMonitoring(io);
        selfHealingEngine.startMonitoring();
        console.log('[SYSTEM] Advanced diagnostics and self-healing active.');

        // Hook evolution to system events
        selfHealingEngine.on?.('error', () => feelingsModule.processSystemEvent('error', 0.5));
        selfEvolutionEngine.on?.('evolved', () => feelingsModule.processSystemEvent('evolution', 1.0));

        // 7. HTTP Port
        let currentPort = PORT;
        let startSuccess = false;
        const maxRetries = 10;

        for (let i = 0; i < maxRetries; i++) {
            try {
                await new Promise((resolve, reject) => {
                    httpServer.once('error', (err) => reject(err));
                    httpServer.listen(currentPort, () => { startSuccess = true; resolve(); });
                });
                if (startSuccess) break;
            } catch (err) {
                if (err.code === 'EADDRINUSE') {
                    console.log(`[SERVER] Port ${currentPort} in use, trying ${parseInt(currentPort) + 1}...`);
                    currentPort = parseInt(currentPort) + 1;
                } else {
                    throw err;
                }
            }
        }

        if (!startSuccess) throw new Error(`No available port found after ${maxRetries} attempts.`);

        console.log("\n╔════════════════════════════════════════╗");
        console.log("║   SENTINAL MARK IV — SELF-EVOLVING AI   ║");
        console.log("╚════════════════════════════════════════╝");
        console.log(`\n[SERVER]      Running on port ${currentPort}`);
        console.log(`[AI]          Provider: ${aiHandler.currentProvider}`);
        console.log(`[PLUGINS]     ${pluginLoader.getAllPlugins().length} loaded`);
        console.log(`[MOOD]        ${consciousness.getMoodDescription()}`);
        console.log(`[FEELINGS]    ${feelingsModule.getDisplaySummary().emotion}`);

        // 8. Thinking Engine
        thinkingEngine.start(io);

        io.on('sentinal:needs-capability', (data) => {
            if (data?.hint) selfEvolutionEngine.triggerAutonomousEvolution(data.hint);
        });

        // 9. Evolution
        selfEvolutionEngine.scheduleAutoEvolution(io);

        console.log(`[THINKING]    Autonomous thought engine active`);
        console.log(`[EVOLUTION]   Self-evolution scheduled\n`);

        return currentPort;

    } catch (err) {
        console.error("[FATAL] Startup failed:", err);
        process.exit(1);
    }
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on("SIGINT", () => {
    console.log("\n[SYSTEM] Graceful shutdown initiated...");
    thinkingEngine.stop();
    consciousness.save();
    rateLimitMap.clear();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n[SYSTEM] SIGTERM received — shutting down...");
    thinkingEngine.stop();
    consciousness.save();
    process.exit(0);
});

process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT EXCEPTION]", err.message, err.stack);
    feelingsModule.processSystemEvent('error', 0.8);
    // Don't exit — let self-healing handle it
});

process.on("unhandledRejection", (reason) => {
    console.error("[UNHANDLED REJECTION]", reason);
});

// Auto-start if run directly
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
    startServer();
}

/**
 * Socket Manager — Real-time AI with Feelings Intelligence
 */

import { Server } from 'socket.io';
import feelingsModule from './feelings-module.mjs';

export class SocketManager {
    constructor(httpServer, contextManager, pluginLoader, aiHandler, intentRecognizer, autonomyEngine, systemTools) {
        this.io = new Server(httpServer, {
            cors: { origin: "*", methods: ["GET", "POST"] },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        this.contextManager = contextManager;
        this.pluginLoader = pluginLoader;
        this.aiHandler = aiHandler;
        this.intentRecognizer = intentRecognizer;
        this.autonomyEngine = autonomyEngine;
        this.systemTools = systemTools;
        this.metricsIntervals = new Map(); // per-socket
    }

    getIO() { return this.io; }

    initialize(thinkingEngine, consciousness, selfEvolutionEngine, empathicVision, longTermMemory) {
        this.thinkingEngine = thinkingEngine;
        this.consciousness = consciousness;
        this.selfEvolutionEngine = selfEvolutionEngine;
        this.empathicVision = empathicVision;
        this.longTermMemory = longTermMemory;

        // Wire feelings module IO
        feelingsModule.initialize({ io: this.io, consciousness, aiHandler: this.aiHandler });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.io.on("connection", (socket) => this.handleConnection(socket));
        console.log("[WEBSOCKET] Real-time communication enabled");
    }

    handleConnection(socket) {
        const sessionId = socket.id;
        console.log(`[WEBSOCKET] Client connected: ${sessionId}`);

        // Expose socket globally for thought bubble detection
        socket.on('client:ready', () => {
            // Confirm connection and send full initial state
        });

        // Send initial status with feelings state
        socket.emit("system:status", {
            status: "connected",
            ai: this.aiHandler.currentProvider,
            autonomy: this.autonomyEngine?.getStatus?.() || { enabled: false },
            plugins: this.pluginLoader.getAllPluginInfo(),
            feelings: feelingsModule.getDisplaySummary(),
            timestamp: new Date().toISOString()
        });

        // Push initial emotion state to newly connected client
        socket.emit("sentinal:emotion", {
            ...feelingsModule.getState(),
            timestamp: new Date().toISOString(),
        });

        this.setupMetrics(socket);

        // Core handlers
        socket.on("chat:message", (data) => this.handleChatMessage(socket, data));
        socket.on("camera:capture", (data) => this.handleCameraCapture(socket, data));
        socket.on("camera:face_emotion", (data) => this.handleFaceEmotion(socket, data));
        socket.on("chat:image", (data) => this.handleImageAnalysis(socket, data));

        // Feelings handlers
        socket.on("feelings:query", () => {
            socket.emit("sentinal:emotion", { ...feelingsModule.getState(), timestamp: new Date().toISOString() });
        });
        socket.on("feelings:set", (data) => {
            if (data?.emotion) {
                feelingsModule.setUserEmotion(data.emotion);
                socket.emit("sentinal:emotion", { ...feelingsModule.getState(), timestamp: new Date().toISOString() });
            }
        });

        socket.on("disconnect", () => {
            console.log(`[WEBSOCKET] Client disconnected: ${sessionId}`);
            const interval = this.metricsIntervals.get(sessionId);
            if (interval) { clearInterval(interval); this.metricsIntervals.delete(sessionId); }
        });
    }

    setupMetrics(socket) {
        const sessionId = socket.id;
        const interval = setInterval(async () => {
            const systemMonitor = this.pluginLoader.getPlugin("system-monitor");
            if (systemMonitor) {
                try {
                    const metrics = await systemMonitor.getMetrics();
                    socket.emit("metrics:update", metrics);

                    // High CPU/RAM → stress event
                    if (metrics?.cpu?.usage > 85 || metrics?.memory?.usagePercent > 90) {
                        feelingsModule.processSystemEvent('system_stress', 0.6);
                    }
                } catch (e) { }
            }
        }, 5000);
        this.metricsIntervals.set(sessionId, interval);
    }

    async handleChatMessage(socket, data) {
        const { message: userInput } = data;
        const sessionId = socket.id;

        if (!userInput?.trim()) return;
        console.log(`[CHAT] ${sessionId.slice(0, 8)}: ${userInput.slice(0, 80)}`);

        this.contextManager.addMessage(sessionId, "user", userInput);

        // Process through feelings FIRST
        const emotionResult = feelingsModule.processUserInput(userInput, sessionId);
        if (emotionResult.shifted) {
            socket.emit("sentinal:emotion", {
                ...feelingsModule.getState(),
                timestamp: new Date().toISOString(),
            });
        }

        try {
            let intentAnalysis = this.intentRecognizer.parse(userInput);

            // Sub-60% confidence means we aren't sure it's a command, fall back to conversational AI
            if (intentAnalysis.confidence < 0.6) {
                intentAnalysis.intent = 'conversation.general';
            }

            socket.emit("intent:detected", intentAnalysis);
            console.log(`[INTENT] ${intentAnalysis.intent} (${(intentAnalysis.confidence * 100).toFixed(1)}%)`);

            if (intentAnalysis.intent !== 'conversation.general') {
                const pluginResponse = await this.pluginLoader.handleIntent(
                    intentAnalysis.intent, userInput,
                    {
                        entities: intentAnalysis.entities,
                        sessionId, socket,
                        pluginLoader: this.pluginLoader,
                        thinkingEngine: this.thinkingEngine,
                        consciousness: this.consciousness,
                        selfEvolutionEngine: this.selfEvolutionEngine,
                        aiHandler: this.aiHandler,
                        autonomyEngine: this.autonomyEngine,
                        systemTools: this.systemTools
                    }
                );

                if (pluginResponse?.success) {
                    this.sendResponse(socket, sessionId, pluginResponse.message, "plugin", pluginResponse.data);
                    feelingsModule.processSystemEvent('task_complete', 0.5);
                    return;
                }
            }

            await this.handleAIGeneration(socket, sessionId, userInput, intentAnalysis);

        } catch (error) {
            console.error("[CHAT] Error:", error.message);
            socket.emit("chat:error", { error: error.message });
            feelingsModule.processSystemEvent('error', 0.4);
        }
    }

    async handleAIGeneration(socket, sessionId, userInput, intentAnalysis) {
        const memorySummary = this.longTermMemory ? await this.longTermMemory.getRelevantContext(userInput) : "";

        const context = {
            userName: "Sir",
            timeStr: new Date().toLocaleTimeString(),
            dateStr: new Date().toLocaleDateString(),
            memoryContext: memorySummary,
            cwd: process.cwd(),
            consciousnessContext: this.consciousness?.getAISystemContext() || '',
            emotionalContext: this.consciousness
                ? `${this.consciousness.getMoodDescription()}\n${feelingsModule.getAIInjection()}`
                : feelingsModule.getAIInjection()
        };

        const systemPrompt = this.aiHandler.buildSystemPrompt(context);
        const history = this.contextManager.getFormattedHistory(sessionId);
        const messages = [{ role: "system", content: systemPrompt }, ...history];

        const autonomousResult = await this.autonomyEngine?.handleRequest({
            userInput,
            sessionId,
            history,
            systemPrompt,
            intentAnalysis,
            socket
        });
        if (autonomousResult?.handled) {
            this.sendResponse(socket, sessionId, autonomousResult.reply, "autonomy", {
                plan: autonomousResult.plan,
                observations: autonomousResult.observations
            });
            if (this.longTermMemory) this.longTermMemory.extractFacts(userInput, autonomousResult.reply);
            feelingsModule.processSystemEvent('task_complete', 0.4);
            return;
        }

        socket.emit("chat:stream:start");

        let fullResponse = "";
        let ttsBuffer = "";

        await this.aiHandler.generateResponse(
            messages,
            socket,
            (token) => {
                fullResponse += token;
                ttsBuffer += token;
                socket.emit("chat:stream:token", { token, isThought: false });

                // Streaming TTS — speak in real time at sentence boundaries
                if (/[.!?\n]/.test(token) || ttsBuffer.length > 150) {
                    const cleanChunk = ttsBuffer.trim();
                    if (cleanChunk.length > 5 && !cleanChunk.includes('```')) {
                        socket.emit("tts:speak", { text: cleanChunk });
                        ttsBuffer = "";
                    }
                }
            },
            (thought) => {
                fullResponse += thought;
                socket.emit("chat:stream:token", { token: thought, isThought: true });
            }
        );

        const finalResponse = fullResponse.trim();

        socket.emit("chat:stream:end");
        if (finalResponse) {
            this.contextManager.addMessage(sessionId, "assistant", finalResponse);
            socket.emit("chat:response", {
                message: finalResponse,
                source: "ai",
                streamed: true
            });
            if (this.longTermMemory) this.longTermMemory.extractFacts(userInput, finalResponse);
        }

        // --- AUTONOMOUS TOOL EXECUTION LOOP ---
        const toolCodeRegex = /```(?:tool_code|TOOL__CODE)\s+([\s\S]*?)```/gi;
        let match;
        while ((match = toolCodeRegex.exec(finalResponse)) !== null) {
            const toolCode = match[1].trim();
            console.log(`[AUTONOMOUS-TOOL] Detected tool block: \n${toolCode}`);

            try {
                let toolName, toolInput;
                if (toolCode.startsWith('{')) {
                    const parsed = JSON.parse(toolCode);
                    toolName = parsed.tool || parsed.command || parsed.plugin;
                    toolInput = parsed.input || parsed.args || userInput;
                } else {
                    const lines = toolCode.split('\n');
                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (/^tool[:\s]/i.test(trimmedLine)) toolName = trimmedLine.split(/[:\s]/)[1].trim();
                        if (/^input[:\s]/i.test(trimmedLine)) toolInput = trimmedLine.split(/[:\s]/)[1].trim();
                        
                        // Handle simple ": value" format seen in some outputs
                        if (trimmedLine.startsWith(':')) {
                            const val = trimmedLine.slice(1).trim();
                            if (!toolName) toolName = val;
                            else if (!toolInput) toolInput = val;
                        }
                    });

                    if (!toolName) {
                        // Fallback: If it's a single line or list of lines without prefixes, assume it's for system-control
                        toolName = "system-control-plugin";
                        toolInput = toolCode;
                    }
                }

                if (toolName) {
                    console.log(`[AUTONOMOUS-TOOL] Attempting to execute '${toolName}' with input: '${toolInput}'`);
                    const result = await this.pluginLoader.handleIntent(toolName, toolInput, { sessionId, socket });
                    if (result) {
                        console.log(`[AUTONOMOUS-TOOL] Execution Result: ${JSON.stringify(result)}`);
                        socket.emit("chat:response", {
                            message: `[SYSTEM] ${result.message}`,
                            source: "tool-executor",
                            data: result.data
                        });
                        // Feed back or speak success/fail
                        if (result.success) {
                            feelingsModule.processSystemEvent('task_complete', 0.5);
                        } else {
                            feelingsModule.processSystemEvent('error', 0.3);
                        }
                    } else {
                        console.warn(`[AUTONOMOUS-TOOL] No plugin found to handle '${toolName}' with input '${toolInput}'`);
                    }
                }
            } catch (e) {
                console.error(`[AUTONOMOUS-TOOL] Block execution failed: ${e.message}`);
                socket.emit("chat:error", { error: `Tool execution failed: ${e.message}` });
            }
        }

        // Flush remaining TTS
        if (ttsBuffer.trim().length > 0 && !ttsBuffer.includes('```')) {
            socket.emit("tts:speak", { text: ttsBuffer.trim() });
        }

        // Post-response feeling update
        feelingsModule.processSystemEvent('task_complete', 0.3);
    }

    sendResponse(socket, sessionId, message, source, data) {
        this.contextManager.addMessage(sessionId, "assistant", message);
        socket.emit("chat:response", { message, source, data });
        socket.emit("tts:speak", { text: message });
    }

    async handleImageAnalysis(socket, data) {
        const { imageData, prompt } = data;
        const sessionId = socket.id;
        if (!imageData) return;

        console.log(`[VISION] ${sessionId.slice(0, 8)}: Analyzing image...`);
        this.contextManager.addMessage(sessionId, "user", `📷 [Image]: ${prompt || 'Analyze this image'}`);

        try {
            const messages = [{
                role: "user",
                content: [
                    { type: "text", text: prompt || "Analyze this image in detail." },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ]
            }];

            socket.emit("chat:stream:start");
            let fullResponse = "";

            await this.aiHandler.generateResponse(messages, socket, (token) => {
                fullResponse += token;
                socket.emit("chat:stream:token", { token });
            }, null);

            const finalResponse = fullResponse.trim();

            socket.emit("chat:stream:end");
            if (finalResponse) {
                this.contextManager.addMessage(sessionId, "assistant", finalResponse);
                socket.emit("chat:response", {
                    message: finalResponse,
                    source: "vision",
                    streamed: true
                });
            }

        } catch (error) {
            console.error("[VISION] Error:", error.message);
            socket.emit("chat:error", { error: error.message });
        }
    }

    async handleFaceEmotion(socket, data) {
        const { imageData } = data;
        if (!imageData || !this.empathicVision) return;
        try {
            const emotion = await this.empathicVision.analyzeEmotion(imageData, socket);
            if (emotion) {
                feelingsModule.setUserEmotion(emotion);
                socket.emit("sentinal:emotion", { ...feelingsModule.getState(), source: 'camera' });
            }
        } catch (error) {
            console.error("[SOCKET] Emotion analysis error:", error.message);
        }
    }

    handleCameraCapture(socket, data) {
        // Camera logic delegated to camera plugin
    }
}

export default SocketManager;

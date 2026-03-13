/**
 * Socket Manager
 * Handles real-time WebSocket communication, events, and sub-systems.
 */

import { Server } from 'socket.io';

export class SocketManager {
    constructor(httpServer, contextManager, pluginLoader, aiHandler, intentRecognizer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.contextManager = contextManager;
        this.pluginLoader = pluginLoader;
        this.aiHandler = aiHandler;
        this.intentRecognizer = intentRecognizer;
        this.metricsInterval = null;
    }

    initialize() {
        this.io.on("connection", (socket) => this.handleConnection(socket));
        console.log("[WEBSOCKET] Real-time communication enabled");
    }

    handleConnection(socket) {
        const sessionId = socket.id;
        console.log(`[WEBSOCKET] Client connected: ${sessionId}`);

        // Send initial status
        socket.emit("system:status", {
            status: "connected",
            plugins: this.pluginLoader.getAllPluginInfo(),
            timestamp: new Date().toISOString()
        });

        // Setup metrics heartbeat
        this.setupMetrics(socket);

        // Event Listeners
        socket.on("chat:message", (data) => this.handleChatMessage(socket, data));
        socket.on("chat:image", (data) => this.handleImageAnalysis(socket, data));
        socket.on("camera:capture", (data) => this.handleCameraCapture(socket, data));

        socket.on("disconnect", () => {
            console.log(`[WEBSOCKET] Client disconnected: ${sessionId}`);
            if (this.metricsInterval) clearInterval(this.metricsInterval);
        });
    }

    setupMetrics(socket) {
        // Send system metrics every 5 seconds if monitor plugin exists
        this.metricsInterval = setInterval(async () => {
            const systemMonitor = this.pluginLoader.getPlugin("system-monitor");
            if (systemMonitor) {
                try {
                    const metrics = await systemMonitor.getMetrics();
                    socket.emit("metrics:update", metrics);
                } catch (error) { }
            }
        }, 5000);
    }

    async handleChatMessage(socket, data) {
        const { message: userInput } = data;
        const sessionId = socket.id;

        if (!userInput?.trim()) return;

        console.log(`[CHAT] ${sessionId}: ${userInput}`);
        this.contextManager.addMessage(sessionId, "user", userInput);

        try {
            // 1. Intent Recognition
            const intentAnalysis = this.intentRecognizer.parse(userInput);

            // Sub-60% confidence means we aren't sure it's a command, fall back to conversational AI
            if (intentAnalysis.confidence < 0.6) {
                intentAnalysis.intent = 'conversation.general';
            }

            socket.emit("intent:detected", intentAnalysis);
            console.log(`[INTENT] ${intentAnalysis.intent} (${(intentAnalysis.confidence * 100).toFixed(1)}%)`);

            // 2. Plugin Handling
            const pluginResponse = await this.pluginLoader.handleIntent(
                intentAnalysis.intent,
                userInput,
                {
                    entities: intentAnalysis.entities,
                    sessionId,
                    socket
                }
            );

            if (pluginResponse?.success) {
                this.sendResponse(socket, sessionId, pluginResponse.message, "plugin", pluginResponse.data);
                return;
            }

            // 3. AI Generation (Fallback)
            await this.handleAIGeneration(socket, sessionId, userInput, intentAnalysis);

        } catch (error) {
            console.error("[CHAT] Error:", error.message);
            socket.emit("chat:error", { error: error.message });
        }
    }

    async handleAIGeneration(socket, sessionId, userInput, intentAnalysis) {
        // Construct Context
        const context = {
            userName: "Sir", // TODO: Get from memory
            timeStr: new Date().toLocaleTimeString(),
            dateStr: new Date().toLocaleDateString(),
            cwd: process.cwd(),
            memoryContext: "", // TODO: Fetch from memory plugin
            emotionalContext: "" // TODO: Fetch from emotion engine
        };

        const systemPrompt = this.aiHandler.buildSystemPrompt(context);
        const history = this.contextManager.getFormattedHistory(sessionId);

        const messages = [
            { role: "system", content: systemPrompt },
            ...history
        ];

        socket.emit("chat:stream:start");

        let fullResponse = "";

        await this.aiHandler.generateResponse(
            messages,
            socket,
            (token) => {
                fullResponse += token;
                socket.emit("chat:stream:token", { token });
            },
            (thought) => {
                // Thought streaming handled by ai-handler mostly, but we can log here
            }
        );

        socket.emit("chat:stream:end");
        this.contextManager.addMessage(sessionId, "assistant", fullResponse);

        // TTS
        if (fullResponse.length < 2000) {
            socket.emit("tts:speak", { text: fullResponse });
        }
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

            socket.emit("chat:stream:end");
            this.contextManager.addMessage(sessionId, "assistant", fullResponse);

            // TTS for short responses
            if (fullResponse.length < 2000) {
                socket.emit("tts:speak", { text: fullResponse });
            }
        } catch (error) {
            console.error("[VISION] Error:", error.message);
            socket.emit("chat:error", { error: error.message });
        }
    }

    handleCameraCapture(socket, data) {
        // Move camera logic here
        // ... (simplified for now)
    }
}

export default SocketManager;

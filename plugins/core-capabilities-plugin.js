/**
 * Core Capabilities Plugin
 * Dynamically lists all loaded SENTINAL plugins and their descriptions.
 */

const plugin = {
    name: "Core Capabilities",
    version: "1.0.0",
    description: "Lists all resident modules and operational capabilities.",

    async initialize() {
        console.log("[PLUGIN] Core Capabilities System Online");
    },

    canHandle(intent, userInput) {
        return intent === 'conversation.capabilities';
    },

    async handle(intent, userInput, context) {
        const { pluginLoader } = context;

        if (!pluginLoader) {
            return {
                success: false,
                message: "Sir, I am unable to access my own internal module registry at this moment."
            };
        }

        const allPluginInfo = pluginLoader.getAllPluginInfo();
        const enabledPlugins = allPluginInfo.filter(p => p.enabled);

        let capabilityList = "### 🛠️ Operational Capabilities\n\n";
        capabilityList += `I currently have **${enabledPlugins.length}** modules active and operational, Sir:\n\n`;

        enabledPlugins.forEach(p => {
            capabilityList += `- **${p.name}** (v${p.version}): ${p.description}\n`;
        });

        capabilityList += "\n> [!TIP]\n";
        capabilityList += "> You can ask me to **upgrade** or **integrate** new features anytime. I'll autonomously design and install them.";

        return {
            success: true,
            message: capabilityList,
            data: { count: enabledPlugins.length }
        };
    }
};

export default plugin;

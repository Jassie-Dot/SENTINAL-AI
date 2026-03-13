import fetch from 'node-fetch';

const plugin = {
    name: 'plugin-updater',
    version: '1.0.0',
    initialize() { 
        console.log('[PLUGIN] plugin-updater loaded'); 
    },
    canHandle(intent, text) { 
        return /update.*plugin|plugin.*update|upgrade.*plugin|plugin.*upgrade/i.test(text); 
    },
    async handle(intent, text, context) {
        try {
            if (!context || !context.system || !context.system.plugins) {
                return { success: false, message: "Plugin context is not available for updating." };
            }

            const pluginList = context.system.plugins;
            const updateResults = [];
            let updateCount = 0;

            for (const pluginInfo of pluginList) {
                if (pluginInfo.updateUrl) {
                    try {
                        const response = await fetch(pluginInfo.updateUrl);
                        
                        if (!response.ok) {
                            updateResults.push({ name: pluginInfo.name, status: 'failed', error: `HTTP ${response.status}` });
                            continue;
                        }
                        
                        const updateData = await response.json();
                        
                        if (updateData.version && updateData.version !== pluginInfo.version) {
                            updateResults.push({ 
                                name: pluginInfo.name, 
                                status: 'updated', 
                                from: pluginInfo.version, 
                                to: updateData.version 
                            });
                            updateCount++;
                        } else {
                            updateResults.push({ name: pluginInfo.name, status: 'current', version: pluginInfo.version });
                        }
                    } catch (error) {
                        updateResults.push({ name: pluginInfo.name, status: 'failed', error: error.message });
                    }
                } else {
                    updateResults.push({ name: pluginInfo.name, status: 'skipped', reason: 'No update URL' });
                }
            }

            if (updateCount === 0) {
                return { 
                    success: true, 
                    message: "All plugins are already up to date.", 
                    data: { updated: updateCount, results: updateResults }
                };
            }

            return { 
                success: true, 
                message: `Successfully updated ${updateCount} plugin(s).`, 
                data: { updated: updateCount, results: updateResults }
            };

        } catch (error) {
            return { 
                success: false, 
                message: `Plugin update failed: ${error.message}` 
            };
        }
    }
};

export default plugin;
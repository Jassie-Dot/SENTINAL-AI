import fetch from 'node-fetch';

const plugin = {
    name: 'update-security-patches',
    version: '1.0.0',
    initialize() { 
        console.log('[PLUGIN] update-security-patches loaded'); 
    },
    canHandle(intent, text) { 
        return /update|security|patches/i.test(text); 
    },
    async handle(intent, text, context) {
        try {
            const systems = ['webserver', 'database', 'application-server', 'firewall'];
            const updateResults = [];
            
            for (const system of systems) {
                try {
                    console.log(`Checking for ${system} security patches...`);
                    
                    const response = await fetch(`https://api.security-updates.example.com/v1/${system}/patches`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${context?.apiKey || 'default-key'}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const patchData = await response.json();
                    
                    if (patchData.availablePatches && patchData.availablePatches.length > 0) {
                        const applyResponse = await fetch(`https://api.security-updates.example.com/v1/${system}/apply`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${context?.apiKey || 'default-key'}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ patches: patchData.availablePatches })
                        });
                        
                        if (!applyResponse.ok) {
                            throw new Error(`Failed to apply patches: HTTP ${applyResponse.status}`);
                        }
                        
                        const result = await applyResponse.json();
                        updateResults.push({
                            system: system,
                            status: 'success',
                            patchesApplied: patchData.availablePatches.length,
                            details: result
                        });
                    } else {
                        updateResults.push({
                            system: system,
                            status: 'up-to-date',
                            patchesApplied: 0,
                            message: 'No security patches available'
                        });
                    }
                } catch (error) {
                    updateResults.push({
                        system: system,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            const successCount = updateResults.filter(r => r.status === 'success').length;
            const errorCount = updateResults.filter(r => r.status === 'error').length;
            const totalPatches = updateResults.reduce((sum, r) => sum + (r.patchesApplied || 0), 0);
            
            if (errorCount === 0) {
                return {
                    success: true,
                    message: `Security patch update completed. ${successCount} systems processed. ${totalPatches} patches applied.`,
                    data: {
                        systems: systems.length,
                        successful: successCount,
                        errors: errorCount,
                        totalPatchesApplied: totalPatches,
                        details: updateResults
                    }
                };
            } else {
                return {
                    success: false,
                    message: `Security patch update partially failed. ${successCount} successful, ${errorCount} errors. ${totalPatches} patches applied.`,
                    data: {
                        systems: systems.length,
                        successful: successCount,
                        errors: errorCount,
                        totalPatchesApplied: totalPatches,
                        details: updateResults
                    }
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Security patch update failed: ${error.message}`,
                data: { error: error.message }
            };
        }
    }
};

export default plugin;
import fs from 'fs';
import axios from 'axios';

const plugin = {
    name: 'spotify-controller',
    version: '1.0.0',
    description: 'Control Spotify playback and search for music via API. Requires process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, and process.env.SPOTIFY_REFRESH_TOKEN',
    
    async initialize() {
        console.log('[spotify-controller] Plugin online');
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REFRESH_TOKEN) {
            console.error('[spotify-controller] Missing required environment variables');
        }
    },
    
    canHandle(intent, userInput) {
        const keywords = ['play', 'pause', 'stop', 'search', 'spotify'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
        const authUrl = 'https://accounts.spotify.com/api/token';
        const apiUrl = 'https://api.spotify.com/v1';
        
        let token;
        
        try {
            const authResponse = await axios.post(authUrl, 'grant_type=refresh_token&refresh_token=' + refreshToken, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
                }
            });
            token = authResponse.data.access_token;
        } catch (error) {
            console.error('[spotify-controller] Error authenticating with Spotify:', error);
            return { success: false, message: 'Error authenticating with Spotify' };
        }
        
        if (userInput.toLowerCase().includes('play')) {
            try {
                const playbackResponse = await axios.put(apiUrl + '/me/player/play', {}, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                return { success: true, message: 'Playback started' };
            } catch (error) {
                console.error('[spotify-controller] Error starting playback:', error);
                return { success: false, message: 'Error starting playback' };
            }
        } else if (userInput.toLowerCase().includes('pause')) {
            try {
                const playbackResponse = await axios.put(apiUrl + '/me/player/pause', {}, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                return { success: true, message: 'Playback paused' };
            } catch (error) {
                console.error('[spotify-controller] Error pausing playback:', error);
                return { success: false, message: 'Error pausing playback' };
            }
        } else if (userInput.toLowerCase().includes('stop')) {
            try {
                const playbackResponse = await axios.put(apiUrl + '/me/player/pause', {}, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                return { success: true, message: 'Playback stopped' };
            } catch (error) {
                console.error('[spotify-controller] Error stopping playback:', error);
                return { success: false, message: 'Error stopping playback' };
            }
        } else if (userInput.toLowerCase().includes('search')) {
            const query = userInput.toLowerCase().replace('search', '').trim();
            try {
                const searchResponse = await axios.get(apiUrl + '/search?q=' + encodeURIComponent(query) + '&type=track&limit=10', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                const tracks = searchResponse.data.tracks.items;
                if (tracks.length > 0) {
                    return { success: true, message: 'Search results:', data: tracks };
                } else {
                    return { success: false, message: 'No search results found' };
                }
            } catch (error) {
                console.error('[spotify-controller] Error searching for tracks:', error);
                return { success: false, message: 'Error searching for tracks' };
            }
        } else {
            return { success: false, message: 'Unknown command' };
        }
    }
};
export default plugin;
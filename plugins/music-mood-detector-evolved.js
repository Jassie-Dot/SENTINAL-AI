import SpotifyWebApi from 'spotify-web-api-node';

async function createSpotifyClient() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required.');
    }

    const spotifyApi = new SpotifyWebApi({ clientId, clientSecret });
    const tokenResponse = await spotifyApi.clientCredentialsFlow();
    spotifyApi.setAccessToken(tokenResponse.body.access_token);
    return spotifyApi;
}

function determineMood(audioFeatures) {
    const energy = audioFeatures.energy ?? 0;
    const valence = audioFeatures.valence ?? 0;

    if (energy >= 0.65 && valence >= 0.6) return 'happy';
    if (energy < 0.4 && valence < 0.45) return 'sad';
    if (energy >= 0.65 && valence < 0.45) return 'intense';
    return 'relaxed';
}

const plugin = {
    name: 'music-mood-detector',
    version: '1.1.0',
    description: 'Detects a track mood or suggests Spotify playlists based on mood.',

    async initialize() {
        console.log('[music-mood-detector] Plugin online');
    },

    canHandle(intent, userInput) {
        return /\b(music|song|playlist)\b/i.test(userInput) && /\b(mood|detect|suggest)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        try {
            const spotifyApi = await createSpotifyClient();

            if (/\bdetect\b/i.test(userInput)) {
                const songName = userInput.replace(/.*?(?:detect mood from|mood of)\s*/i, '').trim();
                if (!songName) {
                    return { success: false, message: 'Provide a track name to analyze.' };
                }

                const songResults = await spotifyApi.searchTracks(songName, { limit: 1 });
                const song = songResults.body.tracks.items[0];
                if (!song) {
                    return { success: false, message: 'Song not found.' };
                }

                const audioFeatures = await spotifyApi.getAudioFeaturesForTrack(song.id);
                const mood = determineMood(audioFeatures.body);
                return {
                    success: true,
                    message: `The mood of "${song.name}" is ${mood}.`
                };
            }

            const mood = userInput.replace(/.*?\bsuggest(?: music| songs| playlist)?(?: for| based on)?\s*/i, '').trim();
            if (!mood) {
                return { success: false, message: 'Provide a mood to search for.' };
            }

            const playlistResults = await spotifyApi.searchPlaylists(`${mood} mood`, { limit: 1 });
            const playlist = playlistResults.body.playlists.items[0];
            if (!playlist) {
                return { success: false, message: `No playlists found for mood "${mood}".` };
            }

            return {
                success: true,
                message: `Try "${playlist.name}": ${playlist.external_urls?.spotify || 'link unavailable'}`
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default plugin;

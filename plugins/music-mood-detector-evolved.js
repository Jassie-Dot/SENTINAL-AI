import fs from 'fs';
import axios from 'axios';
import { SpotifyWebApi } from 'spotify-web-api-node';

const plugin = {
    name: 'music-mood-detector',
    version: '1.0.0',
    description: 'Detect mood from music or suggest music based on mood. Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.',
    
    async initialize() {
        console.log('[music-mood-detector] Plugin online');
    },
    
    canHandle(intent, userInput) {
        const keywords = ['music', 'mood', 'detect', 'suggest'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        });

        await spotifyApi.clientCredentialsFlow();

        if (userInput.toLowerCase().includes('detect')) {
            const songName = userInput.replace('detect mood from ', '');
            const songResults = await spotifyApi.searchTracks(songName);
            const song = songResults.body.tracks.items[0];

            if (!song) {
                return { success: false, message: 'Song not found' };
            }

            const audioFeatures = await spotifyApi.getAudioFeaturesForTrack(song.id);
            const mood = await this.determineMood(audioFeatures.body);

            return { success: true, message: `The mood of ${song.name} is ${mood}` };
        } else if (userInput.toLowerCase().includes('suggest')) {
            const mood = userInput.replace('suggest music for ', '');
            const playlistResults = await spotifyApi.searchPlaylists(`mood:${mood}`);
            const playlist = playlistResults.body.playlists.items[0];

            if (!playlist) {
                return { success: false, message: 'No playlists found for this mood' };
            }

            return { success: true, message: `Check out this playlist: ${playlist.name}` };
        } else {
            return { success: false, message: 'Invalid input' };
        }
    },

    async determineMood(audioFeatures) {
        const energy = audioFeatures.energy;
        const valence = audioFeatures.valence;

        if (energy > 0.5 && valence > 0.5) {
            return 'Happy';
        } else if (energy < 0.5 && valence < 0.5) {
            return 'Sad';
        } else if (energy > 0.5 && valence < 0.5) {
            return 'Angry';
        } else {
            return 'Relaxed';
        }
    }
};
export default plugin;
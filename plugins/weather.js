/**
 * Weather Plugin for SENTINAL
 * Provides real-time weather information
 */

import fetch from 'node-fetch';

const plugin = {
    name: 'Weather',
    version: '1.0.0',
    description: 'Real-time weather information using wttr.in',

    async initialize() {
        console.log('[WEATHER] Plugin initialized');
    },

    async cleanup() {
        console.log('[WEATHER] Plugin cleanup');
    },

    canHandle(intent, userInput) {
        return intent === 'weather.get' ||
            /weather|temperature|forecast|rain|sunny|cloudy/i.test(userInput);
    },

    async handle(intent, userInput, context) {
        try {
            // Extract location from input or use default
            const locationMatch = userInput.match(/in\s+([a-z\s]+)/i);
            const location = locationMatch ? locationMatch[1].trim() : 'auto'; // 'auto' uses IP geolocation

            // Fetch weather from wttr.in API
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);

            if (!response.ok) {
                return {
                    success: false,
                    message: "Unable to retrieve weather data, Sir. The meteorological satellites appear to be offline."
                };
            }

            const data = await response.json();
            const current = data.current_condition[0];
            const locationInfo = data.nearest_area[0];
            const forecast = data.weather[1]; // weather[1] is typically tomorrow

            const weatherDescription = current.weatherDesc[0].value;
            const tempC = current.temp_C;
            const tempF = current.temp_F;
            const feelsLikeC = current.FeelsLikeC;
            const humidity = current.humidity;
            const windSpeed = current.windspeedKmph;

            const place = locationInfo.areaName[0].value;
            const country = locationInfo.country[0].value;

            let message = `Current conditions in ${place}, ${country}:
Temperature: ${tempC}°C (${tempF}°F), feels like ${feelsLikeC}°C
Conditions: ${weatherDescription}
Humidity: ${humidity}%
Wind: ${windSpeed} km/h

`;

            // Add forecast if requested or as a bonus
            if (userInput.toLowerCase().includes('tomorrow') || userInput.toLowerCase().includes('forecast')) {
                if (forecast) {
                    message += `\nForecast for Tomorrow (${forecast.date}):
Max Temp: ${forecast.maxtempC}°C (${forecast.maxtempF}°F)
Min Temp: ${forecast.mintempC}°C (${forecast.mintempF}°F)
Conditions: ${forecast.hourly[4].weatherDesc[0].value} (at midday)`;
                }
            }

            message += `\n\n${this.getWeatherAdvice(weatherDescription, parseInt(tempC))}`;

            return {
                success: true,
                message: message,
                data: {
                    location: `${place}, ${country}`,
                    temperature: tempC,
                    temperatureF: tempF,
                    conditions: weatherDescription,
                    humidity: humidity,
                    wind: windSpeed
                }
            };
        } catch (error) {
            console.error('[WEATHER] Error:', error.message);
            return {
                success: false,
                message: "Weather data retrieval failed, Sir. Perhaps check your network connection."
            };
        }
    },

    getWeatherAdvice(description, temp) {
        const lower = description.toLowerCase();

        if (lower.includes('rain') || lower.includes('drizzle')) {
            return "I'd recommend an umbrella, Sir.";
        }
        if (lower.includes('snow')) {
            return "Winter conditions detected. Drive carefully.";
        }
        if (lower.includes('clear') || lower.includes('sunny')) {
            return "Excellent conditions for outdoor activities.";
        }
        if (temp < 0) {
            return "Freezing temperatures. Dress warmly, Sir.";
        }
        if (temp > 30) {
            return "Rather warm outside. Stay hydrated.";
        }

        return "Standard atmospheric conditions, Sir.";
    }
};

export default plugin;

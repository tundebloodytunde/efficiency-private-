'use client';

import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  feelsLike: number;
  code: number;
  windSpeed: number;
}

function weatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function weatherDesc(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

const CACHE_KEY = 'weather-v1';
const CACHE_TTL = 30 * 60 * 1000;

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setWeather(cached.data);
        return;
      }
    } catch { /* ignore */ }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${coords.latitude}&longitude=${coords.longitude}` +
            `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph`;
          const res = await fetch(url);
          const json = await res.json();
          const c = json.current;
          const data: WeatherData = {
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            code: c.weather_code,
            windSpeed: Math.round(c.wind_speed_10m),
          };
          setWeather(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch { /* silently fail */ }
      },
      () => { /* geolocation denied — stay hidden */ },
      { timeout: 8000 },
    );
  }, []);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-base leading-none">{weatherIcon(weather.code)}</span>
      <span className="font-semibold text-gray-700 dark:text-gray-300">{weather.temp}°F</span>
      <span className="text-gray-500 dark:text-gray-400">{weatherDesc(weather.code)}</span>
      <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">· feels {weather.feelsLike}°</span>
    </div>
  );
}

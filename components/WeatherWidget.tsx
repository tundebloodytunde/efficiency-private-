'use client';

import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  feelsLike: number;
  code: number;
  city: string;
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

const CACHE_KEY = 'weather-v2';
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

    fetch('/api/weather')
      .then(r => r.json())
      .then(json => {
        if (json.error || !json.current) return;
        const c = json.current;
        const data: WeatherData = {
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          code: c.weather_code,
          city: json.city ?? '',
        };
        setWeather(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      })
      .catch(() => { /* silently fail */ });
  }, []);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-base leading-none">{weatherIcon(weather.code)}</span>
      <span className="font-semibold text-gray-700 dark:text-gray-300">{weather.temp}°F</span>
      <span className="text-gray-500 dark:text-gray-400">{weatherDesc(weather.code)}</span>
      {weather.city && (
        <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">· {weather.city}</span>
      )}
      <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">· feels {weather.feelsLike}°</span>
    </div>
  );
}

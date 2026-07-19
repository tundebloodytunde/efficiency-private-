import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const forecast = req.nextUrl.searchParams.get('forecast') === 'true';

  try {
    // Resolve client IP from proxy headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? '';

    const geoUrl = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'efficiency-app/1.0' } });
    const geo = await geoRes.json();

    const lat: number = geo.latitude;
    const lon: number = geo.longitude;
    const city: string = geo.city ?? '';

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Location unavailable' }, { status: 400 });
    }

    if (forecast) {
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&temperature_unit=fahrenheit&forecast_days=16&timezone=auto`,
      );
      const wx = await wxRes.json();
      return NextResponse.json({ city, daily: wx.daily });
    } else {
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph`,
      );
      const wx = await wxRes.json();
      return NextResponse.json({ city, current: wx.current });
    }
  } catch {
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 500 });
  }
}

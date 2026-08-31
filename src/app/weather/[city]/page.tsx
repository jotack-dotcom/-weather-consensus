import type { Metadata } from "next";
import { notFound } from "next/navigation";

type City = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
};

type WeatherData = {
  current: {
    time: string;
    temperature_2m: number;
    precipitation_probability: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

const cities: City[] = [
  {
    slug: "stockholm",
    name: "Stockholm",
    latitude: 59.3293,
    longitude: 18.0686,
    description:
      "Check today’s weather, UV index, sunrise and sunset times for Stockholm.",
  },
  {
    slug: "gothenburg",
    name: "Gothenburg",
    latitude: 57.7089,
    longitude: 11.9746,
    description:
      "Check today’s weather, UV index, sunrise and sunset times for Gothenburg.",
  },
  {
    slug: "malmo",
    name: "Malmö",
    latitude: 55.605,
    longitude: 13.0038,
    description:
      "Check today’s weather, UV index, sunrise and sunset times for Malmö.",
  },
  {
    slug: "uppsala",
    name: "Uppsala",
    latitude: 59.8586,
    longitude: 17.6389,
    description:
      "Check today’s weather, UV index, sunrise and sunset times for Uppsala.",
  },
  {
    slug: "lulea",
    name: "Luleå",
    latitude: 65.5848,
    longitude: 22.1547,
    description:
      "Check today’s weather, UV index, sunrise and sunset times for Luleå.",
  },
];

export const revalidate = 1800;

function getCity(slug: string) {
  return cities.find((city) => city.slug === slug);
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(decimals);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string | null | undefined) {
  if (!time) return "—";

  return time.slice(11, 16);
}

function weatherIcon(code: number | null | undefined) {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return "🌦️";

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
    return "🌧️";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return "❄️";
  if ([95, 96, 99].includes(code ?? -1)) return "⛈️";

  return "🌤️";
}

function weatherDescription(code: number | null | undefined) {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm",
  };

  return descriptions[code ?? -1] ?? "Weather forecast";
}

function getUvLevel(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      label: "Unavailable",
      color: "text-slate-300",
      background: "bg-slate-800",
    };
  }

  if (value < 3) {
    return {
      label: "Low",
      color: "text-emerald-300",
      background: "bg-emerald-500/10",
    };
  }

  if (value < 6) {
    return {
      label: "Moderate",
      color: "text-yellow-300",
      background: "bg-yellow-500/10",
    };
  }

  if (value < 8) {
    return {
      label: "High",
      color: "text-orange-300",
      background: "bg-orange-500/10",
    };
  }

  if (value < 11) {
    return {
      label: "Very high",
      color: "text-red-300",
      background: "bg-red-500/10",
    };
  }

  return {
    label: "Extreme",
    color: "text-fuchsia-300",
    background: "bg-fuchsia-500/10",
  };
}

async function getWeather(city: City): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}` +
    `&longitude=${city.longitude}` +
    `&current=temperature_2m,precipitation_probability,wind_speed_10m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
    `&forecast_days=7` +
    `&wind_speed_unit=ms` +
    `&timezone=auto`;

  const response = await fetch(url, {
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error("Could not load weather data.");
  }

  return response.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCity(slug);

  if (!city) {
    return {
      title: "Weather forecast | HowHot.today",
    };
  }

  const title = `Weather in ${city.name} today | UV index & forecast`;
  const description = `${city.description} See the 7-day forecast and compare weather models on HowHot.today.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/weather/${city.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/weather/${city.slug}`,
      siteName: "HowHot.today",
    },
  };
}

export default async function CityWeatherPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCity(slug);

  if (!city) {
    notFound();
  }

  const weather = await getWeather(city);
  const todayUv = weather.daily.uv_index_max?.[0];
  const uvLevel = getUvLevel(todayUv);

  return (
    <main
      className="min-h-screen px-4 py-6 text-white sm:px-8 sm:py-10"
      style={{
        backgroundImage:
          "radial-gradient(circle at 86% 12%, rgba(56, 189, 248, 0.22), transparent 28%), radial-gradient(circle at 12% 92%, rgba(251, 146, 60, 0.12), transparent 26%), linear-gradient(145deg, #020617 0%, #08264a 48%, #020617 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <a
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-400 transition hover:text-sky-200"
            >
              HowHot.today
            </a>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Weather in {city.name} today
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300">
              {city.description}
            </p>
          </div>

          <a
            href={`/?city=${encodeURIComponent(city.name)}`}
            className="rounded-xl bg-sky-500 px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-sky-400"
          >
            Compare models
          </a>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4">
              <span className="text-5xl" aria-hidden="true">
                {weatherIcon(weather.current.weather_code)}
              </span>

              <div>
                <p className="text-sm text-sky-400">Current weather</p>
                <p className="mt-1 text-3xl font-bold">
                  {formatNumber(weather.current.temperature_2m, 1)}°C
                </p>
                <p className="mt-1 text-slate-400">
                  {weatherDescription(weather.current.weather_code)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Updated {formatTime(weather.current.time)}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl bg-slate-800/80 p-4">
              <p className="text-sm text-slate-400">Rain chance</p>
              <p className="mt-1 text-2xl font-bold">
                {formatNumber(weather.current.precipitation_probability, 0)}%
              </p>
            </div>

            <div className="rounded-xl bg-slate-800/80 p-4">
              <p className="text-sm text-slate-400">Wind</p>
              <p className="mt-1 text-2xl font-bold">
                {formatNumber(weather.current.wind_speed_10m, 1)} m/s
              </p>
            </div>

            <div className="rounded-xl bg-slate-800/80 p-4">
              <p className="text-sm text-slate-400">🌅 Sunrise</p>
              <p className="mt-1 text-2xl font-bold">
                {formatTime(weather.daily.sunrise?.[0])}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800/80 p-4">
              <p className="text-sm text-slate-400">🌇 Sunset</p>
              <p className="mt-1 text-2xl font-bold">
                {formatTime(weather.daily.sunset?.[0])}
              </p>
            </div>
          </div>
        </section>

        <section
          className={`mt-6 rounded-2xl border border-white/10 p-5 sm:p-6 ${uvLevel.background}`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-300">
                UV index in {city.name}
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Today&apos;s peak UV: {formatNumber(todayUv, 1)}
              </h2>
            </div>

            <span
              className={`rounded-full bg-slate-950/30 px-3 py-1 text-sm font-bold ${uvLevel.color}`}
            >
              {uvLevel.label}
            </span>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
            UV index 3 or above means sun protection is recommended. Use shade,
            clothing, sunglasses and sunscreen when needed.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
            7-day forecast
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Weather forecast for {city.name}
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {weather.daily.time.map((date, index) => {
              const dayUv = weather.daily.uv_index_max?.[index];
              const dayUvLevel = getUvLevel(dayUv);

              return (
                <article
                  key={date}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-3"
                >
                  <p className="text-sm font-bold">
                    {index === 0 ? "Today" : formatDate(date)}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-2xl" aria-hidden="true">
                      {weatherIcon(weather.daily.weather_code?.[index])}
                    </span>
                    <span>
                      {weatherDescription(weather.daily.weather_code?.[index])}
                    </span>
                  </div>

                  <p className="mt-3 text-xl font-bold">
                    {formatNumber(weather.daily.temperature_2m_max?.[index], 0)}°
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      {formatNumber(weather.daily.temperature_2m_min?.[index], 0)}°
                    </span>
                  </p>

                  <p className="mt-3 text-sm text-slate-300">
                    Rain:{" "}
                    {formatNumber(
                      weather.daily.precipitation_probability_max?.[index],
                      0
                    )}
                    %
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {formatNumber(weather.daily.precipitation_sum?.[index], 1)} mm
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Wind:{" "}
                    {formatNumber(weather.daily.wind_speed_10m_max?.[index], 1)}{" "}
                    m/s
                  </p>

                  <p
                    className={`mt-3 text-xs font-bold ${dayUvLevel.color}`}
                    title={`UV ${formatNumber(dayUv, 1)}: ${dayUvLevel.label}`}
                  >
                    UV {formatNumber(dayUv, 1)} · {dayUvLevel.label}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-sky-100">
            Compare weather models for {city.name}
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            HowHot.today compares forecasts from ECMWF, NOAA and DWD to make
            one unusual prediction less influential. Open the full Weather
            Consensus for {city.name} to compare the models.
          </p>

          <a
            href={`/?city=${encodeURIComponent(city.name)}`}
            className="mt-4 inline-block font-bold text-sky-300 transition hover:text-sky-200"
          >
            Open Weather Consensus →
          </a>
        </section>
      </div>

      <footer className="mt-12 border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>© 2026 HowHot.today</p>

        <div className="mt-3 flex justify-center gap-4">
          <a href="/privacy" className="hover:text-cyan-400">
            Privacy & Contact
          </a>

          <a href="mailto:howhottoday@gmail.com" className="hover:text-cyan-400">
            Contact
          </a>
        </div>
      </footer>
    </main>
  );
}
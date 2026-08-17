"use client";

import { FormEvent, useEffect, useState } from "react";

type Forecast = {
  time: string[];
  weather_code?: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
};

type ModelResult = {
  name: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  windGusts: number;
};

type Weather = {
  weatherCode: number;
  city: string;
  country: string;
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  forecast: Forecast;
  models: ModelResult[];
  consensus: Omit<ModelResult, "name">;
  error?: string;
};

function windDirectionToText(degrees: number) {
  const directions = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];

  return directions[Math.round(degrees / 45) % 8];
}

function weatherDescription(code: number | undefined) {
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

function weatherIcon(code: number | undefined) {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function getConfidence(models: ModelResult[]) {
  const temperatures = models.map((model) => model.temperature);
  const rainChances = models.map(
    (model) => model.precipitationProbability
  );
  const windSpeeds = models.map((model) => model.windSpeed);

  const temperatureDifference =
    Math.max(...temperatures) - Math.min(...temperatures);

  const rainChanceDifference =
    Math.max(...rainChances) - Math.min(...rainChances);

  const windDifference =
    Math.max(...windSpeeds) - Math.min(...windSpeeds);

  if (
    temperatureDifference <= 2 &&
    rainChanceDifference <= 25 &&
    windDifference <= 2.5
  ) {
    return {
      label: "High",
      description: "The weather models mostly agree.",
      color: "text-emerald-300",
      background: "bg-emerald-500/10",
    };
  }

  if (
    temperatureDifference <= 4 &&
    rainChanceDifference <= 50 &&
    windDifference <= 5
  ) {
    return {
      label: "Medium",
      description: "The models show some differences.",
      color: "text-yellow-300",
      background: "bg-yellow-500/10",
    };
  }

  return {
    label: "Low",
    description: "The models disagree, so the forecast is uncertain.",
    color: "text-red-300",
    background: "bg-red-500/10",
  };
}

function AdPlaceholder({ location }: { location: string }) {
  return (
    <div className="my-8 flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Advertisement
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Ad space — {location}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchCity, setSearchCity] = useState("Stockholm");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  async function loadWeather(
    parameters: URLSearchParams,
    fromLocation = false
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weather?${parameters.toString()}`);
      const data: Weather = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load weather data.");
      }

      setWeather(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load weather data."
      );
    } finally {
      setLoading(false);

      if (fromLocation) {
        setLocating(false);
      }
    }
  }

  useEffect(() => {
    void loadWeather(new URLSearchParams({ city: "Stockholm" }));
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const city = searchCity.trim();

    if (city) {
      setLocationMessage("");
      void loadWeather(new URLSearchParams({ city }));
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Your browser does not support location. Please search for a city."
      );
      return;
    }

    setLocating(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const parameters = new URLSearchParams({
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        });

        setLocationMessage("Showing weather for your current location.");
        void loadWeather(parameters, true);
      },
      () => {
        setLocating(false);
        setLocationMessage(
          "Location was not shared. Stockholm is still available as the default."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  const daily =
    weather?.forecast.time.map((date, index) => ({
      date,
      weatherCode: weather.forecast.weather_code?.[index],
      temperatureMax: weather.forecast.temperature_2m_max[index],
      temperatureMin: weather.forecast.temperature_2m_min[index],
      precipitationProbability:
        weather.forecast.precipitation_probability_max[index],
      precipitationSum: weather.forecast.precipitation_sum[index],
      windSpeedMax: weather.forecast.wind_speed_10m_max[index],
      windGustsMax: weather.forecast.wind_gusts_10m_max[index],
    })) ?? [];

  const confidence = weather ? getConfidence(weather.models) : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-sky-400">
            HowHot.today
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Today&apos;s weather, with more confidence.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Compare multiple weather models to get a clearer forecast for your
            day.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={searchCity}
            onChange={(event) => setSearchCity(event.target.value)}
            placeholder="Search for a city"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-sky-400 sm:max-w-md"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Search
          </button>
        </form>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {locating ? "Getting your location..." : "Use my location"}
        </button>

        {locationMessage && (
          <p className="mt-3 text-sm text-slate-400">{locationMessage}</p>
        )}

        <AdPlaceholder location="Below city search" />

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading && !weather && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">
            Loading weather for Stockholm...
          </div>
        )}

        {weather && (
          <>
            <section className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl sm:p-8">
              <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
  <p className="text-sm text-sky-400">Current weather</p>

  <div className="mt-1 flex items-center gap-3">
    <span className="text-5xl" aria-hidden="true">
      {weatherIcon(weather.weatherCode)}
    </span>

    <div>
      <h2 className="text-3xl font-bold">{weather.city}</h2>

      {weather.country && (
        <p className="text-slate-400">{weather.country}</p>
      )}
    </div>
  </div>
</div>

                <p className="text-sm text-slate-400">
                  Consensus from available weather models
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-400">Temperature</p>
                  <p className="mt-1 text-3xl font-bold">
                    {weather.temperature.toFixed(1)}°C
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-400">Precipitation</p>
                  <p className="mt-1 text-3xl font-bold">
                    {weather.precipitation.toFixed(1)} mm
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-400">Rain probability</p>
                  <p className="mt-1 text-3xl font-bold">
                    {weather.precipitationProbability.toFixed(0)}%
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-400">Wind</p>
                  <p className="mt-1 text-3xl font-bold">
                    {weather.windSpeed.toFixed(1)} m/s
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {windDirectionToText(weather.windDirection)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-400">Wind gusts</p>
                  <p className="mt-1 text-3xl font-bold">
                    {weather.windGusts.toFixed(1)} m/s
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                7-day forecast
              </p>
              <h2 className="mb-4 text-2xl font-bold">Coming days</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {daily.map((day, index) => (
                  <article
                    key={day.date}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <p className="font-semibold">
                      {index === 0 ? "Today" : formatDate(day.date)}
                    </p>

                    <div className="mt-4 flex min-h-12 items-center gap-2 text-sm text-slate-400">
                      <span className="text-3xl" aria-hidden="true">
                        {weatherIcon(day.weatherCode)}
                      </span>
                      <span>{weatherDescription(day.weatherCode)}</span>
                    </div>

                    <p className="mt-4 text-xl font-bold">
                      {day.temperatureMax.toFixed(0)}°
                      <span className="ml-2 text-base font-normal text-slate-400">
                        {day.temperatureMin.toFixed(0)}°
                      </span>
                    </p>

                    <div className="mt-4 space-y-1 text-sm text-slate-300">
                      <p>Rain: {day.precipitationProbability.toFixed(0)}%</p>
                      <p>{day.precipitationSum.toFixed(1)} mm</p>
                      <p>Wind: {day.windSpeedMax.toFixed(1)} m/s</p>
                      <p>Gusts: {day.windGustsMax.toFixed(1)} m/s</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <AdPlaceholder location="Below 7-day forecast" />

            <section>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                Model comparison
              </p>
              <h2 className="text-2xl font-bold">Weather Consensus</h2>
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-5">
  <h3 className="text-lg font-bold text-sky-200">
    How does Consensus work?
  </h3>

  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
    HowHot.today compares forecasts from ECMWF, NOAA and DWD. We use
    the median result, so one model with an unusual prediction has less
    influence on the final forecast.
  </p>

  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
    <div className="rounded-xl bg-slate-950/40 p-3">
      <p className="font-semibold text-white">1. Compare models</p>
      <p className="mt-1 text-slate-400">
        ECMWF, NOAA and DWD make separate predictions.
      </p>
    </div>

    <div className="rounded-xl bg-slate-950/40 p-3">
      <p className="font-semibold text-white">2. Find the median</p>
      <p className="mt-1 text-slate-400">
        Extreme predictions affect the result less.
      </p>
    </div>

    <div className="rounded-xl bg-slate-950/40 p-3">
      <p className="font-semibold text-white">3. Show confidence</p>
      <p className="mt-1 text-slate-400">
        You can see when the models agree or disagree.
      </p>
    </div>
  </div>
</div>

              {confidence && (
                <div
                  className={`mt-4 rounded-xl border border-white/10 p-4 ${confidence.background}`}
                >
                  <p className="text-sm text-slate-400">Forecast confidence</p>
                  <p className={`mt-1 text-2xl font-bold ${confidence.color}`}>
                    {confidence.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {confidence.description}
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:hidden">
                {weather.models.map((model) => (
                  <article
                    key={model.name}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <h3 className="text-lg font-bold">{model.name}</h3>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        <span className="block text-slate-400">Temperature</span>
                        {model.temperature.toFixed(1)}°C
                      </p>
                      <p>
                        <span className="block text-slate-400">Rain chance</span>
                        {model.precipitationProbability.toFixed(0)}%
                      </p>
                      <p>
                        <span className="block text-slate-400">Precipitation</span>
                        {model.precipitation.toFixed(1)} mm
                      </p>
                      <p>
                        <span className="block text-slate-400">Wind</span>
                        {model.windSpeed.toFixed(1)} m/s
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
                <table className="min-w-full divide-y divide-slate-800 bg-slate-900 text-left">
                  <thead className="bg-slate-800/70 text-sm text-slate-300">
                    <tr>
                      <th className="px-5 py-4">Model</th>
                      <th className="px-5 py-4">Temperature</th>
                      <th className="px-5 py-4">Rain chance</th>
                      <th className="px-5 py-4">Precipitation</th>
                      <th className="px-5 py-4">Wind</th>
                      <th className="px-5 py-4">Gusts</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {weather.models.map((model) => (
                      <tr key={model.name}>
                        <td className="px-5 py-4 font-semibold">{model.name}</td>
                        <td className="px-5 py-4">
                          {model.temperature.toFixed(1)}°C
                        </td>
                        <td className="px-5 py-4">
                          {model.precipitationProbability.toFixed(0)}%
                        </td>
                        <td className="px-5 py-4">
                          {model.precipitation.toFixed(1)} mm
                        </td>
                        <td className="px-5 py-4">
                          {model.windSpeed.toFixed(1)} m/s
                        </td>
                        <td className="px-5 py-4">
                          {model.windGusts.toFixed(1)} m/s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
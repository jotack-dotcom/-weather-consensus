"use client";

import { FormEvent, useEffect, useState } from "react";

type Forecast = {
  time?: string[];
  weather_code?: Array<number | null>;
  temperature_2m_max?: Array<number | null>;
  temperature_2m_min?: Array<number | null>;
  precipitation_probability_max?: Array<number | null>;
  precipitation_sum?: Array<number | null>;
  wind_speed_10m_max?: Array<number | null>;
  wind_gusts_10m_max?: Array<number | null>;
};

type Hourly = {
  time?: string[];
  weather_code?: Array<number | null>;
  temperature_2m?: Array<number | null>;
  precipitation_probability?: Array<number | null>;
  wind_speed_10m?: Array<number | null>;
};
type ModelResult = {
  name: string;
  temperature: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windGusts: number | null;
};

type Consensus = Omit<ModelResult, "name">;

type Weather = {
  currentTime?: string;
hourly?: Hourly;
  city: string;
  country?: string;
  weatherCode?: number | null;
  windDirection?: number | null;
  forecast?: Forecast;
  models?: ModelResult[];
  consensus?: Consensus;
  error?: string;
};

type LocationSuggestion = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
};

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(decimals);
}

function windDirectionToText(degrees: number | null | undefined) {
  if (typeof degrees !== "number") {
    return "—";
  }

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

function formatDate(date: string) {
  function formatHour(time: string) {
  return time.slice(11, 16);
}
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatHour(time: string) {
  return time.slice(11, 16);
}

function getConfidence(models: ModelResult[]) {
  const temperatures = models
    .map((model) => model.temperature)
    .filter((value): value is number => typeof value === "number");

  const rainChances = models
    .map((model) => model.precipitationProbability)
    .filter((value): value is number => typeof value === "number");

  if (temperatures.length < 2 || rainChances.length < 2) {
    return {
      label: "Unavailable",
      description: "Not enough model data is available.",
      color: "text-slate-300",
      background: "bg-slate-800",
    };
  }

  const temperatureDifference =
    Math.max(...temperatures) - Math.min(...temperatures);

  const rainDifference =
    Math.max(...rainChances) - Math.min(...rainChances);

  if (temperatureDifference <= 2 && rainDifference <= 25) {
    return {
      label: "High",
      description: "The weather models mostly agree.",
      color: "text-emerald-300",
      background: "bg-emerald-500/10",
    };
  }

  if (temperatureDifference <= 4 && rainDifference <= 50) {
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
    <div className="my-6 flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-4 text-center sm:my-8 sm:min-h-28 sm:px-6">
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
  const [searchCity, setSearchCity] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

useEffect(() => {
  try {
    const savedFavorites = localStorage.getItem("howhot-favorites");

    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  } catch {
    setFavorites([]);
  }
}, []);

useEffect(() => {
  localStorage.setItem("howhot-favorites", JSON.stringify(favorites));
}, [favorites]);

  useEffect(() => {
    const query = searchCity.trim();

    if (!showSuggestions || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=5&language=en&format=json`
        );

        const data = await response.json();
        setSuggestions(data.results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchCity, showSuggestions]);

  async function loadWeather(city: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(city)}`
      );

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
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const city = searchCity.trim();

    if (!city) return;

    setShowSuggestions(false);
    setSuggestions([]);
    setLocationMessage("");
    void loadWeather(city);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Your browser does not support location. Please search for a city."
      );
      return;
    }
    function toggleFavorite(city: string) {
  setFavorites((currentFavorites) => {
    const alreadySaved = currentFavorites.some(
      (favorite) => favorite.toLowerCase() === city.toLowerCase()
    );

    if (alreadySaved) {
      return currentFavorites.filter(
        (favorite) => favorite.toLowerCase() !== city.toLowerCase()
      );
    }

    return [...currentFavorites, city];
  });
}

function removeFavorite(city: string) {
  setFavorites((currentFavorites) =>
    currentFavorites.filter(
      (favorite) => favorite.toLowerCase() !== city.toLowerCase()
    )
  );
}

    setLocating(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLoading(true);

        try {
          const response = await fetch(
            `/api/weather?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`
          );

          const data: Weather = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Could not load weather data.");
          }

          setWeather(data);
          setSearchCity("");
          setShowSuggestions(false);
          setSuggestions([]);
          setLocationMessage("Showing weather for your current location.");
        } catch {
          setLocationMessage(
            "We could not load weather for your location. Please search for a city."
          );
        } finally {
          setLoading(false);
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocationMessage(
          "Location was not shared. Please search for a city instead."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }
function toggleFavorite(city: string) {
  setFavorites((currentFavorites) => {
    const alreadySaved = currentFavorites.some(
      (favorite) => favorite.toLowerCase() === city.toLowerCase()
    );

    if (alreadySaved) {
      return currentFavorites.filter(
        (favorite) => favorite.toLowerCase() !== city.toLowerCase()
      );
    }

    return [...currentFavorites, city];
  });
}

function removeFavorite(city: string) {
  setFavorites((currentFavorites) =>
    currentFavorites.filter(
      (favorite) => favorite.toLowerCase() !== city.toLowerCase()
    )
  );
}

  const models = Array.isArray(weather?.models) ? weather.models : [];
  const confidence = getConfidence(models);

  const daily = Array.isArray(weather?.forecast?.time)
  ? weather.forecast.time.map((date, index) => ({
      date,
      weatherCode: weather.forecast?.weather_code?.[index],
      temperatureMax: weather.forecast?.temperature_2m_max?.[index],
      temperatureMin: weather.forecast?.temperature_2m_min?.[index],
      precipitationProbability:
        weather.forecast?.precipitation_probability_max?.[index],
      precipitationSum: weather.forecast?.precipitation_sum?.[index],
      windSpeedMax: weather.forecast?.wind_speed_10m_max?.[index],
      windGustsMax: weather.forecast?.wind_gusts_10m_max?.[index],
    }))
  : [];

const currentHour = weather?.currentTime?.slice(0, 13);

const nextHourIndex = currentHour
  ? Math.max(
      weather?.hourly?.time?.findIndex(
        (time) => time.slice(0, 13) >= currentHour
      ) ?? 0,
      0
    )
  : 0;

const upcomingHours = Array.isArray(weather?.hourly?.time)
  ? weather.hourly.time
      .slice(nextHourIndex, nextHourIndex + 12)
      .map((time, index) => {
        const hourlyIndex = nextHourIndex + index;

        return {
          time,
          weatherCode: weather.hourly?.weather_code?.[hourlyIndex],
          temperature: weather.hourly?.temperature_2m?.[hourlyIndex],
          rainChance:
            weather.hourly?.precipitation_probability?.[hourlyIndex],
          windSpeed: weather.hourly?.wind_speed_10m?.[hourlyIndex],
        };
      })
  : [];
const isCurrentCityFavorite = weather
  ? favorites.some(
      (favorite) => favorite.toLowerCase() === weather.city.toLowerCase()
    )
  : false;
  return (
    <main
  className="min-h-screen bg-slate-950 bg-cover bg-center bg-no-repeat bg-scroll px-4 py-6 text-white sm:bg-fixed sm:px-8 sm:py-10"
  style={{
    backgroundImage:
      "linear-gradient(180deg, rgba(2, 6, 23, 0.42) 0%, rgba(2, 6, 23, 0.7) 48%, rgba(2, 6, 23, 0.94) 100%), url('/weather-sky.png')",
  }}
>
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 sm:mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-sky-400">
            HowHot.today
          </p>

          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Today&apos;s weather, with more confidence.
          </h1>

          <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
            Compare multiple weather models to get a clearer forecast.
          </p>
        </header>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative w-full sm:max-w-md">
            <input
              value={searchCity}
              onChange={(event) => {
                setSearchCity(event.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search for a city"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      setSearchCity(suggestion.name);
                      setShowSuggestions(false);
                      setSuggestions([]);
                      setLocationMessage("");
                      void loadWeather(suggestion.name);
                    }}
                    className="block w-full border-b border-slate-800 px-4 py-3 text-left transition last:border-0 hover:bg-slate-800"
                  >
                    <span className="block font-semibold text-white">
                      {suggestion.name}
                    </span>
                    <span className="text-sm text-slate-400">
                      {suggestion.admin1
                        ? `${suggestion.admin1}, ${suggestion.country}`
                        : suggestion.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
          >
            Search
          </button>
        </form>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
        >
          {locating ? "Getting your location..." : "Use my location"}
        </button>
        {favorites.length > 0 && (
  <section className="mt-4">
    <p className="mb-2 text-sm font-semibold text-slate-400">
      Favorite cities
    </p>

    <div className="flex flex-wrap gap-2">
      {favorites.map((favorite) => (
        <div
          key={favorite}
          className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
        >
          <button
            type="button"
            onClick={() => {
              setSearchCity(favorite);
              setLocationMessage("");
              void loadWeather(favorite);
            }}
            className="px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-slate-800"
          >
            {favorite}
          </button>

          <button
            type="button"
            onClick={() => removeFavorite(favorite)}
            aria-label={`Remove ${favorite} from favorites`}
            className="border-l border-slate-700 px-3 py-2 text-slate-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </section>
)}

        {locationMessage && (
          <p className="mt-3 text-sm text-slate-400">{locationMessage}</p>
        )}

        {!weather && !loading && !error && (
          <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:mt-8 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
              Your weather
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Find a forecast for anywhere in the world.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Search for a city above, or use your current location to see a
              Weather Consensus from multiple models.
            </p>
          </section>
        )}

        {error && (
          <div className="mt-7 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 sm:mt-8">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300 sm:mt-8 sm:p-6">
            Loading weather...
          </div>
        )}

        {weather && (
          <>
            <AdPlaceholder location="Below city search" />

            <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl sm:p-8">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm text-sky-400">Current weather</p>

                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-4xl sm:text-5xl" aria-hidden="true">
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
                  Consensus from ECMWF, NOAA and DWD
                </p>
              </div>
{weather.city !== "Your location" && (
  <button
    type="button"
    onClick={() => toggleFavorite(weather.city)}
    className="mb-4 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-400/20"
  >
    {isCurrentCityFavorite ? "★ Saved as favorite" : "☆ Save as favorite"}
  </button>
)}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                <div className="rounded-xl bg-slate-800/70 p-3 sm:p-4">
                  <p className="text-xs text-slate-400 sm:text-sm">
                    Temperature
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">
                    {formatNumber(weather.consensus?.temperature, 1)}°C
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-3 sm:p-4">
                  <p className="text-xs text-slate-400 sm:text-sm">
                    Precipitation
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">
                    {formatNumber(weather.consensus?.precipitation, 1)} mm
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-3 sm:p-4">
                  <p className="text-xs text-slate-400 sm:text-sm">
                    Rain probability
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">
                    {formatNumber(
                      weather.consensus?.precipitationProbability,
                      0
                    )}
                    %
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/70 p-3 sm:p-4">
                  <p className="text-xs text-slate-400 sm:text-sm">Wind</p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">
                    {formatNumber(weather.consensus?.windSpeed, 1)} m/s
                  </p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    {windDirectionToText(weather.windDirection)}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl bg-slate-800/70 p-3 sm:col-span-1 sm:p-4">
                  <p className="text-xs text-slate-400 sm:text-sm">
                    Wind gusts
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">
                    {formatNumber(weather.consensus?.windGusts, 1)} m/s
                  </p>
                </div>
              </div>
            </section>
<section className="mt-7 sm:mt-8">
  <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
    Hourly forecast
  </p>

  <h2 className="mb-4 text-2xl font-bold">The next 12 hours</h2>

  <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
    {upcomingHours.map((hour) => (
      <article
        key={hour.time}
        className="w-32 shrink-0 snap-start rounded-xl border border-slate-800 bg-slate-900 p-3"
      >
        <p className="text-sm font-semibold text-slate-300">
          {formatHour(hour.time)}
        </p>

        <span className="mt-3 block text-3xl" aria-hidden="true">
          {weatherIcon(hour.weatherCode)}
        </span>

        <p className="mt-3 text-xl font-bold">
          {formatNumber(hour.temperature, 0)}°
        </p>

        <p className="mt-2 text-xs text-slate-400">
          Rain: {formatNumber(hour.rainChance, 0)}%
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Wind: {formatNumber(hour.windSpeed, 1)} m/s
        </p>
      </article>
    ))}
  </div>
</section>
            <section className="mt-7 sm:mt-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                7-day consensus
              </p>

              <h2 className="mb-4 text-2xl font-bold">
                Forecast from multiple models
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
                {daily.map((day, index) => (
                  <article
                    key={day.date}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-3 sm:rounded-2xl sm:p-4"
                  >
                    <p className="text-sm font-semibold sm:text-base">
                      {index === 0 ? "Today" : formatDate(day.date)}
                    </p>

                    <div className="mt-3 flex min-h-10 items-center gap-1 text-xs leading-4 text-slate-400 sm:mt-4 sm:min-h-12 sm:gap-2 sm:text-sm">
                      <span className="text-2xl sm:text-3xl" aria-hidden="true">
                        {weatherIcon(day.weatherCode)}
                      </span>
                      <span>{weatherDescription(day.weatherCode)}</span>
                    </div>

                    <p className="mt-3 text-lg font-bold sm:mt-4 sm:text-xl">
                      {formatNumber(day.temperatureMax, 0)}°
                      <span className="ml-1 text-sm font-normal text-slate-400 sm:ml-2 sm:text-base">
                        {formatNumber(day.temperatureMin, 0)}°
                      </span>
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-slate-300 sm:mt-4 sm:text-sm">
                      <p>
                        Rain: {formatNumber(day.precipitationProbability, 0)}%
                      </p>
                      <p>{formatNumber(day.precipitationSum, 1)} mm</p>
                      <p>Wind: {formatNumber(day.windSpeedMax, 1)} m/s</p>
                      <p>Gusts: {formatNumber(day.windGustsMax, 1)} m/s</p>
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

              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 sm:p-5">
                <h3 className="font-bold text-sky-200">
                  How does Consensus work?
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  We compare ECMWF, NOAA and DWD, then use the median result.
                  This makes one unusual model prediction less influential.
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
                {models.map((model) => (
                  <article
                    key={model.name}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                  >
                    <h3 className="text-lg font-bold">{model.name}</h3>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:mt-4">
                      <p>
                        <span className="block text-slate-400">
                          Temperature
                        </span>
                        {formatNumber(model.temperature, 1)}°C
                      </p>

                      <p>
                        <span className="block text-slate-400">
                          Rain chance
                        </span>
                        {formatNumber(model.precipitationProbability, 0)}%
                      </p>

                      <p>
                        <span className="block text-slate-400">
                          Precipitation
                        </span>
                        {formatNumber(model.precipitation, 1)} mm
                      </p>

                      <p>
                        <span className="block text-slate-400">Wind</span>
                        {formatNumber(model.windSpeed, 1)} m/s
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="mt-10 border-t border-slate-800 py-7 text-center text-sm text-slate-500 sm:mt-12 sm:py-8">
        <p>© 2026 HowHot.today</p>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a href="/privacy" className="hover:text-cyan-400">
            Privacy & Contact
          </a>

          <a
            href="mailto:howhottoday@gmail.com"
            className="hover:text-cyan-400"
          >
            Contact
          </a>
        </div>
      </footer>
    </main>
  );
}
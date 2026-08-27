import { NextResponse } from "next/server";

type ModelResult = {
  name: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  windGusts: number;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function mostCommon(values: number[]) {
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city");
    const latitudeParameter = searchParams.get("latitude");
    const longitudeParameter = searchParams.get("longitude");

    let latitude: number;
    let longitude: number;
    let locationName: string;
    let country = "";

    const hasCoordinates =
      latitudeParameter !== null && longitudeParameter !== null;

    if (hasCoordinates) {
      latitude = Number(latitudeParameter);
      longitude = Number(longitudeParameter);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return NextResponse.json(
          { error: "Invalid location coordinates." },
          { status: 400 }
        );
      }

      locationName = "Your location";
    } else {
      if (!city) {
        return NextResponse.json(
          { error: "City is required." },
          { status: 400 }
        );
      }

      const geocodingResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1&language=en&format=json`,
        { cache: "no-store" }
      );

      if (!geocodingResponse.ok) {
        throw new Error("Could not find location.");
      }

      const geocodingData = await geocodingResponse.json();

      if (!geocodingData.results?.length) {
        return NextResponse.json(
          { error: `Could not find "${city}".` },
          { status: 404 }
        );
      }

      const location = geocodingData.results[0];

      latitude = location.latitude;
      longitude = location.longitude;
      locationName = location.name;
      country = location.country ?? "";
    }

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&hourly=weather_code,temperature_2m,precipitation_probability,wind_speed_10m,uv_index` +
      `&current=weather_code,temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset` +
      `&forecast_days=7` +
      `&wind_speed_unit=ms` +
      `&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl, {
      cache: "no-store",
    });

    if (!weatherResponse.ok) {
      throw new Error("Could not fetch weather.");
    }

    const weatherData = await weatherResponse.json();

    const modelInformation = [
      { name: "ECMWF", model: "ecmwf_ifs025" },
      { name: "NOAA", model: "gfs_seamless" },
      { name: "DWD", model: "icon_seamless" },
    ];

    const modelsWithForecasts = await Promise.all(
      modelInformation.map(async (modelInformation) => {
        const modelUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
          `&longitude=${longitude}` +
          `&models=${modelInformation.model}` +
          `&current=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max` +
          `&hourly=weather_code,temperature_2m,precipitation_probability,wind_speed_10m` +
          `&forecast_days=7` +
          `&wind_speed_unit=ms` +
          `&timezone=auto`;

        const modelResponse = await fetch(modelUrl, {
          cache: "no-store",
        });

        if (!modelResponse.ok) {
          throw new Error(
            `Could not fetch the ${modelInformation.name} model.`
          );
        }

        const modelData = await modelResponse.json();

        return {
          name: modelInformation.name,
          temperature: modelData.current.temperature_2m,
          precipitationProbability:
            modelData.current.precipitation_probability,
          precipitation: modelData.current.precipitation,
          windSpeed: modelData.current.wind_speed_10m,
          windGusts: modelData.current.wind_gusts_10m,
          daily: modelData.daily,
          hourly: modelData.hourly,
        };
      })
    );

    const models: ModelResult[] = modelsWithForecasts.map(
      ({ daily: _daily, hourly: _hourly, ...model }) => model
    );

    const consensus = {
      temperature: median(models.map((model) => model.temperature)),
      precipitationProbability: median(
        models.map((model) => model.precipitationProbability)
      ),
      precipitation: median(models.map((model) => model.precipitation)),
      windSpeed: median(models.map((model) => model.windSpeed)),
      windGusts: median(models.map((model) => model.windGusts)),
    };

    const forecast = {
      time: weatherData.daily.time,
      weather_code: weatherData.daily.time.map(
        (_date: string, index: number) =>
          mostCommon(
            modelsWithForecasts.map(
              (model) => model.daily.weather_code[index]
            )
          )
      ),
      temperature_2m_max: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.daily.temperature_2m_max[index]
            )
          )
      ),
      temperature_2m_min: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.daily.temperature_2m_min[index]
            )
          )
      ),
      precipitation_probability_max: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) =>
                model.daily.precipitation_probability_max[index]
            )
          )
      ),
      precipitation_sum: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.daily.precipitation_sum[index]
            )
          )
      ),
      wind_speed_10m_max: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.daily.wind_speed_10m_max[index]
            )
          )
      ),
      wind_gusts_10m_max: weatherData.daily.time.map(
        (_date: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.daily.wind_gusts_10m_max[index]
            )
          )
      ),
    };

    const hourly = {
      time: weatherData.hourly.time,
      weather_code: weatherData.hourly.time.map(
        (_time: string, index: number) =>
          mostCommon(
            modelsWithForecasts.map(
              (model) => model.hourly.weather_code[index]
            )
          )
      ),
      temperature_2m: weatherData.hourly.time.map(
        (_time: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.hourly.temperature_2m[index]
            )
          )
      ),
      precipitation_probability: weatherData.hourly.time.map(
        (_time: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.hourly.precipitation_probability[index]
            )
          )
      ),
      wind_speed_10m: weatherData.hourly.time.map(
        (_time: string, index: number) =>
          median(
            modelsWithForecasts.map(
              (model) => model.hourly.wind_speed_10m[index]
            )
          )
      ),
    };

    return NextResponse.json({
      city: locationName,
      country,
      latitude,
      longitude,
      weatherCode: weatherData.current.weather_code,
      currentTime: weatherData.current.time,
      temperature: weatherData.current.temperature_2m,
      precipitation: weatherData.current.precipitation,
      precipitationProbability:
        weatherData.current.precipitation_probability,
      windSpeed: weatherData.current.wind_speed_10m,
      windGusts: weatherData.current.wind_gusts_10m,
      windDirection: weatherData.current.wind_direction_10m,
      forecast,
      hourly,
      uv: {
        time: weatherData.hourly.time,
        index: weatherData.hourly.uv_index,
        dailyMax: weatherData.daily.uv_index_max,
      },
      sun: {
  sunrise: weatherData.daily.sunrise?.[0] ?? null,
  sunset: weatherData.daily.sunset?.[0] ?? null,
},
      models,
      consensus,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong while fetching weather data." },
      { status: 500 }
    );
  }
}
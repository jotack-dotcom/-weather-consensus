import { NextResponse } from "next/server";

type ModelResult = {
  name: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  windGusts: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");

    if (!city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 1. Find city coordinates
    // --------------------------------------------------

    const geocodingResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=en&format=json`,
      {
        cache: "no-store",
      }
    );

    if (!geocodingResponse.ok) {
      throw new Error("Could not find location");
    }

    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results?.length) {
      return NextResponse.json(
        { error: `Could not find "${city}"` },
        { status: 404 }
      );
    }

    const location = geocodingData.results[0];

    const latitude = location.latitude;
    const longitude = location.longitude;

    // --------------------------------------------------
    // 2. Current weather
    // --------------------------------------------------

    const currentUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max` +
      `&forecast_days=7` +
      `&wind_speed_unit=ms` +
      `&timezone=auto`;

    const currentResponse = await fetch(currentUrl, {
      cache: "no-store",
    });

    if (!currentResponse.ok) {
      throw new Error("Could not fetch current weather");
    }

    const currentData = await currentResponse.json();

    // --------------------------------------------------
    // 3. Weather models
    // --------------------------------------------------

    const modelNames = [
      {
        name: "ECMWF",
        model: "ecmwf_ifs025",
      },
      {
        name: "NOAA",
        model: "gfs_seamless",
      },
      {
        name: "DWD",
        model: "icon_seamless",
      },
    ];

    const modelRequests = modelNames.map(async (modelInfo) => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&models=${modelInfo.model}` +
        `&current=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m` +
        `&wind_speed_unit=ms` +
        `&timezone=auto`;

      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Could not fetch ${modelInfo.name}`);
      }

      const data = await response.json();

      return {
        name: modelInfo.name,
        temperature: data.current.temperature_2m,
        precipitationProbability:
          data.current.precipitation_probability,
        precipitation: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        windGusts: data.current.wind_gusts_10m,
      } satisfies ModelResult;
    });

    const models = await Promise.all(modelRequests);

    // --------------------------------------------------
    // 4. Median calculation
    // --------------------------------------------------

    function median(values: number[]) {
      const sorted = [...values].sort((a, b) => a - b);

      const middle = Math.floor(sorted.length / 2);

      if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
      }

      return sorted[middle];
    }

    const consensus = {
      temperature: median(
        models.map((model) => model.temperature)
      ),

      precipitationProbability: median(
        models.map(
          (model) => model.precipitationProbability
        )
      ),

      precipitation: median(
        models.map((model) => model.precipitation)
      ),

      windSpeed: median(
        models.map((model) => model.windSpeed)
      ),

      windGusts: median(
        models.map((model) => model.windGusts)
      ),
    };

    // --------------------------------------------------
    // 5. Return everything to the website
    // --------------------------------------------------

    return NextResponse.json({
      city: location.name,
      country: location.country,

      latitude,
      longitude,

      temperature:
        currentData.current.temperature_2m,

      precipitation:
        currentData.current.precipitation,

      precipitationProbability:
        currentData.current.precipitation_probability,

      windSpeed:
        currentData.current.wind_speed_10m,

      windGusts:
        currentData.current.wind_gusts_10m,

      windDirection:
        currentData.current.wind_direction_10m,

      time:
        currentData.current.time,

      forecast:
        currentData.daily,

      models,

      consensus,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong while fetching weather data.",
      },
      { status: 500 }
    );
  }
}
export async function getCoordinates(city: string) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}` +
    `&count=1` +
    `&language=en` +
    `&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Kunde inte söka efter staden");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Staden hittades inte");
  }

  return {
    latitude: data.results[0].latitude,
    longitude: data.results[0].longitude,
    name: data.results[0].name,
    country: data.results[0].country,
  };
}

export async function getWeather(
  latitude: number,
  longitude: number
) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,precipitation,wind_speed_10m` +
    `&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Kunde inte hämta väderdata");
  }

  return response.json();
}
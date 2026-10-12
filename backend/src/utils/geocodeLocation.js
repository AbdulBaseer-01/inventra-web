const buildLocationText = ({ address, landmark, city, district, state }) =>
  [address, landmark, city, district, state, "India"]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

const geocodeLocation = async (parts) => {
  const query = buildLocationText(parts);

  if (!query) {
    const error = new Error("Street, landmark, city, or district is required");
    error.statusCode = 400;
    throw error;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CivicWatch/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const results = await response.json();
  const match = results[0];

  if (!match?.lat || !match?.lon) {
    const error = new Error("Could not find that location. Please add a clearer landmark, city, or district.");
    error.statusCode = 400;
    throw error;
  }

  const address = match.address || {};

  return {
    coordinates: [parseFloat(match.lon), parseFloat(match.lat)],
    displayName: match.display_name,
    city: parts.city || address.city || address.town || address.village || address.municipality,
    district: parts.district || address.state_district || address.county,
    state: parts.state || address.state,
  };
};

module.exports = { buildLocationText, geocodeLocation };

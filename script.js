// ==========================================
// Weather Dashboard
// ==========================================

// Open-Meteo APIs
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

// Reverse geocoding for "My location" (no API key required)
const REVERSE_GEOCODE_API = "https://api.bigdatacloud.net/data/reverse-geocode-client";

// LocalStorage keys
const STORAGE_KEY = "weatherDashboardRecentCities";
const UNIT_KEY = "weatherDashboardUnit";
const THEME_KEY = "weatherDashboardTheme";
const LAST_WEATHER_KEY = "weatherDashboardLastWeather";

// Maximum number of recently searched cities
const MAX_RECENT_CITIES = 5;

// Search-suggestion behavior
const SUGGESTION_DEBOUNCE_MS = 250;
const MIN_SUGGESTION_LENGTH = 2;


// ==========================================
// DOM Elements
// ==========================================

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const geolocateButton = document.getElementById("geolocate-button");
const errorMessage = document.getElementById("error-message");
const loading = document.getElementById("loading");
const weatherDashboard = document.getElementById("weather-dashboard");
const locationName = document.getElementById("location-name");
const dateElement = document.getElementById("date");
const weatherIcon = document.getElementById("weather-icon");
const currentTemperature = document.getElementById("current-temperature");
const currentTemperatureUnit = document.getElementById("current-temperature-unit");
const weatherCondition = document.getElementById("weather-condition");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const feelsLike = document.getElementById("feels-like");
const precipitationEl = document.getElementById("precipitation");
const pressureEl = document.getElementById("pressure");
const visibilityEl = document.getElementById("visibility");
const uvIndexEl = document.getElementById("uv-index");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const hourlyForecastContainer = document.getElementById("hourly-forecast");
const chartContainer = document.getElementById("chart-container");
const chartDescription = document.getElementById("chart-description");
const forecast = document.getElementById("forecast");
const recentCities = document.getElementById("recent-cities");
const clearHistoryButton = document.getElementById("clear-history");
const suggestionsList = document.getElementById("suggestions-list");
const unitCButton = document.getElementById("unit-c");
const unitFButton = document.getElementById("unit-f");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleIcon = document.getElementById("theme-toggle-icon");
const themeColorMeta = document.getElementById("theme-color-meta");
const installButton = document.getElementById("install-button");
const offlineBanner = document.getElementById("offline-banner");
const statusAnnouncer = document.getElementById("status-announcer");

// ==========================================
// State
// ==========================================

let unit = "C"; // "C" or "F"
let currentLocation = null;
let currentWeatherData = null;

// ==========================================
// Weather Code Information
// ==========================================

function getWeatherInfo(weatherCode) {
    const weatherCodes = {

        0: { condition: "Clear Sky", icon: "☀️", group: "clear" },
        1: { condition: "Mainly Clear", icon: "🌤️", group: "clear" },
        2: { condition: "Partly Cloudy", icon: "⛅", group: "cloudy" },
        3: { condition: "Overcast", icon: "☁️", group: "cloudy" },

        45: { condition: "Fog", icon: "🌫️", group: "fog" },
        48: { condition: "Depositing Rime Fog", icon: "🌫️", group: "fog" },

        51: { condition: "Light Drizzle", icon: "🌦️", group: "rain" },
        53: { condition: "Moderate Drizzle", icon: "🌦️", group: "rain" },
        55: { condition: "Dense Drizzle", icon: "🌧️", group: "rain" },

        61: { condition: "Slight Rain", icon: "🌦️", group: "rain" },
        63: { condition: "Moderate Rain", icon: "🌧️", group: "rain" },
        65: { condition: "Heavy Rain", icon: "🌧️", group: "rain" },

        71: { condition: "Slight Snow", icon: "🌨️", group: "snow" },
        73: { condition: "Moderate Snow", icon: "🌨️", group: "snow" },
        75: { condition: "Heavy Snow", icon: "❄️", group: "snow" },
        77: { condition: "Snow Grains", icon: "❄️", group: "snow" },

        80: { condition: "Slight Rain Showers", icon: "🌦️", group: "rain" },
        81: { condition: "Moderate Rain Showers", icon: "🌧️", group: "rain" },
        82: { condition: "Violent Rain Showers", icon: "⛈️", group: "rain" },

        85: { condition: "Slight Snow Showers", icon: "🌨️", group: "snow" },
        86: { condition: "Heavy Snow Showers", icon: "❄️", group: "snow" },

        95: { condition: "Thunderstorm", icon: "⛈️", group: "thunder" },
        96: { condition: "Thunderstorm With Hail", icon: "⛈️", group: "thunder" },
        99: { condition: "Heavy Thunderstorm With Hail", icon: "⛈️", group: "thunder" }

    };
    return weatherCodes[weatherCode] || {
        condition: "Unknown",
        icon: "🌡️",
        group: "cloudy"
    };
}

// Maps a weather code + day/night flag to a background theme name
function getWeatherBackground(weatherCode, isDay) {
    const { group } = getWeatherInfo(weatherCode);
    if (group === "clear") {
        return isDay ? "clear-day" : "clear-night";
    }
    return group;
}

// ==========================================
// Temperature Units
// ==========================================

function convertTemperature(celsius) {
    return unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
}

function formatTemperature(celsius) {
    return Math.round(convertTemperature(celsius));
}

function unitSymbol() {
    return unit === "F" ? "°F" : "°C";
}

function setUnit(newUnit) {
    unit = newUnit;
    try {
        localStorage.setItem(UNIT_KEY, unit);
    } catch (error) {
        console.error("Unable to save temperature unit:", error);
    }
    unitCButton.setAttribute("aria-pressed", String(unit === "C"));
    unitFButton.setAttribute("aria-pressed", String(unit === "F"));
    currentTemperatureUnit.textContent = unitSymbol();

    // Re-render already-loaded weather in the new unit, without a refetch
    if (currentLocation && currentWeatherData) {
        renderWeather(currentLocation, currentWeatherData);
    }
}

function initUnit() {
    let savedUnit = "C";
    try {
        savedUnit = localStorage.getItem(UNIT_KEY) || "C";
    } catch (error) {
        console.error("Unable to read saved temperature unit:", error);
    }
    setUnit(savedUnit === "F" ? "F" : "C");
}

unitCButton.addEventListener("click", () => setUnit("C"));
unitFButton.addEventListener("click", () => setUnit("F"));

// ==========================================
// Theme (Light / Dark)
// ==========================================

function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.dataset.theme = "dark";
        themeToggleIcon.textContent = "☀️";
        themeToggle.setAttribute("aria-pressed", "true");
        themeToggle.setAttribute("aria-label", "Switch to light theme");
    } else {
        delete document.documentElement.dataset.theme;
        themeToggleIcon.textContent = "🌙";
        themeToggle.setAttribute("aria-pressed", "false");
        themeToggle.setAttribute("aria-label", "Switch to dark theme");
    }
    updateThemeColorMeta();
}

function updateThemeColorMeta() {
    const bg = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-2")
        .trim();
    if (bg) {
        themeColorMeta.setAttribute("content", bg);
    }
}

function initTheme() {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem(THEME_KEY);
    } catch (error) {
        console.error("Unable to read saved theme:", error);
    }
    if (savedTheme === "dark" || savedTheme === "light") {
        applyTheme(savedTheme);
        return;
    }
    const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
}

themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch (error) {
        console.error("Unable to save theme:", error);
    }
});

// ==========================================
// Status Announcements (for screen readers)
// ==========================================

function announce(message) {
    statusAnnouncer.textContent = message;
}

// ==========================================
// Search City
// ==========================================

async function searchCity(city) {
    const url =
        `${GEOCODING_API}?name=${encodeURIComponent(city)}` +
        `&count=1&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            "Unable to search for the city."
        );
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error(
            `City "${city}" could not be found.`
        );
    }
    return data.results[0];
}

async function searchCitySuggestions(city, signal) {
    const url =
        `${GEOCODING_API}?name=${encodeURIComponent(city)}` +
        `&count=5&language=en&format=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error("Unable to fetch suggestions.");
    }
    const data = await response.json();
    return data.results || [];
}

// ==========================================
// Reverse Geocoding (for "My location")
// ==========================================

async function reverseGeocode(latitude, longitude) {
    try {
        const url =
            `${REVERSE_GEOCODE_API}?latitude=${latitude}` +
            `&longitude=${longitude}&localityLanguage=en`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        const name = data.city || data.locality || data.principalSubdivision;
        if (!name) return null;
        return {
            name,
            country: data.countryName || ""
        };
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return null;
    }
}

// ==========================================
// Get Weather
// ==========================================

async function getWeather(latitude, longitude) {
    const url =
        `${WEATHER_API}?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,` +
        `apparent_temperature,is_day,precipitation,pressure_msl,` +
        `weather_code,wind_speed_10m` +
        `&hourly=temperature_2m,weather_code,uv_index,visibility` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
        `sunrise,sunset,uv_index_max` +
        `&timezone=auto` +
        `&forecast_days=6`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            "Unable to retrieve weather information."
        );
    }
    return await response.json();
}

// ==========================================
// Load Weather For A Location (shared pipeline)
// ==========================================
//
// Used by: search submit, suggestion selection, recent-city clicks,
// geolocation, and the initial default-city load. Centralizing this
// avoids repeating the same loading/error/offline handling four times.

async function loadWeatherForLocation(location, { saveToRecents = true } = {}) {
    showLoading();
    announce(`Loading weather for ${location.name}.`);
    try {
        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );
        renderWeather(location, weatherData);
        hideOfflineBanner();
        saveLastWeather(location, weatherData);
        if (saveToRecents) {
            saveRecentCity(location);
        }
        announce(`Weather loaded for ${location.name}${location.country ? ", " + location.country : ""}.`);
    } catch (error) {
        console.error("Weather request failed:", error);
        const usedCache = tryShowCachedWeather(location, error);
        if (!usedCache) {
            showError(
                error.message ||
                "Something went wrong. Please try again."
            );
        }
    } finally {
        hideLoading();
    }
}

// Falls back to the last successfully loaded weather when offline.
function tryShowCachedWeather(attemptedLocation, error) {
    const isLikelyOffline = !navigator.onLine || error instanceof TypeError;
    if (!isLikelyOffline) return false;

    const cached = getLastWeather();
    if (!cached) return false;

    renderWeather(cached.location, cached.weatherData);
    showOfflineBanner(cached.location, cached.savedAt);
    announce(
        `You're offline. Showing saved weather for ${cached.location.name} ` +
        `from ${formatSavedAt(cached.savedAt)}.`
    );
    return true;
}

// ==========================================
// Render Weather
// ==========================================

function renderWeather(location, weatherData) {
    currentLocation = location;
    currentWeatherData = weatherData;

    const current = weatherData.current;
    const hourly = weatherData.hourly;
    const daily = weatherData.daily;
    const weatherInfo = getWeatherInfo(current.weather_code);
    const startIndex = findCurrentHourIndex(hourly.time, current.time);

    // Background theme based on current conditions
    document.documentElement.dataset.weather =
        getWeatherBackground(current.weather_code, current.is_day === 1);
    updateThemeColorMeta();

    // Location
    const countryName = location.country || "";
    locationName.textContent = countryName
        ? `${location.name}, ${countryName}`
        : location.name;

    // Date
    const currentDate = new Date(current.time);
    dateElement.textContent = formatDate(currentDate);

    // Current weather
    weatherIcon.textContent = weatherInfo.icon;
    currentTemperature.textContent = formatTemperature(current.temperature_2m);
    currentTemperatureUnit.textContent = unitSymbol();
    weatherCondition.textContent = weatherInfo.condition;

    // Details
    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    feelsLike.textContent = `${formatTemperature(current.apparent_temperature)}${unitSymbol()}`;
    precipitationEl.textContent = `${current.precipitation.toFixed(1)} mm`;
    pressureEl.textContent = `${Math.round(current.pressure_msl)} hPa`;

    const visibilityMeters = hourly.visibility ? hourly.visibility[startIndex] : null;
    visibilityEl.textContent = visibilityMeters != null
        ? `${(visibilityMeters / 1000).toFixed(1)} km`
        : "—";

    const uvValue = hourly.uv_index ? hourly.uv_index[startIndex] : daily.uv_index_max[0];
    uvIndexEl.textContent = uvValue != null
        ? `${uvValue.toFixed(1)} · ${uvCategory(uvValue)}`
        : "—";

    sunriseEl.textContent = formatTime(daily.sunrise[0]);
    sunsetEl.textContent = formatTime(daily.sunset[0]);

    // Hourly forecast + chart
    displayHourly(hourly, startIndex);
    renderChart(hourly, startIndex);

    // 5-day forecast
    displayForecast(daily);

    // Show dashboard
    weatherDashboard.classList.remove("hidden");
}

function uvCategory(value) {
    if (value < 3) return "Low";
    if (value < 6) return "Moderate";
    if (value < 8) return "High";
    if (value < 11) return "Very High";
    return "Extreme";
}

function findCurrentHourIndex(hourlyTimes, currentTimeIso) {
    const current = new Date(currentTimeIso);
    for (let i = 0; i < hourlyTimes.length; i++) {
        if (new Date(hourlyTimes[i]) >= current) {
            return i;
        }
    }
    return 0;
}

// ==========================================
// Display Hourly Forecast
// ==========================================

function displayHourly(hourly, startIndex) {
    hourlyForecastContainer.innerHTML = "";
    const hoursToShow = 24;

    for (let offset = 0; offset < hoursToShow; offset++) {
        const i = startIndex + offset;
        if (i >= hourly.time.length) break;

        const time = new Date(hourly.time[i]);
        const weatherInfo = getWeatherInfo(hourly.weather_code[i]);
        const temp = formatTemperature(hourly.temperature_2m[i]);

        const card = document.createElement("div");
        card.className = "hourly-card" + (offset === 0 ? " is-now" : "");
        card.innerHTML = `
            <p class="hourly-time">${offset === 0 ? "Now" : formatHour(time)}</p>
            <div class="hourly-icon" aria-hidden="true">${weatherInfo.icon}</div>
            <p class="hourly-temp">${temp}${unitSymbol()}</p>
        `;
        hourlyForecastContainer.appendChild(card);
    }
}

function formatHour(date) {
    return date.toLocaleTimeString("en-US", { hour: "numeric" });
}

function formatTime(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString(
        "en-US",
        { hour: "numeric", minute: "2-digit" }
    );
}

function formatSavedAt(isoString) {
    return new Date(isoString).toLocaleString(
        "en-US",
        { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    );
}

// ==========================================
// Temperature Chart (plain inline SVG)
// ==========================================

function renderChart(hourly, startIndex) {
    const hoursToShow = 24;
    const points = [];
    for (let offset = 0; offset < hoursToShow; offset++) {
        const i = startIndex + offset;
        if (i >= hourly.time.length) break;
        points.push({
            time: new Date(hourly.time[i]),
            temp: convertTemperature(hourly.temperature_2m[i])
        });
    }

    if (points.length === 0) {
        chartContainer.innerHTML = "";
        return;
    }

    const width = 640;
    const height = 220;
    const paddingX = 12;
    const paddingTop = 28;
    const paddingBottom = 28;

    const temps = points.map((p) => p.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp || 1;

    const stepX = (width - paddingX * 2) / (points.length - 1 || 1);
    const scaleY = (t) =>
        height - paddingBottom -
        ((t - minTemp) / range) * (height - paddingTop - paddingBottom);

    const coords = points.map((p, i) => ({
        x: paddingX + i * stepX,
        y: scaleY(p.temp)
    }));

    const linePath = coords
        .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
        .join(" ");

    const areaPath =
        `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - paddingBottom} ` +
        `L ${coords[0].x.toFixed(1)} ${height - paddingBottom} Z`;

    // Label every 4th hour on the x-axis, plus data points at those marks
    const labelInterval = 4;
    let markup = "";
    coords.forEach((c, i) => {
        if (i % labelInterval === 0 || i === coords.length - 1) {
            const label = i === 0 ? "Now" : formatHour(points[i].time);
            markup += `<text class="chart-axis-label" x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${label}</text>`;
            markup += `<text class="chart-value-label" x="${c.x.toFixed(1)}" y="${(c.y - 12).toFixed(1)}" text-anchor="middle">${Math.round(points[i].temp)}°</text>`;
            markup += `<circle class="chart-point" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5"></circle>`;
        }
    });

    chartContainer.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title">
            <title id="chart-title">Hourly temperature trend</title>
            <path class="chart-fill" d="${areaPath}"></path>
            <path class="chart-line" d="${linePath}"></path>
            ${markup}
        </svg>
    `;

    const low = Math.round(minTemp);
    const high = Math.round(maxTemp);
    chartDescription.textContent =
        `Temperature over the next ${points.length} hours ranges from ` +
        `${low}${unitSymbol()} to ${high}${unitSymbol()}.`;
}

// ==========================================
// Display 5-Day Forecast
// ==========================================

function displayForecast(daily) {
    forecast.innerHTML = "";
    // API is requested with forecast_days=6 so the hourly array has
    // enough headroom for a full "next 24 hours" window even late in
    // the day; the daily forecast itself still shows 5 days.
    const daysToShow = Math.min(5, daily.time.length);

    for (let i = 0; i < daysToShow; i++) {
        const date = new Date(`${daily.time[i]}T12:00:00`);
        const weatherInfo = getWeatherInfo(daily.weather_code[i]);
        const high = formatTemperature(daily.temperature_2m_max[i]);
        const low = formatTemperature(daily.temperature_2m_min[i]);
        const forecastCard = document.createElement("article");
        forecastCard.className = "forecast-card";
        forecastCard.innerHTML = `
            <p class="forecast-day">
                ${getForecastDay(date, i)}
            </p>
            <div class="forecast-icon" aria-hidden="true">
                ${weatherInfo.icon}
            </div>
            <p class="forecast-condition">
                ${weatherInfo.condition}
            </p>
            <div class="forecast-temperature">
                <span class="forecast-high">
                    ${high}°
                </span>

                <span class="forecast-low">
                    ${low}°
                </span>
            </div>
        `;
        forecast.appendChild(forecastCard);
    }
}

// ==========================================
// Format Dates
// ==========================================

function formatDate(date) {
    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric"
        }
    );
}

function getForecastDay(date, index) {
    if (index === 0) {
        return "Today";
    }

    if (index === 1) {
        return "Tomorrow";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "short"
        }
    );
}

// ==========================================
// Loading State
// ==========================================

function showLoading() {
    loading.classList.remove("hidden");
    weatherDashboard.classList.add("hidden");
    searchButton.disabled = true;
    searchButton.textContent = "Searching...";
    geolocateButton.disabled = true;
    errorMessage.textContent = "";
}


function hideLoading() {
    loading.classList.add("hidden");
    searchButton.disabled = false;
    searchButton.textContent = "Search";
    geolocateButton.disabled = false;
}

// ==========================================
// Error Handling
// ==========================================

function showError(message) {
    errorMessage.textContent = message;
    weatherDashboard.classList.add("hidden");
}

// ==========================================
// LocalStorage: Recently Searched Cities
// ==========================================

function getRecentCities() {
    try {
        const savedCities =
            localStorage.getItem(STORAGE_KEY);
        if (!savedCities) {
            return [];
        }
        return JSON.parse(savedCities);
    } catch (error) {
        console.error(
            "Unable to read recent cities:",
            error
        );
        return [];
    }
}

function saveRecentCity(location) {
    let cities =
        getRecentCities();
    const cityData = {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude
    };
    // Remove duplicate city
    cities = cities.filter(city =>
        !(
            city.name === cityData.name &&
            city.country === cityData.country
        )
    );

    // Add newest city to beginning
    cities.unshift(cityData);

    // Keep only the latest five
    cities =
        cities.slice(0, MAX_RECENT_CITIES);

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cities)
        );
    } catch (error) {
        console.error("Unable to save recent cities:", error);
    }

    displayRecentCities();
}


function displayRecentCities() {
    const cities = getRecentCities();
    recentCities.innerHTML = "";
    if (cities.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = "No recently searched cities.";
        recentCities.appendChild(
            emptyMessage
        );
        return;
    }
    cities.forEach(city => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "recent-city";
        button.textContent = `${city.name}, ${city.country}`;
        button.addEventListener(
            "click",
            () => loadWeatherForLocation(city)
        );
        recentCities.appendChild(button);
    });
}

// ==========================================
// LocalStorage: Last Weather (offline fallback)
// ==========================================

function saveLastWeather(location, weatherData) {
    try {
        localStorage.setItem(LAST_WEATHER_KEY, JSON.stringify({
            location,
            weatherData,
            savedAt: new Date().toISOString()
        }));
    } catch (error) {
        console.error("Unable to cache weather for offline use:", error);
    }
}

function getLastWeather() {
    try {
        const saved = localStorage.getItem(LAST_WEATHER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error("Unable to read cached weather:", error);
        return null;
    }
}

function showOfflineBanner(location, savedAtIso) {
    offlineBanner.textContent =
        `You're offline. Showing saved weather for ${location.name} ` +
        `from ${formatSavedAt(savedAtIso)}.`;
    offlineBanner.classList.remove("hidden");
}

function hideOfflineBanner() {
    offlineBanner.classList.add("hidden");
}

// ==========================================
// Search Form
// ==========================================

searchForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();
        closeSuggestions();
        const city = cityInput.value.trim();
        if (!city) {
            showError(
                "Please enter a city name."
            );
            return;
        }
        showLoading();
        try {
            const location = await searchCity(city);
            await loadWeatherForLocation(location);
            cityInput.value = "";
        } catch (error) {
            console.error(
                "City search failed:",
                error
            );
            hideLoading();
            showError(
                error.message ||
                "Something went wrong. Please try again."
            );
        }
    }
);

// ==========================================
// Clear Recent Searches
// ==========================================

clearHistoryButton.addEventListener(
    "click",
    () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Unable to clear recent cities:", error);
        }
        displayRecentCities();
    }
);

// ==========================================
// Geolocation ("My location")
// ==========================================

geolocateButton.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
        showError("Your browser doesn't support location lookup.");
        return;
    }

    showLoading();
    announce("Requesting your location.");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const place = await reverseGeocode(latitude, longitude);
            const location = {
                name: place ? place.name : "Current Location",
                country: place ? place.country : "",
                latitude,
                longitude
            };
            // loadWeatherForLocation manages its own loading state,
            // so release the one we just set before delegating.
            hideLoading();
            await loadWeatherForLocation(location);
        },
        (error) => {
            hideLoading();
            const messages = {
                1: "Location access was denied. You can search for a city instead.",
                2: "Your location isn't available right now.",
                3: "Getting your location took too long. Please try again."
            };
            showError(messages[error.code] || "Unable to get your location.");
        },
        { timeout: 10000 }
    );
});

// ==========================================
// Search Suggestions (accessible combobox)
// ==========================================

let suggestionResults = [];
let activeSuggestionIndex = -1;
let suggestionDebounceTimer = null;
let suggestionAbortController = null;

function debounceSuggestions(fn, delay) {
    return (...args) => {
        clearTimeout(suggestionDebounceTimer);
        suggestionDebounceTimer = setTimeout(() => fn(...args), delay);
    };
}

const fetchSuggestions = debounceSuggestions(async (query) => {
    if (suggestionAbortController) {
        suggestionAbortController.abort();
    }
    suggestionAbortController = new AbortController();

    try {
        const results = await searchCitySuggestions(query, suggestionAbortController.signal);
        suggestionResults = results;
        renderSuggestions();
    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Suggestion lookup failed:", error);
        }
    }
}, SUGGESTION_DEBOUNCE_MS);

function renderSuggestions() {
    activeSuggestionIndex = -1;
    suggestionsList.innerHTML = "";

    if (suggestionResults.length === 0) {
        closeSuggestions();
        return;
    }

    suggestionResults.forEach((result, index) => {
        const region = [result.admin1, result.country].filter(Boolean).join(", ");
        const item = document.createElement("li");
        item.className = "suggestion-option";
        item.id = `suggestion-${index}`;
        item.role = "option";
        item.setAttribute("aria-selected", "false");
        item.innerHTML = `
            ${result.name}
            <span class="suggestion-region">${region}</span>
        `;
        item.addEventListener("mousedown", (event) => {
            // mousedown (not click) fires before the input's blur handler
            event.preventDefault();
            selectSuggestion(result);
        });
        suggestionsList.appendChild(item);
    });

    suggestionsList.classList.remove("hidden");
    cityInput.setAttribute("aria-expanded", "true");
}

function closeSuggestions() {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
    suggestionResults = [];
    activeSuggestionIndex = -1;
    cityInput.setAttribute("aria-expanded", "false");
    cityInput.removeAttribute("aria-activedescendant");
}

function moveSuggestionActive(delta) {
    if (suggestionResults.length === 0) return;
    const options = suggestionsList.querySelectorAll(".suggestion-option");
    if (activeSuggestionIndex >= 0) {
        options[activeSuggestionIndex].setAttribute("aria-selected", "false");
    }
    activeSuggestionIndex =
        (activeSuggestionIndex + delta + options.length) % options.length;
    const active = options[activeSuggestionIndex];
    active.setAttribute("aria-selected", "true");
    active.scrollIntoView({ block: "nearest" });
    cityInput.setAttribute("aria-activedescendant", active.id);
}

async function selectSuggestion(result) {
    cityInput.value = `${result.name}${result.country ? ", " + result.country : ""}`;
    closeSuggestions();
    showLoading();
    try {
        await loadWeatherForLocation(result);
        cityInput.value = "";
    } finally {
        hideLoading();
    }
}

cityInput.addEventListener("input", () => {
    const query = cityInput.value.trim();
    if (query.length < MIN_SUGGESTION_LENGTH) {
        closeSuggestions();
        return;
    }
    fetchSuggestions(query);
});

cityInput.addEventListener("keydown", (event) => {
    const suggestionsOpen = !suggestionsList.classList.contains("hidden");

    if (event.key === "ArrowDown" && suggestionsOpen) {
        event.preventDefault();
        moveSuggestionActive(1);
    } else if (event.key === "ArrowUp" && suggestionsOpen) {
        event.preventDefault();
        moveSuggestionActive(-1);
    } else if (event.key === "Enter" && suggestionsOpen && activeSuggestionIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestionResults[activeSuggestionIndex]);
    } else if (event.key === "Escape" && suggestionsOpen) {
        closeSuggestions();
    }
});

cityInput.addEventListener("blur", () => {
    // Delay so a mousedown-based suggestion click can still register.
    setTimeout(closeSuggestions, 100);
});

document.addEventListener("click", (event) => {
    if (!searchForm.contains(event.target)) {
        closeSuggestions();
    }
});

// ==========================================
// Online / Offline Events
// ==========================================

window.addEventListener("offline", () => {
    announce("You're offline. Some features may be limited.");
});

window.addEventListener("online", () => {
    announce("You're back online.");
    hideOfflineBanner();
});

// ==========================================
// Progressive Web App: Install Prompt
// ==========================================

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove("hidden");
});

installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
    installButton.classList.add("hidden");
    announce("Weather Dashboard installed.");
});

// ==========================================
// Progressive Web App: Service Worker
// ==========================================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((error) => {
            console.error("Service worker registration failed:", error);
        });
    });
}

// ==========================================
// Initial Page Load
// ==========================================

initTheme();
initUnit();
displayRecentCities();

// Automatically load Manila on first visit
async function loadDefaultCity() {
    const recent = getRecentCities();
    if (recent.length > 0) {
        await loadWeatherForLocation(recent[0], { saveToRecents: false });
        return;
    }
    try {
        const location = await searchCity("Manila");
        await loadWeatherForLocation(location);
    } catch (error) {
        console.error(error);
        const usedCache = tryShowCachedWeather(null, error);
        if (!usedCache) {
            showError("Unable to load the default weather.");
        }
    }
}

loadDefaultCity();

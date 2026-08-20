// ==========================================
// Weather Dashboard
// ==========================================

// Open-Meteo APIs
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

// LocalStorage key
const STORAGE_KEY = "weatherDashboardRecentCities";

// Maximum number of recently searched cities
const MAX_RECENT_CITIES = 5;


// ==========================================
// DOM Elements
// ==========================================

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const errorMessage = document.getElementById("error-message");
const loading = document.getElementById("loading");
const weatherDashboard = document.getElementById("weather-dashboard");
const locationName = document.getElementById("location-name");
const dateElement = document.getElementById("date");
const weatherIcon = document.getElementById("weather-icon");
const currentTemperature = document.getElementById("current-temperature");
const weatherCondition = document.getElementById("weather-condition");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const forecast = document.getElementById("forecast");
const recentCities = document.getElementById("recent-cities");
const clearHistoryButton = document.getElementById("clear-history");
// ==========================================
// Weather Code Information
// ==========================================

function getWeatherInfo(weatherCode) {
    const weatherCodes = {

        0: {
            condition: "Clear Sky",
            icon: "☀️"
        },

        1: {
            condition: "Mainly Clear",
            icon: "🌤️"
        },

        2: {
            condition: "Partly Cloudy",
            icon: "⛅"
        },

        3: {
            condition: "Overcast",
            icon: "☁️"
        },

        45: {
            condition: "Fog",
            icon: "🌫️"
        },

        48: {
            condition: "Depositing Rime Fog",
            icon: "🌫️"
        },

        51: {
            condition: "Light Drizzle",
            icon: "🌦️"
        },

        53: {
            condition: "Moderate Drizzle",
            icon: "🌦️"
        },

        55: {
            condition: "Dense Drizzle",
            icon: "🌧️"
        },

        61: {
            condition: "Slight Rain",
            icon: "🌦️"
        },

        63: {
            condition: "Moderate Rain",
            icon: "🌧️"
        },

        65: {
            condition: "Heavy Rain",
            icon: "🌧️"
        },

        71: {
            condition: "Slight Snow",
            icon: "🌨️"
        },

        73: {
            condition: "Moderate Snow",
            icon: "🌨️"
        },

        75: {
            condition: "Heavy Snow",
            icon: "❄️"
        },

        77: {
            condition: "Snow Grains",
            icon: "❄️"
        },

        80: {
            condition: "Slight Rain Showers",
            icon: "🌦️"
        },

        81: {
            condition: "Moderate Rain Showers",
            icon: "🌧️"
        },

        82: {
            condition: "Violent Rain Showers",
            icon: "⛈️"
        },

        85: {
            condition: "Slight Snow Showers",
            icon: "🌨️"
        },

        86: {
            condition: "Heavy Snow Showers",
            icon: "❄️"
        },

        95: {
            condition: "Thunderstorm",
            icon: "⛈️"
        },

        96: {
            condition: "Thunderstorm With Hail",
            icon: "⛈️"
        },

        99: {
            condition: "Heavy Thunderstorm With Hail",
            icon: "⛈️"
        }

    };
    return weatherCodes[weatherCode] || {
        condition: "Unknown",
        icon: "🌡️"
    };
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

// ==========================================
// Get Weather
// ==========================================

async function getWeather(latitude, longitude) {
    const url =
        `${WEATHER_API}?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,` +
        `weather_code,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,` +
        `temperature_2m_min` +
        `&timezone=auto` +
        `&forecast_days=5`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            "Unable to retrieve weather information."
        );
    }
    return await response.json();
}

// ==========================================
// Display Weather
// ==========================================

function displayWeather(location, weatherData) {
    const current = weatherData.current;
    const daily = weatherData.daily;
    const weatherInfo = getWeatherInfo(current.weather_code);

    // Location
    const countryName = location.country || "";
    locationName.textContent = `${location.name}, ${countryName}`;

    // Date
    const currentDate = new Date(current.time);
    dateElement.textContent = formatDate(currentDate);

    // Current weather
    weatherIcon.textContent = weatherInfo.icon;
    currentTemperature.textContent = Math.round(current.temperature_2m);
    weatherCondition.textContent = weatherInfo.condition;
    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    // Forecast
    displayForecast(daily);

    // Show dashboard
    weatherDashboard.classList.remove("hidden");
}

// ==========================================
// Display Forecast
// ==========================================

function displayForecast(daily) {
    forecast.innerHTML = "";
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(`${daily.time[i]}T12:00:00`);
        const weatherInfo = getWeatherInfo(daily.weather_code[i]);
        const high = Math.round(daily.temperature_2m_max[i]);
        const low = Math.round(daily.temperature_2m_min[i]);
        const forecastCard = document.createElement("article");
        forecastCard.className = "forecast-card";
        forecastCard.innerHTML = `
            <p class="forecast-day">
                ${getForecastDay(date, i)}
            </p>
            <div class="forecast-icon">
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
    errorMessage.textContent = "";
}


function hideLoading() {
    loading.classList.add("hidden");
    searchButton.disabled = false;
    searchButton.textContent = "Search";
}

// ==========================================
// Error Handling
// ==========================================

function showError(message) {
    errorMessage.textContent = message;
    weatherDashboard.classList.add("hidden");
}

// ==========================================
// LocalStorage
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

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cities)
    );

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
            () => loadRecentCity(city)
        );
        recentCities.appendChild(button);
    });
}

// ==========================================
// Load Recent City
// ==========================================

async function loadRecentCity(city) {
    showLoading();
    try {
        const weatherData = await getWeather(
                city.latitude,
                city.longitude
            );
        displayWeather(
            city,
            weatherData
        );
    } catch (error) {
        console.error(error);
        showError(
            "Unable to load weather for this city."
        );
    } finally {
        hideLoading();
    }
}

// ==========================================
// Search Form
// ==========================================

searchForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();
        const city = cityInput.value.trim();
        if (!city) {
            showError(
                "Please enter a city name."
            );
            return;
        }
        showLoading();
        try {
            // Step 1:
            // Convert city name into coordinates
            const location = await searchCity(city);
            // Step 2:
            // Get weather using coordinates
            const weatherData = await getWeather(
                location.latitude,
                location.longitude
            );
            // Step 3:
            // Display weather
            displayWeather(
                location,
                weatherData
            );
            // Step 4:
            // Save city to LocalStorage
            saveRecentCity(location);
            // Clear search box
            cityInput.value = "";
        } catch (error) {
            console.error(
                "Weather request failed:",
                error
            );
            showError(
                error.message ||
                "Something went wrong. Please try again."
            );
        } finally {
            hideLoading();
        }
    }
);

// ==========================================
// Clear Recent Searches
// ==========================================

clearHistoryButton.addEventListener(
    "click",
    () => {
        localStorage.removeItem(
            STORAGE_KEY
        );
        displayRecentCities();
    }
);

// ==========================================
// Initial Page Load
// ==========================================

displayRecentCities();

// Automatically load Manila on first visit
async function loadDefaultCity() {

    const recentCities =
        getRecentCities();
    if (recentCities.length > 0) {
        await loadRecentCity(
            recentCities[0]
        );
        return;
    } try {
        showLoading();
        const location = await searchCity("Manila");
        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );
        displayWeather(
            location,
            weatherData
        );
        saveRecentCity(location);
    } catch (error) {
        console.error(error);
        showError(
            "Unable to load the default weather."
        );
    } finally {
        hideLoading();
    }
}

loadDefaultCity();
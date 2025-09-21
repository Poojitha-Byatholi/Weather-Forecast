// API Configuration
const API_KEY = "59dbe3dbb771994c1f97bd88548fd057";
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CURRENT_WEATHER_URL = `${BASE_URL}/weather`;
const FORECAST_URL = `${BASE_URL}/forecast`;
const ICON_URL = 'https://openweathermap.org/img/wn/';

// DOM Elements
const citySearch = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const loadingOverlay = document.getElementById('loading-overlay');

// Weather elements
const locationElement = document.getElementById('location');
const currentTimeElement = document.getElementById('current-time');
const weatherIcon = document.getElementById('weather-icon');
const temperatureElement = document.getElementById('temp');
const weatherDescElement = document.getElementById('weather-desc');
const feelsLikeElement = document.getElementById('feels-like');
const humidityElement = document.getElementById('humidity');
const windElement = document.getElementById('wind');
const visibilityElement = document.getElementById('visibility');
const sunriseElement = document.getElementById('sunrise');
const sunsetElement = document.getElementById('sunset');
const forecastContainer = document.getElementById('forecast-cards');
const funFactElement = document.getElementById('fun-fact');
const favoritesContainer = document.getElementById('favorites-container');
const currentYearElement = document.getElementById('current-year');

// State
let currentUnit = 'metric'; // Default to Celsius
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Fun facts about weather
const funFacts = [
    "The fastest recorded raindrop fell at 18 mph (29 km/h).",
    "A cubic mile of fog is made up of less than a gallon of water.",
    "The highest temperature ever recorded on Earth was 134°F (56.7°C) in Death Valley, California.",
    "Snowflakes falling at 2-4 mph can take about 1 hour to reach the ground.",
    "Lightning can heat the air to around 54,000°F (30,000°C), which is six times hotter than the sun's surface.",
    "The windiest place on Earth is Commonwealth Bay, Antarctica, with winds regularly exceeding 150 mph.",
    "A single lightning bolt contains enough energy to toast 100,000 slices of bread.",
    "Temperatures in the upper atmosphere can drop to -130°F (-90°C).",
    "The longest recorded dry period was 173 months in Arica, Chile.",
    "The largest snowflake ever recorded was 15 inches wide and 8 inches thick."
];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYearElement.textContent = new Date().getFullYear();
    
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
    
    // Load favorites
    renderFavorites();
    
    // Get user's location or default to a city
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            () => {
                // Default to New York if geolocation is denied
                getWeatherByCity('New York');
            }
        );
    } else {
        // Default to New York if geolocation is not supported
        getWeatherByCity('New York');
    }
    
    // Show a random fun fact
    showRandomFunFact();
    
    // Update time every minute
    updateTime();
    setInterval(updateTime, 60000);
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = citySearch.value.trim();
    if (city) {
        getWeatherByCity(city);
    }
});

citySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = citySearch.value.trim();
        if (city) {
            getWeatherByCity(city);
        }
    }
});

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            () => {
                hideLoading();
                alert('Unable to retrieve your location. Please enable location services and try again.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
});

themeToggle.addEventListener('change', toggleTheme);

// Functions
async function getWeatherByCity(city) {
    try {
        showLoading();
        console.log('Fetching weather for city:', city);
        
        // Get current weather data
        const currentWeatherUrl = `${CURRENT_WEATHER_URL}?q=${encodeURIComponent(city)}&units=${currentUnit}&appid=${API_KEY}`;
        console.log('Current Weather API URL:', currentWeatherUrl);
        
        const currentWeatherResponse = await fetch(currentWeatherUrl);
        
        if (!currentWeatherResponse.ok) {
            const errorData = await currentWeatherResponse.json().catch(() => ({}));
            console.error('Current Weather API error:', errorData);
            throw new Error(`Weather API error: ${currentWeatherResponse.status} ${currentWeatherResponse.statusText}`);
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        console.log('Current Weather API response:', currentWeatherData);
        
        // Get forecast data
        const forecastUrl = `${FORECAST_URL}?q=${encodeURIComponent(city)}&units=${currentUnit}&appid=${API_KEY}`;
        console.log('Forecast API URL:', forecastUrl);
        
        const forecastResponse = await fetch(forecastUrl);
        
        if (!forecastResponse.ok) {
            console.error('Forecast API error:', await forecastResponse.json().catch(() => ({})));
            // Continue without forecast if there's an error
            updateWeatherUI(currentWeatherData, { name: currentWeatherData.name, country: currentWeatherData.sys.country });
        } else {
            const forecastData = await forecastResponse.json();
            console.log('Forecast API response:', forecastData);
            
            // Combine current weather and forecast data
            const weatherData = {
                current: currentWeatherData,
                daily: forecastData.list.filter((_, index) => index % 8 === 0).slice(0, 5) // Get one forecast per day for 5 days
            };
            
            // Update UI with weather data
            updateWeatherUI(weatherData, { name: currentWeatherData.name, country: currentWeatherData.sys.country });
        }
        
        // Add to search history
        addToFavorites({ 
            name: currentWeatherData.name, 
            country: currentWeatherData.sys.country,
            lat: currentWeatherData.coord.lat,
            lon: currentWeatherData.coord.lon 
        });
        
        // Update city search input
        citySearch.value = currentWeatherData.name;
        
        // Show a random fun fact
        showRandomFunFact();
        
    } catch (error) {
        console.error('Error in getWeatherByCity:', error);
        alert(error.message || 'Error fetching weather data. Please try again.');
    } finally {
        hideLoading();
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        console.log('Fetching weather for coordinates:', { lat, lon });
        
        // Get current weather data using coordinates
        const currentWeatherUrl = `${CURRENT_WEATHER_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
        console.log('Current Weather API URL:', currentWeatherUrl);
        
        const currentWeatherResponse = await fetch(currentWeatherUrl);
        
        if (!currentWeatherResponse.ok) {
            const errorData = await currentWeatherResponse.json().catch(() => ({}));
            console.error('Current Weather API error:', errorData);
            throw new Error(`Weather API error: ${currentWeatherResponse.status} ${currentWeatherResponse.statusText}`);
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        console.log('Current Weather API response:', currentWeatherData);
        
        // Get forecast data
        const forecastUrl = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
        console.log('Forecast API URL:', forecastUrl);
        
        const forecastResponse = await fetch(forecastUrl);
        
        if (!forecastResponse.ok) {
            console.error('Forecast API error:', await forecastResponse.json().catch(() => ({})));
            // Continue without forecast if there's an error
            updateWeatherUI(
                { current: currentWeatherData, daily: [] }, 
                { name: currentWeatherData.name, country: currentWeatherData.sys.country }
            );
        } else {
            const forecastData = await forecastResponse.json();
            console.log('Forecast API response:', forecastData);
            
            // Combine current weather and forecast data
            const weatherData = {
                current: currentWeatherData,
                daily: forecastData.list.filter((_, index) => index % 8 === 0).slice(0, 5) // Get one forecast per day for 5 days
            };
            
            updateWeatherUI(
                weatherData, 
                { name: currentWeatherData.name, country: currentWeatherData.sys.country }
            );
            
            // Add to search history
            addToFavorites({ 
                name: currentWeatherData.name, 
                country: currentWeatherData.sys.country,
                lat: currentWeatherData.coord.lat,
                lon: currentWeatherData.coord.lon 
            });
        }
        
        // Show a random fun fact
        showRandomFunFact();
        
    } catch (error) {
        console.error('Error in getWeatherByCoords:', error);
        alert(error.message || 'Error fetching weather data. Please try again.');
    } finally {
        hideLoading();
    }
}

function updateWeatherUI(data, location) {
    if (!data || !data.current || !location) {
        console.error('Invalid data or location provided to updateWeatherUI:', { data, location });
        alert('Error: Invalid weather data received. Please try again.');
        return;
    }
    
    const { current, daily = [] } = data;
    const { name = 'Unknown', country = '' } = location || {};
    const timezoneOffset = current.timezone || 0;
    
    // Update location
    locationElement.textContent = `${name}${country ? `, ${country}` : ''}`;
    
    // Safely update current weather with null checks
    const temp = current.main?.temp !== undefined ? Math.round(current.main.temp) : '--';
    const feelsLike = current.main?.feels_like !== undefined ? Math.round(current.main.feels_like) : '--';
    const windSpeed = current.wind?.speed !== undefined ? current.wind.speed.toFixed(1) : '--';
    const visibility = current.visibility !== undefined ? (current.visibility / 1000).toFixed(1) : '--';
    
    temperatureElement.textContent = temp;
    weatherDescElement.textContent = current.weather?.[0]?.description || '--';
    feelsLikeElement.textContent = `${feelsLike}°${currentUnit === 'metric' ? 'C' : 'F'}`;
    humidityElement.textContent = `${current.main?.humidity ?? '--'}%`;
    windElement.textContent = `${windSpeed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}`;
    visibilityElement.textContent = `${visibility} km`;
    
    // Convert timestamps to local time
    const sunriseTime = current.sys?.sunrise ? new Date((current.sys.sunrise + timezoneOffset) * 1000) : null;
    const sunsetTime = current.sys?.sunset ? new Date((current.sys.sunset + timezoneOffset) * 1000) : null;
    
    sunriseElement.textContent = sunriseTime ? formatTime(sunriseTime) : '--:--';
    sunsetElement.textContent = sunsetTime ? formatTime(sunsetTime) : '--:--';
    
    // Update weather icon if available
    if (current.weather?.[0]?.icon) {
        updateWeatherIcon(current.weather[0].icon, current.weather[0].main);
    } else {
        // Default to a generic weather icon if none is provided
        weatherIcon.innerHTML = '<i class="fas fa-cloud-sun"></i>';
    }
    
    // Update background based on weather condition
    updateBackground(current.weather[0].main);
    
    // Update forecast
    updateForecast(daily, timezoneOffset);
    
    // Update time
    updateTime();
}

function updateWeatherIcon(iconCode, condition) {
    const iconElement = weatherIcon.querySelector('i');
    
    // Map OpenWeatherMap icon codes to Font Awesome icons
    const iconMap = {
        '01d': 'sun',
        '01n': 'moon',
        '02d': 'cloud-sun',
        '02n': 'cloud-moon',
        '03d': 'cloud',
        '03n': 'cloud',
        '04d': 'cloud',
        '04n': 'cloud',
        '09d': 'cloud-rain',
        '09n': 'cloud-rain',
        '10d': 'cloud-sun-rain',
        '10n': 'cloud-moon-rain',
        '11d': 'bolt',
        '11n': 'bolt',
        '13d': 'snowflake',
        '13n': 'snowflake',
        '50d': 'smog',
        '50n': 'smog'
    };
    
    const iconName = iconMap[iconCode] || 'cloud-sun';
    iconElement.className = `fas fa-${iconName}`;
    
    // Add animation based on weather condition
    iconElement.style.animation = 'none';
    void iconElement.offsetWidth; // Trigger reflow
    
    if (condition === 'Clear') {
        iconElement.style.animation = 'spin 20s linear infinite';
    } else if (condition === 'Rain') {
        iconElement.style.animation = 'rainDrop 1.5s ease-in-out infinite';
    } else if (condition === 'Snow') {
        iconElement.style.animation = 'snowFall 3s linear infinite';
    } else if (condition === 'Thunderstorm') {
        iconElement.style.animation = 'lightning 1s ease-in-out infinite';
    }
}

function updateForecast(daily = [], timezoneOffset = 0) {
    // Clear previous forecast
    forecastContainer.innerHTML = '';
    
    // If no forecast data, show a message
    if (!daily || daily.length === 0) {
        forecastContainer.innerHTML = '<div class="no-forecast">5-day forecast not available</div>';
        return;
    }
    
    // Get the next 5 days (or fewer if not enough data)
    const forecastDays = daily.slice(0, 5);
    
    // Add forecast cards
    forecastDays.forEach((day, index) => {
        if (!day || !day.dt) return;
        
        const date = new Date((day.dt + timezoneOffset) * 1000);
        const dayName = getDayName(date);
        
        // Safely get temperature values
        const tempMax = day.main?.temp_max !== undefined ? Math.round(day.main.temp_max) : '--';
        const tempMin = day.main?.temp_min !== undefined ? Math.round(day.main.temp_min) : '--';
        
        // Safely get weather icon and description
        const weatherIcon = day.weather?.[0]?.icon || '02d'; // Default to partly cloudy icon
        const weatherDesc = day.weather?.[0]?.description || '--';
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${index === 0 ? 'Tomorrow' : dayName}</div>
            <div class="forecast-icon">
                <img src="${ICON_URL}${weatherIcon}@2x.png" alt="${weatherDesc}" onerror="this.onerror=null; this.src='${ICON_URL}02d@2x.png'">
            </div>
            <div class="forecast-desc">${weatherDesc}</div>
            <div class="forecast-temp">
                <span class="temp-max">${tempMax}°</span>
                <span class="temp-min">${tempMin}°</span>
            </div>
        `;
        
        forecastContainer.appendChild(forecastCard);
    });
}

function updateBackground(condition) {
    if (!condition) {
        console.warn('No weather condition provided to updateBackground');
        return;
    }
    
    const body = document.body;
    
    // Remove all weather classes
    body.classList.remove(
        'clear-sky', 'few-clouds', 'scattered-clouds', 'broken-clouds',
        'shower-rain', 'rain', 'thunderstorm', 'snow', 'mist'
    );
    
    // Add appropriate class based on weather condition
    const conditionLower = String(condition).toLowerCase();
    
    if (conditionLower.includes('clear')) {
        body.classList.add('clear-sky');
    } else if (conditionLower.includes('cloud')) {
        body.classList.add('few-clouds');
    } else if (conditionLower.includes('drizzle') || conditionLower.includes('rain')) {
        body.classList.add('rain');
    } else if (conditionLower.includes('thunder')) {
        body.classList.add('thunderstorm');
    } else if (conditionLower.includes('snow')) {
        body.classList.add('snow');
    } else if (['mist', 'smoke', 'haze', 'fog', 'dust', 'sand'].some(w => conditionLower.includes(w))) {
        body.classList.add('mist');
    } else {
        // Default to clear sky if condition is not recognized
        body.classList.add('clear-sky');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const twelveHour = hours % 12 || 12;
    
    currentTimeElement.textContent = `${twelveHour}:${minutes} ${ampm}`;
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function showRandomFunFact() {
    const randomIndex = Math.floor(Math.random() * funFacts.length);
    funFactElement.textContent = `Did you know? ${funFacts[randomIndex]}`;
}

function addToFavorites(location) {
    const { name, country, lat, lon } = location;
    const locationKey = `${name.toLowerCase()},${country.toLowerCase()}`;
    
    // Check if already in favorites
    const exists = favorites.some(fav => 
        fav.name.toLowerCase() === name.toLowerCase() && 
        fav.country.toLowerCase() === country.toLowerCase()
    );
    
    if (!exists) {
        favorites.unshift({ name, country, lat, lon });
        // Keep only the last 5 favorites
        if (favorites.length > 5) {
            favorites = favorites.slice(0, 5);
        }
        
        // Save to localStorage
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Update UI
        renderFavorites();
    }
}

function renderFavorites() {
    favoritesContainer.innerHTML = '';
    
    favorites.forEach((fav, index) => {
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = `<i class="fas fa-star"></i> ${fav.name}`;
        
        favoriteBtn.addEventListener('click', () => {
            getWeatherByCoords(fav.lat, fav.lon);
        });
        
        favoritesContainer.appendChild(favoriteBtn);
    });
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Add CSS animations for weather icons
const style = document.createElement('style');
style.textContent = `
    @keyframes rainDrop {
        0% { transform: translateY(-5px) scale(1); opacity: 1; }
        100% { transform: translateY(5px) scale(0.95); opacity: 0.8; }
    }
    
    @keyframes snowFall {
        0% { transform: translateY(-10px) rotate(0deg); }
        100% { transform: translateY(10px) rotate(360deg); }
    }
    
    @keyframes lightning {
        0%, 100% { opacity: 1; filter: brightness(1); }
        50% { opacity: 0.8; filter: brightness(1.5); }
    }
    
    .clear-sky { background: linear-gradient(135deg, #56ccf2, #2f80ed); }
    .few-clouds { background: linear-gradient(135deg, #83a4d4, #b6fbff); }
    .scattered-clouds, .broken-clouds { background: linear-gradient(135deg, #bdc3c7, #2c3e50); }
    .shower-rain, .rain { background: linear-gradient(135deg, #4b6cb7, #182848); }
    .thunderstorm { background: linear-gradient(135deg, #0f0c29, #302b63); }
    .snow { background: linear-gradient(135deg, #e6e9f0, #eef2f3); }
    .mist { background: linear-gradient(135deg, #606c88, #3f4c6b); }
`;

document.head.appendChild(style);

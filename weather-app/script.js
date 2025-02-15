async function getWeather() {
    const city = document.getElementById("cityInput").value;
    if (!city) {
        alert("Lütfen bir şehir girin!");
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=tr`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) {
            document.getElementById("weatherResult").innerHTML = `<p>Şehir bulunamadı!</p>`;
            return;
        }

        const temp = data.main.temp;
        const description = data.weather[0].description;
        const cityName = data.name;
        const country = data.sys.country;

        document.getElementById("weatherResult").innerHTML = `
            <h2>${cityName}, ${country}</h2>
            <p>Sıcaklık: ${temp}°C</p>
            <p>Durum: ${description}</p>
        `;
    } catch (error) {
        console.error("Hava durumu alınırken hata oluştu!", error);
    }
}

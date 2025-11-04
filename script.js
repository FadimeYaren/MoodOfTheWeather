// ------- GLOBALS -------
let scene, camera, renderer, sphere;
let canvas = document.getElementById("weatherCanvas");
let ctx = canvas.getContext("2d");
let effect = null;
let weatherRafId = null; // 2D efekt döngüsünü kontrol için

// --- Weather emoji tablosu ---
const weatherEmojis = {
  clear: "☀️",
  clouds: "☁️",
  rain: "🌧️",
  drizzle: "🌦️",
  thunderstorm: "⛈️",
  snow: "❄️",
  mist: "🌫️",
  fog: "🌁",
  haze: "🌤️",
  wind: "💨",
  tornado: "🌪️",
  smoke: "🔥",
  dust: "🏜️",
  sand: "🌬️",
  ash: "🌋",
};

// ——— Yardımcılar ———
const pad2 = (n) => String(n).padStart(2, "0");

// OpenWeather timezone offset (saniye) ile yerel saate çevir
function fmtTime(unixSeconds, tzOffsetSeconds) {
  const d = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${hh}:${mm}`;
}

// m/s -> km/saat (isteğe göre m/s de gösterebilirsin)
const toKmH = (ms) => (ms * 3.6).toFixed(1);


// --- Açıklamadan uygun emoji seç ---
// OpenWeather main (her dilde İngilizce) + Türkçe eşanlamlılar
function getWeatherEmoji(main, description = "") {
  const m = (main || "").toLowerCase();
  const d = (description || "").toLowerCase();

  // 1) Önce main'e (Clear, Clouds, Rain...) bak
  if (m === "clear")       return "☀️";
  if (m === "clouds")      return "☁️";
  if (m === "rain")        return "🌧️";
  if (m === "drizzle")     return "🌦️";
  if (m === "thunderstorm")return "⛈️";
  if (m === "snow")        return "❄️";
  if (m === "mist")        return "🌫️";
  if (m === "fog")         return "🌁";
  if (m === "haze")        return "🌤️";
  if (m === "smoke")       return "🔥";
  if (m === "dust")        return "🏜️";
  if (m === "sand")        return "🌬️";
  if (m === "ash")         return "🌋";
  if (m === "squall")      return "💨";
  if (m === "tornado")     return "🌪️";

  // 2) Sonra TR açıklama eşleştirmeleri (lang=tr için)
  if (d.includes("açık")) return "☀️";
  if (
    d.includes("kapalı") || d.includes("bulut") || d.includes("parçalı") || d.includes("az bulut")
  ) return "☁️";
  if (d.includes("yağmur") || d.includes("sağanak")) return "🌧️";
  if (d.includes("çis") || d.includes("çise")) return "🌦️";
  if (d.includes("gök gür") || d.includes("fırtına")) return "⛈️";
  if (d.includes("kar")) return "❄️";
  if (d.includes("sis") || d.includes("pus")) return "🌫️";
  if (d.includes("duman")) return "🔥";
  if (d.includes("toz")) return "🏜️";
  if (d.includes("kum")) return "🌬️";
  if (d.includes("kül")) return "🌋";

  return "🌈"; // bulunamazsa
}




// DPR destekli canvas boyutlandırma
function resize2DCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  // Canvas koordinatlarını CSS pikseline eşitle
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}
resize2DCanvas();
window.addEventListener("resize", resize2DCanvas);

// -------- WEATHER API kısımların aynı kalsın (küçük ek düzeltme) --------
async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) { alert("Lütfen bir şehir girin!"); return; }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=tr`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
      alert("Şehir bulunamadı!");
      return;
    }

    // --- Veriler ---
    const temp = data.main.temp;
    const feels = data.main.feels_like;
    const humidity = data.main.humidity;
    const pressure = data.main.pressure;
    const windMs = data.wind?.speed ?? 0;
    const windKmh = (windMs * 3.6).toFixed(1);
    const description = data.weather[0].description || "";
    const main = data.weather[0].main || "";
    const cityName = data.name;
    const country = data.sys.country;

    const tz = data.timezone || 0;
    const sunrise = fmtTime(data.sys.sunrise, tz);
    const sunset  = fmtTime(data.sys.sunset,  tz);
    const emoji = getWeatherEmoji(main, description);

    // --- Ekrana yaz ---
    document.getElementById("cityName").textContent = `${cityName}, ${country}`;
    document.getElementById("weatherEmoji").textContent = emoji;
    document.getElementById("tempValue").textContent = `${temp.toFixed(1)}°C`;
    document.getElementById("weatherDesc").textContent = description;

    document.getElementById("feelsLike").textContent = `${feels.toFixed(1)}°C`;
    document.getElementById("humidity").textContent = `%${humidity}`;
    document.getElementById("wind").textContent = `${windKmh} km/s`;
    document.getElementById("pressure").textContent = `${pressure} hPa`;
    document.getElementById("sunrise").textContent = sunrise;
    document.getElementById("sunset").textContent = sunset;

    // Görünür hale getir
    document.getElementById("weatherDisplay").classList.remove("hidden");

    // Efektleri güncelle
    updateWeatherEffects(description);

  } catch (error) {
    console.error("Hava durumu alınırken hata oluştu!", error);
  }
}


function stopWeatherEffect() {
  if (weatherRafId) {
    cancelAnimationFrame(weatherRafId);
    weatherRafId = null;
  }
  clearCanvas();
}

function updateWeatherEffects(condition) {
  stopWeatherEffect(); // önceki döngüyü durdur
  clearCanvas();
  if (condition.includes("rain")) {
    startRainEffect();
  } else if (condition.includes("snow")) {
    startSnowEffect();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ------- 2D Efektler: RAF id sakla ----------
function startRainEffect() {
  const raindrops = [];
  const W = window.innerWidth, H = window.innerHeight;

  function createRaindrop() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      length: Math.random() * 20 + 10,
      speed: Math.random() * 5 + 2
    };
  }

  for (let i = 0; i < 100; i++) raindrops.push(createRaindrop());

  function drawRain() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(174,194,224,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const drop of raindrops) {
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.length);
    }
    ctx.stroke();
    updateRain();
  }

  function updateRain() {
    for (const drop of raindrops) {
      drop.y += drop.speed;
      if (drop.y > H) {
        drop.y = 0;
        drop.x = Math.random() * W;
      }
    }
    weatherRafId = requestAnimationFrame(drawRain);
  }

  drawRain();
}

function startSnowEffect() {
  const snowflakes = [];
  const W = window.innerWidth, H = window.innerHeight;

  function createSnowflake() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      radius: Math.random() * 3 + 1,
      speed: Math.random() * 2 + 1
    };
  }

  for (let i = 0; i < 100; i++) snowflakes.push(createSnowflake());

  function drawSnow() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    for (const flake of snowflakes) {
      ctx.moveTo(flake.x, flake.y);
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    updateSnow();
  }

  function updateSnow() {
    for (const flake of snowflakes) {
      flake.y += flake.speed;
      if (flake.y > H) {
        flake.y = 0;
        flake.x = Math.random() * W;
      }
    }
    weatherRafId = requestAnimationFrame(drawSnow);
  }

  drawSnow();
}

// --------- 360 DERECE PANORAMA ---------
function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 0.1);

  // ÖNEMLİ: antialias + DPR
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  document.getElementById("scene-container").appendChild(renderer.domElement);

  // Küre segmentlerini artır (doku gerilmesin)
  const geometry = new THREE.SphereGeometry(500, 128, 128);

  // Texture yüklemede filtreler + anisotropy
  const loader = new THREE.TextureLoader();
  loader.load("manzara.png?v=1", (tex) => {
    tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;

    // max anisotropy
    const getMaxAniso = renderer.capabilities.getMaxAnisotropy
      ? renderer.capabilities.getMaxAnisotropy()
      : 1;
    tex.anisotropy = getMaxAniso;

    // Equirectangular görseli iç küreye kaplıyoruz
    // (scene.background yerine içten kaplama, şeffaflık için iyi)
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      transparent: true
    });

    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
  });

  animateScene();

  // Resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}

function animateScene() {
  requestAnimationFrame(animateScene);
  if (sphere) sphere.rotation.y += 0.001;
  renderer.render(scene, camera);
}

initScene();

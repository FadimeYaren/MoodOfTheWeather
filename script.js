let scene, camera, renderer, sphere;
let canvas = document.getElementById("weatherCanvas");
let ctx = canvas.getContext("2d");
let effect = null;

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

        updateWeatherEffects(description);

    } catch (error) {
        console.error("Hava durumu alınırken hata oluştu!", error);
    }
}

function updateWeatherEffects(condition) {
    clearCanvas(); // Önce eski efektleri temizle
    if (condition.includes("rain")) {
        effect = startRainEffect;
    } else if (condition.includes("snow")) {
        effect = startSnowEffect;
    } else {
        effect = null;
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startRainEffect() {
    let raindrops = [];

    function createRaindrop() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 5 + 2
        };
    }

    function drawRain() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(174,194,224,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        raindrops.forEach(drop => {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
        });
        ctx.stroke();
        updateRain();
    }

    function updateRain() {
        raindrops.forEach(drop => {
            drop.y += drop.speed;
            if (drop.y > canvas.height) {
                drop.y = 0;
                drop.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(drawRain);
    }

    for (let i = 0; i < 100; i++) {
        raindrops.push(createRaindrop());
    }
    drawRain();
}

function startSnowEffect() {
    let snowflakes = [];

    function createSnowflake() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1
        };
    }

    function drawSnow() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        snowflakes.forEach(flake => {
            ctx.moveTo(flake.x, flake.y);
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        });
        ctx.fill();
        updateSnow();
    }

    function updateSnow() {
        snowflakes.forEach(flake => {
            flake.y += flake.speed;
            if (flake.y > canvas.height) {
                flake.y = 0;
                flake.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(drawSnow);
    }

    for (let i = 0; i < 100; i++) {
        snowflakes.push(createSnowflake());
    }
    drawSnow();
}

// 360 DERECE PANORAMİK SAHNEYİ OLUŞTUR
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    renderer = new THREE.WebGLRenderer({ alpha: true }); // Şeffaflık ekle
    renderer.setClearColor(0x000000, 0); // Siyah arka planı kaldır

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("scene-container").appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    const texture = new THREE.TextureLoader().load("manzara.png", function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping; // 360 derece uyum sağlamak için
        texture.minFilter = THREE.LinearFilter; // Daha iyi kalite için
    });
    
    const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        side: THREE.BackSide,
        transparent: true // Transparan desteği ekle
    });
    
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    animateScene();
}

function animateScene() {
    requestAnimationFrame(animateScene);
    sphere.rotation.y += 0.001;
    renderer.render(scene, camera);
}

initScene();

async function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation no soportado");
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precise: true
        });
      },
      async () => {
        // fallback por IP
        document.getElementById("status").innerText =
          "⚠️ Usando ubicación por IP (menos precisa)...";

        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();

          resolve({
            lat: data.latitude,
            lon: data.longitude,
            precise: false
          });
        } catch (e) {
          reject("No se pudo obtener ubicación");
        }
      }
    );
  });
}

function calcularHorasLuz(lat, lon) {
  const hoy = new Date();
  const times = SunCalc.getTimes(hoy, lat, lon);

  const sunrise = times.sunrise;
  const sunset = times.sunset;

  const diffMs = sunset - sunrise;
  const horasLuz = diffMs / (1000 * 60 * 60);

  return {
    sunrise,
    sunset,
    horasLuz,
    horasOscuridad: 24 - horasLuz
  };
}

function renderChart(luz, oscuridad) {
  const ctx = document.getElementById('chart');

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Luz', 'Oscuridad'],
      datasets: [{
        data: [luz, oscuridad],
        backgroundColor: ['#facc15', '#1e293b']
      }]
    }
  });
}

async function init() {
  const status = document.getElementById("status");
  status.innerText = "Obteniendo ubicación...";

  try {
    const loc = await getLocation();

    status.innerText = `📍 Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`;

    const data = calcularHorasLuz(loc.lat, loc.lon);

    status.innerText += `
      \n🌅 Amanecer: ${data.sunrise.toLocaleTimeString()}
      \n🌇 Atardecer: ${data.sunset.toLocaleTimeString()}
      \n⏱️ Horas de luz: ${data.horasLuz.toFixed(2)}
    `;

    renderChart(data.horasLuz, data.horasOscuridad);

  } catch (err) {
    status.innerText = "Error: " + err;
  }
}
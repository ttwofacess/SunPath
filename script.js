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

function calcularEstadoHorario(lat, lon) {
  const hoy = new Date();
  hoy.setMinutes(0, 0, 0); // Normalizar a inicio del día

  const estados = [];
  const labels = [];

  for (let i = 0; i < 24; i++) {
    const horaEvaluada = new Date(hoy);
    horaEvaluada.setHours(i);
    
    // Obtenemos la posición del sol para esa hora específica
    const sunPos = SunCalc.getPosition(horaEvaluada, lat, lon);
    
    // Si la altitud es > 0, el sol está sobre el horizonte
    estados.push(sunPos.altitude > 0);
    labels.push(`${i}h`);
  }

  return { estados, labels };
}

let sunChart = null;

function renderChart(estados, labels) {
  const ctx = document.getElementById('chart');

  if (sunChart) {
    sunChart.destroy();
  }

  // Colores: Amarillo para luz, Azul muy oscuro para oscuridad
  const colors = estados.map(isLight => isLight ? '#facc15' : '#0f172a');

  sunChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: Array(24).fill(1), // 24 segmentos iguales
        backgroundColor: colors,
        borderColor: '#1e293b',
        borderWidth: 1,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false // Ocultamos la leyenda porque ya tenemos 24 etiquetas
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const isLight = estados[context.dataIndex];
              return isLight ? '☀️ Luz del día' : '🌙 Oscuridad';
            }
          }
        }
      },
      cutout: '60%', // Hace el agujero central más grande
    }
  });
}

async function init() {
  const status = document.getElementById("status");
  status.innerText = "Obteniendo ubicación...";

  try {
    const loc = await getLocation();
    const hoy = new Date();
    const times = SunCalc.getTimes(hoy, loc.lat, loc.lon);

    status.innerText = `📍 Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`;
    status.innerText += `
      \n🌅 Amanecer: ${times.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      \n🌇 Atardecer: ${times.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
    `;

    const { estados, labels } = calcularEstadoHorario(loc.lat, loc.lon);
    renderChart(estados, labels);

  } catch (err) {
    status.innerText = "Error: " + err;
    console.error(err);
  }
}
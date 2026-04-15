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

function renderChart(estados, labels, horasLuz) {
  const ctx = document.getElementById('chart');

  if (sunChart) {
    sunChart.destroy();
  }

  // Plugin para dibujar el texto en el centro
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
      ctx.save();
      
      // Configuración del texto (escalado básico según el ancho)
      const fontSize = (height / 110).toFixed(2);
      ctx.font = `bold ${fontSize}rem sans-serif`;
      ctx.fillStyle = '#facc15';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      
      ctx.fillText(`${horasLuz.toFixed(1)}h`, centerX, centerY);
      ctx.restore();
    }
  };

  // Colores: Amarillo para luz, Azul muy oscuro para oscuridad
  const colors = estados.map(isLight => isLight ? '#facc15' : '#0f172a');

  sunChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: Array(24).fill(1),
        backgroundColor: colors,
        borderColor: '#1e293b',
        borderWidth: 1,
        hoverOffset: 4
      }]
    },
    plugins: [centerTextPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const isLight = estados[context.dataIndex];
              return isLight ? '☀️ Luz del día' : '🌙 Oscuridad';
            }
          }
        }
      },
      cutout: '70%', // Aumentamos un poco más el hueco para el texto
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

    // Calcular horas de luz precisas
    const diffMs = times.sunset - times.sunrise;
    const horasLuzTotal = isNaN(diffMs) ? 0 : diffMs / (1000 * 60 * 60);

    status.innerText = `📍 Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`;
    status.innerText += `
      \n🌅 Amanecer: ${times.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      \n🌇 Atardecer: ${times.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
    `;

    const { estados, labels } = calcularEstadoHorario(loc.lat, loc.lon);
    renderChart(estados, labels, horasLuzTotal);

  } catch (err) {
    status.innerText = "Error: " + err;
    console.error(err);
  }
}
// =====================================================
// FISHMAP PRO — APP.JS
// Карта + точки глибин + водойми + рельєф
// =====================================================

const map = L.map("map").setView([48.460, 34.980], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

// -----------------------------------------------------
// СХОВИЩЕ
// -----------------------------------------------------

const POINTS_KEY = "fishmappro_points";
const WATERS_KEY = "fishmappro_waters";
const CURRENT_WATER_KEY = "fishmappro_current_water";

let allPoints = [];
let points = [];
let waters = [];
let currentWaterId = null;
let addMode = false;

// -----------------------------------------------------
// ВОДОЙМИ
// -----------------------------------------------------

function saveWaters() {
    localStorage.setItem(WATERS_KEY, JSON.stringify(waters));
}

function loadWaters() {
    try {
        waters = JSON.parse(localStorage.getItem(WATERS_KEY) || "[]");
        if (!Array.isArray(waters)) waters = [];
    } catch {
        waters = [];
    }

    if (waters.length === 0) {
        waters.push({
            id: Date.now(),
            name: "Криничанський ставок",
            lat: 48.460,
            lng: 34.980
        });
        saveWaters();
    }

    const savedId = Number(localStorage.getItem(CURRENT_WATER_KEY));

    if (waters.some(w => Number(w.id) === savedId)) {
        currentWaterId = savedId;
    } else {
        currentWaterId = waters[0].id;
    }

    localStorage.setItem(CURRENT_WATER_KEY, String(currentWaterId));
}

function getCurrentWater() {
    return waters.find(
        w => Number(w.id) === Number(currentWaterId)
    ) || null;
}

function savePoints() {
    localStorage.setItem(POINTS_KEY, JSON.stringify(allPoints));
}

function loadPoints() {
    try {
        allPoints = JSON.parse(
            localStorage.getItem(POINTS_KEY) || "[]"
        );

        if (!Array.isArray(allPoints)) {
            allPoints = [];
        }
    } catch {
        allPoints = [];
    }

    filterPoints();
}

function filterPoints() {
    points = allPoints.filter(
        p => Number(p.waterId) === Number(currentWaterId)
    );
}

// -----------------------------------------------------
// КОЛІР ГЛИБИНИ
// -----------------------------------------------------

function depthColor(depth) {
    if (depth <= 1) return "#ff3b30";
    if (depth <= 2) return "#ff9500";
    if (depth <= 4) return "#ffd60a";
    if (depth <= 6) return "#34c759";
    if (depth <= 8) return "#30d5c8";
    if (depth <= 10) return "#0a84ff";
    if (depth <= 15) return "#0055b8";
    return "#172554";
}

// -----------------------------------------------------
// ТОЧКИ
// -----------------------------------------------------

function clearMarkers() {
    map.eachLayer(layer => {
        if (layer._fishmapPoint) {
            map.removeLayer(layer);
        }
    });
}

function drawPoints() {
    clearMarkers();

    points.forEach(point => {
        const marker = L.circleMarker(
            [Number(point.lat), Number(point.lng)],
            {
                radius: 9,
                color: "#111",
                weight: 2,
                fillColor: depthColor(Number(point.depth)),
                fillOpacity: 0.95
            }
        );

        marker._fishmapPoint = true;

        marker.bindPopup(`
            <b>🎣 FishMap Pro</b><br><br>
            🌊 Глибина: <b>${Number(point.depth).toFixed(1)} м</b><br>
            🪨 Дно: ${point.bottom || "—"}<br>
            📍 ${Number(point.lat).toFixed(6)},
            ${Number(point.lng).toFixed(6)}
            <br><br>
            <button onclick="deletePoint(${point.id})">
                🗑 Видалити
            </button>
        `);

        marker.addTo(map);
    });
}

window.deletePoint = function(id) {
    if (!confirm("Видалити точку?")) return;

    allPoints = allPoints.filter(p => p.id !== id);

    savePoints();
    filterPoints();
    drawPoints();
    drawRelief();
    renderWaters();
};

// -----------------------------------------------------
// ДОДАВАННЯ ТОЧКИ
// -----------------------------------------------------

const addPointButton = document.getElementById("addPoint");

if (addPointButton) {
    addPointButton.onclick = () => {
        addMode = true;
        alert(
            "🎯 Режим увімкнено.\n\n" +
            "Натисни на карту, щоб додати промір."
        );
    };
}

map.on("click", e => {
    if (!addMode) return;

    const depthText = prompt(
        "🌊 Введи глибину в метрах:",
        "3"
    );

    if (depthText === null) {
        addMode = false;
        return;
    }

    const depth = Number(
        depthText.replace(",", ".")
    );

    if (!Number.isFinite(depth) || depth < 0) {
        alert("❌ Некоректна глибина.");
        addMode = false;
        return;
    }

    const bottom = prompt(
        "🪨 Тип дна:",
        "мул"
    ) || "—";

    allPoints.push({
        id: Date.now(),
        waterId: currentWaterId,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        depth: depth,
        bottom: bottom
    });

    savePoints();
    filterPoints();
    drawPoints();
    drawRelief();

    addMode = false;
});

// -----------------------------------------------------
// ПРОСТИЙ РЕЛЬЄФ
// -----------------------------------------------------

const reliefCanvas = document.createElement("canvas");

reliefCanvas.style.position = "absolute";
reliefCanvas.style.left = "0";
reliefCanvas.style.top = "0";
reliefCanvas.style.pointerEvents = "none";

map.getPane("overlayPane").appendChild(reliefCanvas);

function drawRelief() {
    const size = map.getSize();

    reliefCanvas.width = size.x;
    reliefCanvas.height = size.y;

    const ctx = reliefCanvas.getContext("2d");

    ctx.clearRect(
        0,
        0,
        size.x,
        size.y
    );

    // Поки немає хоча б трьох промірів,
    // рельєф не малюємо.
    if (points.length < 3) return;

    const pixels = points.map(p =>
        map.latLngToContainerPoint([
            Number(p.lat),
            Number(p.lng)
        ])
    );

    let minX = Math.min(...pixels.map(p => p.x));
    let maxX = Math.max(...pixels.map(p => p.x));
    let minY = Math.min(...pixels.map(p => p.y));
    let maxY = Math.max(...pixels.map(p => p.y));

    const padding = 80;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(size.x, maxX + padding);
    maxY = Math.min(size.y, maxY + padding);

    const step = 18;

    ctx.globalAlpha = 0.22;

    for (let y = minY; y <= maxY; y += step) {
        for (let x = minX; x <= maxX; x += step) {

            let sum = 0;
            let weightSum = 0;

            points.forEach(point => {
                const p = map.latLngToContainerPoint([
                    Number(point.lat),
                    Number(point.lng)
                ]);

                const dx = x - p.x;
                const dy = y - p.y;

                const distance = Math.sqrt(
                    dx * dx + dy * dy
                );

                if (distance > 500) return;

                const weight =
                    1 / Math.max(distance * distance, 1);

                sum += Number(point.depth) * weight;
                weightSum += weight;
            });

            if (!weightSum) continue;

            const depth = sum / weightSum;

            ctx.fillStyle = depthColor(depth);

            ctx.fillRect(
                x,
                y,
                step + 1,
                step + 1
            );
        }
    }

    ctx.globalAlpha = 1;
}

// -----------------------------------------------------
// МОЇ ВОДОЙМИ
// -----------------------------------------------------

function createWatersPanel() {
    if (document.getElementById("fishmap-waters-panel")) return;

    const panel = document.createElement("div");

    panel.id = "fishmap-waters-panel";

    panel.innerHTML = `
        <div class="fishmap-title">
            🎣 <b>FishMap Pro</b>
        </div>

        <button id="watersOpen">
            🗺️ Мої водойми
        </button>

        <div id="watersList" style="display:none">

            <div class="waters-header">
                <b>Мої водойми</b>

                <button id="addWater">
                    ＋
                </button>
            </div>

            <div id="watersItems"></div>

        </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("watersOpen").onclick = () => {
        const list =
            document.getElementById("watersList");

        list.style.display =
            list.style.display === "none"
                ? "block"
                : "none";

        renderWaters();
    };

    document.getElementById("addWater").onclick =
        addWater;
}

function addWater() {
    const name = prompt(
        "🏞 Назва водойми:",
        "Нова водойма"
    );

    if (!name || !name.trim()) return;

    const center = map.getCenter();

    const water = {
        id: Date.now(),
        name: name.trim(),
        lat: center.lat,
        lng: center.lng
    };

    waters.push(water);
    saveWaters();

    currentWaterId = water.id;

    localStorage.setItem(
        CURRENT_WATER_KEY,
        String(currentWaterId)
    );

    filterPoints();

    map.setView(
        [water.lat, water.lng],
        14
    );

    drawPoints();
    drawRelief();
    renderWaters();
}

function renderWaters() {
    const container =
        document.getElementById("watersItems");

    if (!container) return;

    container.innerHTML = "";

    waters.forEach(water => {

        const count = allPoints.filter(
            p => Number(p.waterId) === Number(water.id)
        ).length;

        const item = document.createElement("div");

        item.className = "water-item";

        if (
            Number(water.id) ===
            Number(currentWaterId)
        ) {
            item.classList.add("water-selected");
        }

        item.innerHTML = `
            <div class="water-name">
                🏞️ ${water.name}
            </div>

            <div class="water-info">
                📍 ${Number(water.lat).toFixed(5)},
                ${Number(water.lng).toFixed(5)}
                <br>
                📌 Промірів: ${count}
            </div>

            <button class="water-select">
                ${
                    Number(water.id) ===
                    Number(currentWaterId)
                        ? "✓ Відкрита"
                        : "Відкрити"
                }
            </button>
        `;

        item.querySelector(
            ".water-select"
        ).onclick = () => {
            selectWater(water.id);
        };

        container.appendChild(item);
    });
}

function selectWater(id) {
    currentWaterId = id;

    localStorage.setItem(
        CURRENT_WATER_KEY,
        String(currentWaterId)
    );

    const water = getCurrentWater();

    if (!water) return;

    filterPoints();

    map.setView(
        [water.lat, water.lng],
        14
    );

    drawPoints();
    drawRelief();
    renderWaters();
}


// -----------------------------------------------------
// КАРТКА ВОДОЙМИ
// -----------------------------------------------------

function createWaterCard() {
    if (document.getElementById("fishmap-water-card")) return;

    const card = document.createElement("div");
    card.id = "fishmap-water-card";

    document.body.appendChild(card);

    updateWaterCard();
}

function updateWaterCard() {
    const card = document.getElementById("fishmap-water-card");
    const water = getCurrentWater();

    if (!card || !water) return;

    const depths = points
        .map(p => Number(p.depth))
        .filter(d => Number.isFinite(d));

    const maxDepth = depths.length
        ? Math.max(...depths)
        : null;

    const avgDepth = depths.length
        ? depths.reduce((a,b) => a+b, 0) / depths.length
        : null;

    const bottomCounts = {};

    points.forEach(p => {
        const bottom = String(p.bottom || "—").trim();
        bottomCounts[bottom] = (bottomCounts[bottom] || 0) + 1;
    });

    let mainBottom = "—";

    Object.keys(bottomCounts).forEach(bottom => {
        if (
            mainBottom === "—" ||
            bottomCounts[bottom] > bottomCounts[mainBottom]
        ) {
            mainBottom = bottom;
        }
    });

    card.innerHTML = `
        <div class="water-card-title">
            🏞️ ${escapeHtml(water.name)}
        </div>

        <div class="water-card-row">
            📍 ${Number(water.lat).toFixed(5)},
            ${Number(water.lng).toFixed(5)}
        </div>

        <div class="water-card-grid">
            <div>
                <b>📌 ${points.length}</b>
                <small>промірів</small>
            </div>

            <div>
                <b>${maxDepth === null ? "—" : maxDepth.toFixed(1) + " м"}</b>
                <small>макс. промір</small>
            </div>

            <div>
                <b>${avgDepth === null ? "—" : avgDepth.toFixed(1) + " м"}</b>
                <small>середня</small>
            </div>

            <div>
                <b>🪨 ${escapeHtml(mainBottom)}</b>
                <small>дно</small>
            </div>
        </div>

        <button id="waterCardClose">✕</button>
    `;

    document.getElementById("waterCardClose").onclick = () => {
        card.style.display = "none";
    };
}

// -----------------------------------------------------
// ОНОВЛЕННЯ КАРТКИ ПІСЛЯ ЗМІН
// -----------------------------------------------------

const oldDrawPoints = drawPoints;

drawPoints = function() {
    oldDrawPoints();
    updateWaterCard();
};

const oldSelectWater = selectWater;

selectWater = function(id) {
    oldSelectWater(id);
    const card = document.getElementById("fishmap-water-card");
    if (card) card.style.display = "block";
    updateWaterCard();
};

const oldAddWater = addWater;

addWater = function() {
    oldAddWater();
    const card = document.getElementById("fishmap-water-card");
    if (card) card.style.display = "block";
    updateWaterCard();
};

// -----------------------------------------------------
// СТИЛІ
// -----------------------------------------------------

const style = document.createElement("style");

style.textContent = `
#fishmap-waters-panel {
    position: fixed;
    top: 15px;
    left: 15px;
    z-index: 10000;
    width: 240px;
    background: white;
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 3px 15px rgba(0,0,0,.3);
    font-family: Arial, sans-serif;
}

.fishmap-title {
    font-size: 17px;
    margin-bottom: 8px;
}

#watersOpen {
    width: 100%;
    padding: 9px;
    border: 0;
    border-radius: 8px;
    background: #1976d2;
    color: white;
    font-size: 14px;
    cursor: pointer;
}

.waters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 10px 0 8px;
}

#addWater {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 7px;
    background: #2e7d32;
    color: white;
    font-size: 20px;
    cursor: pointer;
}

.water-item {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 7px;
}

.water-selected {
    border: 2px solid #1976d2;
}

.water-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.water-info {
    font-size: 11px;
    color: #666;
    margin-bottom: 6px;
}

.water-select {
    width: 100%;
    padding: 6px;
    border: 0;
    border-radius: 6px;
    background: #eee;
    cursor: pointer;
}
`;

document.head.appendChild(style);

// -----------------------------------------------------
// ОНОВЛЕННЯ КАРТИ
// -----------------------------------------------------

map.on("move zoom resize", drawRelief);


const waterCardStyle = document.createElement("style");

waterCardStyle.textContent = `
#fishmap-water-card {
    position: fixed;
    right: 15px;
    top: 15px;
    z-index: 10000;
    width: 280px;
    background: rgba(255,255,255,.96);
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 4px 18px rgba(0,0,0,.28);
    font-family: Arial, sans-serif;
}

.water-card-title {
    font-size: 19px;
    font-weight: bold;
    margin-bottom: 5px;
    padding-right: 25px;
}

.water-card-row {
    color: #666;
    font-size: 12px;
    margin-bottom: 12px;
}

.water-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
}

.water-card-grid > div {
    background: #f2f5f8;
    border-radius: 9px;
    padding: 8px;
}

.water-card-grid b {
    display: block;
    font-size: 15px;
}

.water-card-grid small {
    color: #777;
}

#waterCardClose {
    position: absolute;
    right: 8px;
    top: 8px;
    border: 0;
    background: transparent;
    font-size: 17px;
    cursor: pointer;
}
`;

document.head.appendChild(waterCardStyle);

// -----------------------------------------------------
// ЗАПУСК
// -----------------------------------------------------

loadWaters();
loadPoints();

const currentWater = getCurrentWater();

if (currentWater) {
    map.setView(
        [currentWater.lat, currentWater.lng],
        14
    );
}

createWatersPanel();
createWaterCard();
drawPoints();
drawRelief();

console.log("FishMap Pro запущено");

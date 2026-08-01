// =====================================================
// FISHMAP PRO — ПОВНИЙ APP.JS
// Карта + проміри + водойми + рельєф + бровки + аналіз
// =====================================================

const map = L.map("map").setView([48.460, 34.980], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

const POINTS_KEY = "fishmappro_points_v1";
const WATERS_KEY = "fishmappro_waters_v1";
const CURRENT_WATER_KEY = "fishmappro_current_water_v1";

let allPoints = [];
let points = [];
let waters = [];
let currentWaterId = null;
let addMode = false;
let reliefVisible = true;
let markerLayers = [];
let reliefLines = [];

// -----------------------------------------------------
// ДАНІ
// -----------------------------------------------------

function saveAll() {
    localStorage.setItem(POINTS_KEY, JSON.stringify(allPoints));
    localStorage.setItem(WATERS_KEY, JSON.stringify(waters));
    localStorage.setItem(CURRENT_WATER_KEY, String(currentWaterId));
}

function loadAll() {
    try {
        allPoints = JSON.parse(localStorage.getItem(POINTS_KEY) || "[]");
        waters = JSON.parse(localStorage.getItem(WATERS_KEY) || "[]");
    } catch {
        allPoints = [];
        waters = [];
    }

    if (!Array.isArray(allPoints)) allPoints = [];
    if (!Array.isArray(waters)) waters = [];

    if (!waters.length) {
        waters.push({
            id: Date.now(),
            name: "Моя водойма",
            lat: 48.460,
            lng: 34.980
        });
    }

    const savedId = Number(
        localStorage.getItem(CURRENT_WATER_KEY)
    );

    currentWaterId = waters.some(w => Number(w.id) === savedId)
        ? savedId
        : waters[0].id;

    filterPoints();
    saveAll();
}

function filterPoints() {
    points = allPoints.filter(
        p => Number(p.waterId) === Number(currentWaterId)
    );
}

function currentWater() {
    return waters.find(
        w => Number(w.id) === Number(currentWaterId)
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
// МАРКЕРИ
// -----------------------------------------------------

function clearMarkers() {
    markerLayers.forEach(m => map.removeLayer(m));
    markerLayers = [];
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
                fillOpacity: .95
            }
        );

        marker.bindPopup(`
            <b>🎣 FishMap Pro</b><br><br>
            🌊 Глибина: <b>${Number(point.depth).toFixed(1)} м</b><br>
            🪨 Дно: ${escapeHtml(point.bottom || "—")}<br><br>

            <button class="point-analysis-btn"
                data-id="${point.id}">
                🎯 Аналіз точки
            </button>

            <button class="point-delete-btn"
                data-id="${point.id}">
                🗑 Видалити
            </button>
        `);

        marker.on("popupopen", () => {
            const analysis = document.querySelector(
                `.point-analysis-btn[data-id="${point.id}"]`
            );

            const del = document.querySelector(
                `.point-delete-btn[data-id="${point.id}"]`
            );

            if (analysis) {
                analysis.onclick = () => showPointAnalysis(point.id);
            }

            if (del) {
                del.onclick = () => deletePoint(point.id);
            }
        });

        marker.addTo(map);
        markerLayers.push(marker);
    });

    updateWaterCard();
}

function deletePoint(id) {
    if (!confirm("Видалити цей промір?")) return;

    allPoints = allPoints.filter(p => p.id !== id);
    filterPoints();
    saveAll();
    drawPoints();
    drawRelief();
}

// -----------------------------------------------------
// ДОДАВАННЯ ПРОМІРУ
// -----------------------------------------------------

document.getElementById("addPoint").onclick = () => {
    addMode = true;
    alert("🎯 Натисни на карту в місці проміру.");
};

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
        alert("❌ Введи правильну глибину.");
        addMode = false;
        return;
    }

    const bottom = prompt(
        "🪨 Тип дна:",
        "мул"
    ) || "—";

    allPoints.push({
        id: Date.now() + Math.random(),
        waterId: currentWaterId,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        depth,
        bottom
    });

    filterPoints();
    saveAll();
    drawPoints();
    drawRelief();

    addMode = false;
});

// -----------------------------------------------------
// ВОДОЙМИ
// -----------------------------------------------------

document.getElementById("watersOpen").onclick = () => {
    document.getElementById("watersPanel")
        .classList.toggle("hidden");

    renderWaters();
};

document.getElementById("addWater").onclick = () => {
    const name = prompt(
        "🏞️ Назва нової водойми:",
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
    currentWaterId = water.id;

    filterPoints();
    saveAll();

    map.setView([water.lat, water.lng], 14);

    renderWaters();
    drawPoints();
    drawRelief();
};

function renderWaters() {
    const box = document.getElementById("watersItems");
    box.innerHTML = "";

    waters.forEach(water => {
        const count = allPoints.filter(
            p => Number(p.waterId) === Number(water.id)
        ).length;

        const item = document.createElement("div");

        item.className =
            "water-item" +
            (
                Number(water.id) === Number(currentWaterId)
                    ? " selected"
                    : ""
            );

        item.innerHTML = `
            <div class="water-name">
                🏞️ ${escapeHtml(water.name)}
            </div>

            <div class="water-meta">
                📍 ${Number(water.lat).toFixed(5)},
                ${Number(water.lng).toFixed(5)}<br>
                📌 Промірів: ${count}
            </div>

            <button>Відкрити</button>
        `;

        item.querySelector("button").onclick = () => {
            currentWaterId = water.id;
            filterPoints();
            saveAll();

            map.setView(
                [water.lat, water.lng],
                14
            );

            renderWaters();
            drawPoints();
            drawRelief();
        };

        box.appendChild(item);
    });
}

// -----------------------------------------------------
// КАРТКА ВОДОЙМИ
// -----------------------------------------------------

function updateWaterCard() {
    const water = currentWater();
    const card = document.getElementById("waterCard");

    if (!water) {
        card.classList.add("hidden");
        return;
    }

    const depths = points
        .map(p => Number(p.depth))
        .filter(Number.isFinite);

    const max = depths.length ? Math.max(...depths) : null;
    const avg = depths.length
        ? depths.reduce((a,b) => a+b, 0) / depths.length
        : null;

    const bottoms = {};

    points.forEach(p => {
        const b = String(p.bottom || "—");
        bottoms[b] = (bottoms[b] || 0) + 1;
    });

    let mainBottom = "—";

    Object.keys(bottoms).forEach(b => {
        if (
            mainBottom === "—" ||
            bottoms[b] > bottoms[mainBottom]
        ) mainBottom = b;
    });

    card.innerHTML = `
        <div class="card-title">
            🏞️ ${escapeHtml(water.name)}
        </div>

        <div class="card-sub">
            📍 ${Number(water.lat).toFixed(5)},
            ${Number(water.lng).toFixed(5)}
        </div>

        <div class="stats">
            <div class="stat">
                <b>📌 ${points.length}</b>
                <small>промірів</small>
            </div>

            <div class="stat">
                <b>${max === null ? "—" : max.toFixed(1) + " м"}</b>
                <small>максимум</small>
            </div>

            <div class="stat">
                <b>${avg === null ? "—" : avg.toFixed(1) + " м"}</b>
                <small>середня</small>
            </div>

            <div class="stat">
                <b>🪨 ${escapeHtml(mainBottom)}</b>
                <small>основне дно</small>
            </div>
        </div>
    `;

    card.classList.remove("hidden");
}

// -----------------------------------------------------
// РЕЛЬЄФ — ІНТЕРПОЛЯЦІЯ
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
    ctx.clearRect(0, 0, size.x, size.y);

    if (!reliefVisible || points.length < 3) {
        drawDepthLines();
        return;
    }

    const pix = points.map(p =>
        map.latLngToContainerPoint([
            Number(p.lat),
            Number(p.lng)
        ])
    );

    let minX = Math.min(...pix.map(p => p.x)) - 100;
    let maxX = Math.max(...pix.map(p => p.x)) + 100;
    let minY = Math.min(...pix.map(p => p.y)) - 100;
    let maxY = Math.max(...pix.map(p => p.y)) + 100;

    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(size.x, maxX);
    maxY = Math.min(size.y, maxY);

    const step = 18;

    ctx.globalAlpha = .20;

    for (let y = minY; y <= maxY; y += step) {
        for (let x = minX; x <= maxX; x += step) {
            let sum = 0;
            let weights = 0;

            points.forEach(point => {
                const p = map.latLngToContainerPoint([
                    Number(point.lat),
                    Number(point.lng)
                ]);

                const d = Math.hypot(
                    x - p.x,
                    y - p.y
                );

                if (d > 500) return;

                const w = 1 / Math.max(d * d, 1);

                sum += Number(point.depth) * w;
                weights += w;
            });

            if (!weights) continue;

            ctx.fillStyle = depthColor(
                sum / weights
            );

            ctx.fillRect(x, y, step + 1, step + 1);
        }
    }

    ctx.globalAlpha = 1;

    drawDepthLines();
}

// -----------------------------------------------------
// БРОВКИ / ЗВАЛИ
// -----------------------------------------------------

function clearReliefLines() {
    reliefLines.forEach(line => map.removeLayer(line));
    reliefLines = [];
}

function drawDepthLines() {
    clearReliefLines();

    if (!reliefVisible || points.length < 2) return;

    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const a = points[i];
            const b = points[j];

            const distance = map.distance(
                [Number(a.lat), Number(a.lng)],
                [Number(b.lat), Number(b.lng)]
            );

            if (distance > 250) continue;

            const da = Number(a.depth);
            const db = Number(b.depth);
            const diff = Math.abs(da - db);

            if (!Number.isFinite(da) ||
                !Number.isFinite(db)) continue;

            if (diff < .3) continue;

            const color =
                diff >= 2 ? "#d32f2f" :
                diff >= 1 ? "#f57c00" :
                "#42a5f5";

            const weight =
                diff >= 2 ? 5 :
                diff >= 1 ? 3 :
                2;

            const line = L.polyline(
                [
                    [Number(a.lat), Number(a.lng)],
                    [Number(b.lat), Number(b.lng)]
                ],
                {
                    color,
                    weight,
                    opacity: .82
                }
            );

            line.bindPopup(`
                <b>📐 Перепад глибини</b><br><br>
                ${da.toFixed(1)} м → ${db.toFixed(1)} м<br>
                Перепад: <b>${diff.toFixed(1)} м</b><br>
                Відстань: ${Math.round(distance)} м<br><br>
                ${
                    diff >= 2
                        ? "🔥 Сильний звал"
                        : "🎯 Бровка / перепад"
                }
            `);

            line.addTo(map);
            reliefLines.push(line);
        }
    }
}

document.getElementById("toggleRelief").onclick = () => {
    reliefVisible = !reliefVisible;

    document.getElementById("toggleRelief").textContent =
        reliefVisible
            ? "📐 Бровки: ON"
            : "📐 Бровки: OFF";

    drawRelief();
};

// -----------------------------------------------------
// АНАЛІЗ ТОЧКИ
// -----------------------------------------------------

function analyzePoint(point) {
    const depth = Number(point.depth);
    const bottom = String(point.bottom || "").toLowerCase();

    let score = 50;

    if (depth >= 2 && depth <= 6) score += 15;
    else if (depth > 6 && depth <= 12) score += 10;
    else if (depth < 1) score -= 10;

    if (
        bottom.includes("мул") ||
        bottom.includes("глина")
    ) score += 5;

    if (
        bottom.includes("череп") ||
        bottom.includes("кам")
    ) score += 8;

    let maxDiff = 0;

    points
        .filter(p => p.id !== point.id)
        .forEach(p => {
            const d = map.distance(
                [Number(point.lat), Number(point.lng)],
                [Number(p.lat), Number(p.lng)]
            );

            if (d <= 150) {
                maxDiff = Math.max(
                    maxDiff,
                    Math.abs(Number(p.depth) - depth)
                );
            }
        });

    if (maxDiff >= 2) score += 20;
    else if (maxDiff >= 1) score += 10;

    score = Math.max(0, Math.min(100, score));

    let verdict;

    if (score >= 80) verdict = "🔥 Дуже перспективна";
    else if (score >= 65) verdict = "🎯 Перспективна";
    else if (score >= 50) verdict = "🟡 Нормальна";
    else verdict = "⚠️ Слабка";

    let popup = depth >= 5
        ? "Яскравий поп-ап 10–12 мм"
        : "Поп-ап 8–10 мм";

    if (bottom.includes("мул")) {
        popup = "Плаваючий поп-ап 8–10 мм";
    }

    const fish = ["🐟 Короп", "🐟 Карась"];

    if (depth >= 3) fish.push("🐟 Товстолоб");
    if (bottom.includes("мул") || bottom.includes("глина")) {
        fish.push("🐟 Плотва");
    }

    return {
        score,
        verdict,
        maxDiff,
        fish,
        popup,
        boil: depth >= 5 ? "Бойл 10–12 мм" : "Бойл 8–10 мм"
    };
}

function showPointAnalysis(id) {
    const point = allPoints.find(p => p.id === id);
    if (!point) return;

    const result = analyzePoint(point);
    const card = document.getElementById("analysisCard");

    card.innerHTML = `
        <b>🎯 Аналіз точки</b>

        <div class="analysis-score">
            ${result.verdict}
            <span>${result.score}/100</span>
        </div>

        🌊 Глибина:
        <b>${Number(point.depth).toFixed(1)} м</b><br>

        🪨 Дно:
        <b>${escapeHtml(point.bottom || "—")}</b><br><br>

        📐 Найбільший перепад поруч:
        <b>${result.maxDiff.toFixed(1)} м</b><br><br>

        🐟 Можлива риба:<br>
        ${result.fish.join("<br>")}<br><br>

        🟡 Поп-ап:<br>
        <b>${result.popup}</b><br><br>

        🟤 Бойл:<br>
        <b>${result.boil}</b>

        <button class="action-button"
            id="closeAnalysis">
            Закрити
        </button>
    `;

    card.classList.remove("hidden");

    document.getElementById("closeAnalysis").onclick =
        () => card.classList.add("hidden");
}


// -----------------------------------------------------
// АВТОПОШУК НАЙПЕРСПЕКТИВНІШИХ ТОЧОК ДЛЯ ФЛЕТУ
// -----------------------------------------------------

function flatPointScore(point) {
    const result = analyzePoint(point);
    const depth = Number(point.depth);
    let score = result.score;

    if (depth >= 2 && depth <= 6) score += 8;
    if (depth >= 6 && depth <= 10) score += 4;

    if (result.maxDiff >= 2) score += 12;
    else if (result.maxDiff >= 1) score += 6;

    if (depth < 0.8) score -= 15;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function getBestFlatPoints() {
    return points
        .filter(p => Number.isFinite(Number(p.depth)))
        .map(point => ({
            point,
            score: flatPointScore(point)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

function showBestFlatPoints() {
    const card = document.getElementById("bestCard");

    if (!points.length) {
        card.innerHTML = `
            <b>🎯 Найкраща точка для флету</b>
            <p>Спочатку додай хоча б один промір глибини.</p>
            <button class="action-button" id="closeBest">Закрити</button>
        `;
        card.classList.remove("hidden");
        document.getElementById("closeBest").onclick =
            () => card.classList.add("hidden");
        return;
    }

    const best = getBestFlatPoints();

    card.innerHTML = `
        <b>🎯 Найперспективніші точки для флету</b>
        <div class="card-sub">
            Рейтинг враховує глибину, дно та перепади поруч.
        </div>
    `;

    best.forEach((item, index) => {
        const p = item.point;
        const result = analyzePoint(p);
        const div = document.createElement("div");

        div.className = "best-item";
        div.innerHTML = `
            <b>№${index + 1} — ${item.score}/100</b><br>
            🌊 ${Number(p.depth).toFixed(1)} м ·
            🪨 ${escapeHtml(p.bottom || "—")}<br>
            📐 Перепад поруч: ${result.maxDiff.toFixed(1)} м<br>
            <small>${result.verdict}</small>
            <button>📍 Перейти до точки</button>
            <button>🎣 Аналіз</button>
        `;

        const buttons = div.querySelectorAll("button");

        buttons[0].onclick = () => {
            map.setView(
                [Number(p.lat), Number(p.lng)],
                Math.max(map.getZoom(), 15)
            );
        };

        buttons[1].onclick = () => showPointAnalysis(p.id);

        card.appendChild(div);
    });

    const close = document.createElement("button");
    close.className = "action-button";
    close.textContent = "Закрити";
    close.onclick = () => card.classList.add("hidden");
    card.appendChild(close);

    card.classList.remove("hidden");
}

document.getElementById("findBest").onclick = showBestFlatPoints;

// -----------------------------------------------------
// ДОПОМІЖНЕ
// -----------------------------------------------------

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

map.on("move zoom resize", drawRelief);

// -----------------------------------------------------
// ЗАПУСК
// -----------------------------------------------------

loadAll();

const water = currentWater();

if (water) {
    map.setView(
        [Number(water.lat), Number(water.lng)],
        14
    );
}

renderWaters();
drawPoints();
drawRelief();

console.log("FishMap Pro готовий.");

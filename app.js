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
// ПІДБІР НАСАДКИ / ПРИКОРМКИ ПІД РИБУ
// -----------------------------------------------------

const fishProfiles = {
    carp: {
        name: "Короп",
        baits: ["Кукурудза", "Волосяний монтаж + бойл", "Пелетс", "Поп-ап"],
        popups: ["Солодкий жовтий", "Ананс", "Слива", "Крем"],
        boilies: ["10–12 мм", "14–16 мм"],
        feed: ["Пелетс 2–4 мм", "Мікс бойлів", "Кукурудза", "Флет-метод мікс"],
        preferredDepth: [2, 8]
    },
    crucian: {
        name: "Карась",
        baits: ["Опариш", "Черв'як", "Кукурудза", "Міні-попап"],
        popups: ["Ваніль", "Мед", "Кукурудза"],
        boilies: ["8–10 мм"],
        feed: ["Дрібний пелетс", "Мелений бойл", "Кукурудза", "Метод-мікс"],
        preferredDepth: [1, 5]
    },
    silverCarp: {
        name: "Товстолоб",
        baits: ["Технопланктон", "Плаваюча насадка"],
        popups: ["Яскравий поп-ап"],
        boilies: ["8–10 мм як супровід"],
        feed: ["Технопланктон", "Дрібна кормова суміш"],
        preferredDepth: [1.5, 7]
    },
    roach: {
        name: "Плотва",
        baits: ["Опариш", "Черв'як", "Перловка", "Маленька кукурудза"],
        popups: ["Міні-попап"],
        boilies: ["6–8 мм"],
        feed: ["Дрібний пелетс", "Сухарі", "Дрібна фракція"],
        preferredDepth: [1, 6]
    }
};

function makeFishPlan(fishKey, pointId) {
    const fish = fishProfiles[fishKey];
    const point = points.find(p => p.id === pointId);

    if (!fish || !point) return null;

    const depth = Number(point.depth);
    const bottom = String(point.bottom || "").toLowerCase();

    let score = 50;

    if (
        depth >= fish.preferredDepth[0] &&
        depth <= fish.preferredDepth[1]
    ) score += 25;

    if (bottom.includes("мул")) score += 5;
    if (bottom.includes("глина")) score += 4;
    if (bottom.includes("череп")) score += 6;

    const nearby = points
        .filter(p => p.id !== point.id)
        .map(p => ({
            p,
            d: map.distance(
                [Number(point.lat), Number(point.lng)],
                [Number(p.lat), Number(p.lng)]
            )
        }))
        .filter(x => x.d <= 150);

    if (nearby.some(x =>
        Math.abs(Number(x.p.depth) - depth) >= 1
    )) score += 10;

    score = Math.max(0, Math.min(100, score));

    let verdict =
        score >= 80 ? "🔥 Дуже хороший варіант" :
        score >= 65 ? "🎯 Перспективний варіант" :
        score >= 50 ? "🟡 Можна пробувати" :
        "⚠️ Не найкращий варіант";

    return {
        score,
        verdict,
        fish,
        point,
        bait: fish.baits[0],
        popup: fish.popups[0],
        boilie: fish.boilies[0],
        feed: fish.feed[0]
    };
}

function openFishPlan() {
    const panel = document.getElementById("fishPlan");

    panel.innerHTML = `
        <b>🐟 Підбір насадки для конкретної точки</b>

        <select id="fishSelect">
            ${Object.entries(fishProfiles).map(([key, fish]) =>
                `<option value="${key}">${fish.name}</option>`
            ).join("")}
        </select>

        <select id="fishPointSelect">
            ${
                points.length
                    ? points.map((p, i) =>
                        `<option value="${p.id}">
                            Точка ${i + 1} — ${Number(p.depth).toFixed(1)} м
                        </option>`
                    ).join("")
                    : `<option value="">Немає промірів</option>`
            }
        </select>

        <button id="makeFishPlan">🎣 Підібрати</button>

        <div id="fishResult"></div>

        <button id="closeFishPlan">Закрити</button>
    `;

    panel.classList.remove("hidden");

    document.getElementById("makeFishPlan").onclick = () => {
        const fishKey = document.getElementById("fishSelect").value;
        const pointId = Number(document.getElementById("fishPointSelect").value);
        const result = makeFishPlan(fishKey, pointId);
        const box = document.getElementById("fishResult");

        if (!result) {
            box.innerHTML = `<div class="fish-result">Спочатку додай промір.</div>`;
            return;
        }

        box.innerHTML = `
            <div class="fish-result">
                <b>${result.fish.name}</b><br>
                Рейтинг: <b>${result.score}/100</b><br>
                ${result.verdict}<br><br>

                🌊 Глибина: ${Number(result.point.depth).toFixed(1)} м<br>
                🪨 Дно: ${escapeHtml(result.point.bottom || "—")}<br><br>

                🟡 Насадка: <b>${result.bait}</b><br>
                🟠 Поп-ап: <b>${result.popup}</b><br>
                🟤 Бойл: <b>${result.boilie}</b><br>
                🥣 Корм: <b>${result.feed}</b>
            </div>
        `;
    };

    document.getElementById("closeFishPlan").onclick =
        () => panel.classList.add("hidden");
}

document.getElementById("fishPlanOpen").onclick = openFishPlan;


// -----------------------------------------------------
// ПОГОДА ДЛЯ АКТИВНОЇ ВОДОЙМИ
// -----------------------------------------------------

let lastWeatherData = null;

function weatherDescription(code) {
    const c = Number(code);

    if (c === 0) return "☀️ Ясно";
    if ([1, 2, 3].includes(c)) return "⛅ Хмарність";
    if ([45, 48].includes(c)) return "🌫️ Туман";
    if ([51, 53, 55, 56, 57].includes(c)) return "🌦️ Мряка";
    if ([61, 63, 65, 66, 67].includes(c)) return "🌧️ Дощ";
    if ([71, 73, 75, 77].includes(c)) return "🌨️ Сніг";
    if ([80, 81, 82].includes(c)) return "🌧️ Зливи";
    if ([95, 96, 99].includes(c)) return "⛈️ Гроза";

    return "🌤️ Змішані умови";
}

function fishingWeatherScore(current, hourly) {
    let score = 50;

    const temp = Number(current.temperature_2m);
    const pressure = Number(current.pressure_msl);
    const wind = Number(current.wind_speed_10m);
    const rain = Number(current.precipitation);

    // Це орієнтовний індекс, а не прогноз кльову.
    if (temp >= 12 && temp <= 26) score += 12;
    if (wind >= 5 && wind <= 22) score += 8;
    if (wind > 35) score -= 12;
    if (rain > 0 && rain <= 3) score += 3;

    // Тренд тиску за найближчі ~6 годин.
    if (hourly && hourly.pressure_msl && hourly.pressure_msl.length > 6) {
        const p0 = Number(hourly.pressure_msl[0]);
        const p6 = Number(hourly.pressure_msl[6]);
        const change = p6 - p0;

        if (Math.abs(change) <= 2) score += 7;
        else if (Math.abs(change) >= 7) score -= 5;
    }

    // Нормалізуємо.
    return Math.max(0, Math.min(100, Math.round(score)));
}

function weatherAdvice(score, current) {
    const wind = Number(current.wind_speed_10m);
    const rain = Number(current.precipitation);

    if (wind > 35) {
        return "⚠️ Сильний вітер. Перевір точність закидання та не роби висновок про кльов лише за погодою.";
    }

    if (rain > 3) {
        return "🌧️ Помітні опади. Варто перевірити захищену точку та не перевантажувати флет кормом.";
    }

    if (score >= 75) {
        return "🔥 Умови виглядають сприятливо за цим простим індексом. Порівняй мілку та глибшу точку.";
    }

    if (score >= 60) {
        return "🎯 Нормальні умови. Має сенс почати з точки з вираженою бровкою.";
    }

    return "🟡 Умови неоднозначні. Краще мати запасну точку та перевіряти рибу на різних горизонтах.";
}

async function loadWeather() {
    const panel = document.getElementById("weatherPanel");
    const water = currentWater();

    if (!water) return;

    panel.innerHTML = `
        <b>🌦️ Погода — ${escapeHtml(water.name)}</b>
        <p>Завантаження...</p>
    `;
    panel.classList.remove("hidden");

    const lat = Number(water.lat);
    const lon = Number(water.lng);

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        forecast_days: "2",
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "pressure_msl",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ].join(","),
        hourly: [
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "pressure_msl",
            "wind_speed_10m",
            "weather_code"
        ].join(",")
    });

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();
        lastWeatherData = data;

        const current = data.current;
        const hourly = data.hourly;
        const score = fishingWeatherScore(current, hourly);

        const rows = [];

        for (let i = 0; i < Math.min(8, hourly.time.length); i++) {
            const time = new Date(hourly.time[i]);

            rows.push(`
                <div class="weather-hour">
                    <b>${time.toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit"
                    })}</b>
                    —
                    ${Number(hourly.temperature_2m[i]).toFixed(0)}°C,
                    ${weatherDescription(hourly.weather_code[i])},
                    вітер ${Number(hourly.wind_speed_10m[i]).toFixed(0)} км/год
                </div>
            `);
        }

        panel.innerHTML = `
            <b>🌦️ Погода — ${escapeHtml(water.name)}</b>

            <div class="weather-grid">
                <div class="weather-item">
                    <b>${Number(current.temperature_2m).toFixed(1)}°C</b>
                    <small>температура</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.apparent_temperature).toFixed(1)}°C</b>
                    <small>відчувається</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.pressure_msl).toFixed(0)} hPa</b>
                    <small>тиск</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.relative_humidity_2m).toFixed(0)}%</b>
                    <small>вологість</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.wind_speed_10m).toFixed(0)} км/год</b>
                    <small>вітер</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.wind_gusts_10m).toFixed(0)} км/год</b>
                    <small>пориви</small>
                </div>

                <div class="weather-item">
                    <b>${Number(current.precipitation).toFixed(1)} мм</b>
                    <small>опади</small>
                </div>

                <div class="weather-item">
                    <b>${weatherDescription(current.weather_code)}</b>
                    <small>стан</small>
                </div>
            </div>

            <div class="weather-advice">
                <b>🎣 Орієнтовний погодний індекс: ${score}/100</b><br>
                ${weatherAdvice(score, current)}
                <br><br>
                <small>
                    Індекс є допоміжною оцінкою умов, а не гарантією кльову.
                </small>
            </div>

            <b>⏱️ Найближчі години</b>
            ${rows.join("")}

            <button id="weatherRefresh">🔄 Оновити</button>
            <button id="weatherClose">Закрити</button>
        `;

        document.getElementById("weatherRefresh").onclick = loadWeather;
        document.getElementById("weatherClose").onclick =
            () => panel.classList.add("hidden");

    } catch (error) {
        panel.innerHTML = `
            <b>🌦️ Погода</b>
            <p>❌ Не вдалося завантажити погоду.</p>
            <small>${escapeHtml(error.message)}</small>
            <button id="weatherRetry">🔄 Спробувати ще раз</button>
            <button id="weatherClose">Закрити</button>
        `;

        document.getElementById("weatherRetry").onclick = loadWeather;
        document.getElementById("weatherClose").onclick =
            () => panel.classList.add("hidden");
    }
}

document.getElementById("weatherOpen").onclick = loadWeather;


// -----------------------------------------------------
// ЖУРНАЛ РИБАЛКИ
// -----------------------------------------------------

const JOURNAL_KEY = "fishmappro_journal_v1";
let journalEntries = [];

function loadJournal() {
    try {
        journalEntries = JSON.parse(
            localStorage.getItem(JOURNAL_KEY) || "[]"
        );
    } catch {
        journalEntries = [];
    }

    if (!Array.isArray(journalEntries)) journalEntries = [];
}

function saveJournal() {
    localStorage.setItem(
        JOURNAL_KEY,
        JSON.stringify(journalEntries)
    );
}

function journalDate(value) {
    if (!value) return "—";

    const d = new Date(value + "T12:00:00");

    return d.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function openJournal() {
    renderJournal();
    document.getElementById("journalPanel")
        .classList.remove("hidden");
}

function renderJournal() {
    const panel = document.getElementById("journalPanel");
    const water = currentWater();

    const waterEntries = journalEntries.filter(
        e => Number(e.waterId) === Number(currentWaterId)
    );

    const totalWeight = waterEntries.reduce(
        (sum, e) => sum + (Number(e.weight) || 0),
        0
    );

    const fishCount = waterEntries.reduce(
        (sum, e) => sum + (Number(e.count) || 0),
        0
    );

    panel.innerHTML = `
        <b>📖 Журнал рибалки</b>

        <div class="journal-stats">
            <div class="journal-stat">
                <b>${waterEntries.length}</b>
                <small>виїздів</small>
            </div>
            <div class="journal-stat">
                <b>${fishCount}</b>
                <small>риб</small>
            </div>
            <div class="journal-stat">
                <b>${totalWeight.toFixed(1)} кг</b>
                <small>загальна вага</small>
            </div>
            <div class="journal-stat">
                <b>${waterEntries.length
                    ? (totalWeight / waterEntries.length).toFixed(1)
                    : "0.0"} кг</b>
                <small>середня вага/виїзд</small>
            </div>
        </div>

        <div class="journal-form">
            <input id="journalDate" type="date"
                value="${new Date().toISOString().slice(0, 10)}">

            <select id="journalPoint">
                <option value="">Точка не вибрана</option>
                ${points.map((p, i) => `
                    <option value="${p.id}">
                        Точка ${i + 1} — ${Number(p.depth).toFixed(1)} м
                    </option>
                `).join("")}
            </select>

            <select id="journalFish">
                <option>Короп</option>
                <option>Карась</option>
                <option>Товстолоб</option>
                <option>Плотва</option>
                <option>Інша риба</option>
            </select>

            <input id="journalCount" type="number"
                min="0" step="1" placeholder="Кількість риб">

            <input id="journalWeight" type="number"
                min="0" step="0.1" placeholder="Загальна вага, кг">

            <input id="journalBait"
                placeholder="Насадка / поп-ап / бойл">

            <textarea id="journalNotes"
                placeholder="Нотатки: погода, час, дистанція, корм..."></textarea>

            <button id="journalAdd">➕ Зберегти результат</button>
        </div>

        <div id="journalEntries"></div>

        <button id="journalClose">Закрити</button>
    `;

    const entriesBox = document.getElementById("journalEntries");

    if (!waterEntries.length) {
        entriesBox.innerHTML =
            `<p>Поки немає записів для цієї водойми.</p>`;
    } else {
        waterEntries
            .slice()
            .reverse()
            .forEach(entry => {
                const div = document.createElement("div");
                div.className = "journal-entry";

                div.innerHTML = `
                    <div class="journal-entry-title">
                        🎣 ${escapeHtml(entry.fish)}
                    </div>

                    <small>
                        ${journalDate(entry.date)}
                        · ${Number(entry.count) || 0} риб
                        · ${(Number(entry.weight) || 0).toFixed(1)} кг
                    </small><br>

                    🌊 Точка:
                    ${entry.pointDepth
                        ? Number(entry.pointDepth).toFixed(1) + " м"
                        : "—"}<br>

                    🟡 Насадка:
                    ${escapeHtml(entry.bait || "—")}<br>

                    📝 ${escapeHtml(entry.notes || "Без нотаток")}

                    <button data-delete-journal="${entry.id}">
                        🗑 Видалити
                    </button>
                `;

                entriesBox.appendChild(div);
            });
    }

    document.getElementById("journalAdd").onclick =
        addJournalEntry;

    document.getElementById("journalClose").onclick =
        () => document.getElementById("journalPanel")
            .classList.add("hidden");

    entriesBox.querySelectorAll(
        "[data-delete-journal]"
    ).forEach(button => {
        button.onclick = () => {
            const id = Number(button.dataset.deleteJournal);

            journalEntries = journalEntries.filter(
                e => Number(e.id) !== id
            );

            saveJournal();
            renderJournal();
        };
    });
}

function addJournalEntry() {
    const pointId = Number(
        document.getElementById("journalPoint").value
    );

    const point = points.find(
        p => Number(p.id) === pointId
    );

    journalEntries.push({
        id: Date.now() + Math.random(),
        waterId: currentWaterId,
        date: document.getElementById("journalDate").value,
        fish: document.getElementById("journalFish").value,
        count: Number(
            document.getElementById("journalCount").value
        ) || 0,
        weight: Number(
            document.getElementById("journalWeight").value
        ) || 0,
        bait: document.getElementById("journalBait").value,
        notes: document.getElementById("journalNotes").value,
        pointId: point ? point.id : null,
        pointDepth: point ? Number(point.depth) : null
    });

    saveJournal();
    renderJournal();
}

document.getElementById("journalOpen").onclick =
    openJournal;


// -----------------------------------------------------
// РЕЗЕРВНА КОПІЯ / ПЕРЕНЕСЕННЯ ДАНИХ
// -----------------------------------------------------

function collectFishMapData() {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        waters: waters,
        points: points,
        journal: journalEntries
    };
}

function downloadBackup() {
    const data = collectFishMapData();

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download =
        "FishMapPro_backup_" +
        new Date().toISOString().slice(0, 10) +
        ".json";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

function importBackup(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            if (
                !data ||
                !Array.isArray(data.waters) ||
                !Array.isArray(data.points) ||
                !Array.isArray(data.journal)
            ) {
                throw new Error("Це не резервна копія FishMap Pro.");
            }

            if (!confirm(
                "Імпорт замінить поточні локальні дані. Продовжити?"
            )) return;

            waters = data.waters;
            points = data.points;
            journalEntries = data.journal;

            saveWaters();
            savePoints();
            saveJournal();

            renderWaters();
            renderPoints();
            drawRelief();

            alert(
                "Готово! Дані FishMap Pro відновлено."
            );

            document.getElementById("backupPanel")
                .classList.add("hidden");

        } catch (error) {
            alert(
                "Помилка імпорту: " + error.message
            );
        }
    };

    reader.readAsText(file);
}

function openBackupPanel() {
    const panel = document.getElementById("backupPanel");

    panel.innerHTML = `
        <b>💾 Дані FishMap Pro</b>

        <div class="backup-info">
            Тут можна зробити резервну копію всіх
            водойм, точок, промірів і журналу.
            <br><br>
            Файл можна перенести на інший телефон
            і відновити дані там.
        </div>

        <button id="backupDownload">
            ⬇️ Створити резервну копію
        </button>

        <input
            id="backupFile"
            type="file"
            accept=".json,application/json"
        >

        <button id="backupClose">
            Закрити
        </button>
    `;

    panel.classList.remove("hidden");

    document.getElementById("backupDownload").onclick =
        downloadBackup;

    document.getElementById("backupFile").onchange =
        event => importBackup(event.target.files[0]);

    document.getElementById("backupClose").onclick =
        () => panel.classList.add("hidden");
}

document.getElementById("backupOpen").onclick =
    openBackupPanel;


// -----------------------------------------------------
// ☁️ SUPABASE СИНХРОНІЗАЦІЯ
// -----------------------------------------------------
// Для роботи потрібні URL проєкту та anon key Supabase.
// Дані зберігаються в таблиці fishmap_data.
// Ця версія не містить жодних чужих ключів.

const CLOUD_CONFIG_KEY = "fishmappro_cloud_config_v1";

function getCloudConfig() {
    try {
        return JSON.parse(
            localStorage.getItem(CLOUD_CONFIG_KEY) || "{}"
        );
    } catch {
        return {};
    }
}

function saveCloudConfig(config) {
    localStorage.setItem(
        CLOUD_CONFIG_KEY,
        JSON.stringify(config)
    );
}

function cloudHeaders(key) {
    return {
        "apikey": key,
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
}

async function cloudPush() {
    const cfg = getCloudConfig();
    if (!cfg.url || !cfg.key) {
        throw new Error("Спочатку введи Supabase URL та anon key.");
    }

    const payload = {
        device_id: getDeviceId(),
        data: collectFishMapData(),
        updated_at: new Date().toISOString()
    };

    const response = await fetch(
        cfg.url.replace(/\/$/, "") +
        "/rest/v1/fishmap_data?on_conflict=device_id",
        {
            method: "POST",
            headers: {
                ...cloudHeaders(cfg.key),
                "Prefer": "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(payload)
        }
    );

    if (!response.ok) {
        throw new Error(
            "Cloud push: HTTP " + response.status +
            " — " + await response.text()
        );
    }
}

async function cloudPull() {
    const cfg = getCloudConfig();
    if (!cfg.url || !cfg.key) {
        throw new Error("Спочатку введи Supabase URL та anon key.");
    }

    const response = await fetch(
        cfg.url.replace(/\/$/, "") +
        "/rest/v1/fishmap_data?device_id=eq." +
        encodeURIComponent(getDeviceId()) +
        "&select=data,updated_at",
        {
            method: "GET",
            headers: cloudHeaders(cfg.key)
        }
    );

    if (!response.ok) {
        throw new Error(
            "Cloud pull: HTTP " + response.status +
            " — " + await response.text()
        );
    }

    const rows = await response.json();

    if (!rows.length) {
        throw new Error(
            "У хмарі ще немає даних для цього пристрою."
        );
    }

    const data = rows[0].data;

    if (
        !data ||
        !Array.isArray(data.waters) ||
        !Array.isArray(data.points) ||
        !Array.isArray(data.journal)
    ) {
        throw new Error("Хмарні дані мають неправильний формат.");
    }

    if (!confirm(
        "Завантаження з хмари замінить локальні дані. Продовжити?"
    )) return;

    waters = data.waters;
    points = data.points;
    journalEntries = data.journal;

    saveWaters();
    savePoints();
    saveJournal();

    renderWaters();
    renderPoints();
    drawRelief();

    alert("☁️ Дані завантажено.");
}

function getDeviceId() {
    const key = "fishmappro_device_id";

    let id = localStorage.getItem(key);

    if (!id) {
        id = "device_" +
            Date.now().toString(36) + "_" +
            Math.random().toString(36).slice(2);

        localStorage.setItem(key, id);
    }

    return id;
}

function openCloudPanel() {
    const panel = document.getElementById("cloudPanel");
    const cfg = getCloudConfig();

    panel.innerHTML = `
        <b>☁️ Синхронізація FishMap Pro</b>

        <div class="cloud-status">
            Цей модуль підготовлений для справжньої
            синхронізації через Supabase.
            <br><br>
            Дані одного й того самого акаунта/ідентифікатора
            можна буде завантажувати на іншому пристрої.
        </div>

        <input id="cloudUrl"
            placeholder="Supabase Project URL"
            value="${escapeHtml(cfg.url || "")}">

        <input id="cloudKey"
            type="password"
            placeholder="Supabase anon key"
            value="${escapeHtml(cfg.key || "")}">

        <button id="cloudSave">💾 Зберегти налаштування</button>
        <button id="cloudPush">☁️ Відправити дані в хмару</button>
        <button id="cloudPull">⬇️ Завантажити з хмари</button>

        <div class="cloud-status">
            ID цього пристрою:<br>
            <small>${escapeHtml(getDeviceId())}</small>
        </div>

        <button id="cloudClose">Закрити</button>
    `;

    panel.classList.remove("hidden");

    document.getElementById("cloudSave").onclick = () => {
        saveCloudConfig({
            url: document.getElementById("cloudUrl").value.trim(),
            key: document.getElementById("cloudKey").value.trim()
        });
        alert("Налаштування збережено.");
    };

    document.getElementById("cloudPush").onclick = async () => {
        try {
            await cloudPush();
            alert("☁️ Дані відправлено в хмару.");
        } catch (e) {
            alert("❌ " + e.message);
        }
    };

    document.getElementById("cloudPull").onclick = async () => {
        try {
            await cloudPull();
        } catch (e) {
            alert("❌ " + e.message);
        }
    };

    document.getElementById("cloudClose").onclick =
        () => panel.classList.add("hidden");
}

document.getElementById("cloudOpen").onclick =
    openCloudPanel;

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

loadJournal();
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

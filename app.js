const map = L.map('map').setView([48.460, 34.980], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let addMode = false;

const STORAGE_KEY = "fishmappro_points";

// Максимальна відстань між промірами,
// які програма буде з'єднувати
const MAX_DISTANCE_METERS = 180;

// Перепад, після якого вважаємо місце
// потенційною бровкою
const BROW_THRESHOLD = 1.0;


// ======================================
// КОЛІР ГЛИБИНИ
// ======================================

function getDepthColor(depth) {

    depth = Number(depth);

    if (depth < 2) return "#ff0000";
    if (depth < 3) return "#ff7a00";
    if (depth < 4) return "#ffd000";
    if (depth < 6) return "#00a83b";

    return "#0066ff";
}


// ======================================
// БЕЗПЕЧНИЙ ТЕКСТ
// ======================================

function safeText(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================
// ВІДСТАНЬ МІЖ ДВОМА ТОЧКАМИ
// ======================================

function distanceMeters(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;

    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) *
        Math.cos(p2) *
        Math.sin(dl / 2) *
        Math.sin(dl / 2);

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return R * c;
}


// ======================================
// ШАРИ КАРТИ
// ======================================

const depthLayer = L.layerGroup().addTo(map);

const browLayer = L.layerGroup().addTo(map);


// ======================================
// СТВОРЕННЯ ТОЧКИ
// ======================================

function createMarker(point) {

    const color = getDepthColor(point.depth);

    const marker = L.circleMarker(
        [point.lat, point.lng],
        {
            radius: 11,
            color: "#ffffff",
            weight: 3,
            fillColor: color,
            fillOpacity: 1
        }
    ).addTo(depthLayer);

    const popup = `
        <div style="min-width:220px">

            <h3>🎣 FishMap Pro</h3>

            <b>🌊 Глибина:</b>
            ${safeText(point.depth)} м
            <br>

            <b>🪨 Дно:</b>
            ${safeText(point.bottom)}
            <br>

            <b>🎣 Наживка:</b>
            ${safeText(point.bait)}
            <br>

            <b>🐟 Риба:</b>
            ${safeText(point.fish)}
            <br>

            <b>⭐ Оцінка:</b>
            ${safeText(point.rating)}/5
            <br>

            <b>📍 Координати:</b>
            ${Number(point.lat).toFixed(6)},
            ${Number(point.lng).toFixed(6)}
            <br>

            <b>📝 Примітка:</b>
            ${safeText(point.note)}

        </div>
    `;

    marker.bindPopup(popup);
}


// ======================================
// ПРОМАЛЬОВУВАННЯ БРОВОК
// ======================================

function drawBottomRelief(points) {

    browLayer.clearLayers();

    if (points.length < 2) return;


    const connections = [];


    // Знаходимо близькі проміри
    for (let i = 0; i < points.length; i++) {

        for (let j = i + 1; j < points.length; j++) {

            const a = points[i];
            const b = points[j];

            const distance = distanceMeters(
                a.lat,
                a.lng,
                b.lat,
                b.lng
            );

            if (distance > MAX_DISTANCE_METERS) {
                continue;
            }


            const depthA = Number(a.depth);
            const depthB = Number(b.depth);

            const difference = Math.abs(
                depthA - depthB
            );


            connections.push({
                a,
                b,
                distance,
                difference
            });

        }
    }


    // Малюємо перепади
    connections.forEach(connection => {

        const a = connection.a;
        const b = connection.b;

        const difference = connection.difference;


        // Невеликий перепад
        if (difference < BROW_THRESHOLD) {

            L.polyline(
                [
                    [a.lat, a.lng],
                    [b.lat, b.lng]
                ],
                {
                    color: "#777777",
                    weight: 2,
                    opacity: 0.45,
                    dashArray: "5,7"
                }
            ).addTo(browLayer);

            return;
        }


        // Сильний перепад — БРОВКА
        const line = L.polyline(
            [
                [a.lat, a.lng],
                [b.lat, b.lng]
            ],
            {
                color: "#ff5500",
                weight: 6,
                opacity: 0.9
            }
        ).addTo(browLayer);


        const midLat =
            (a.lat + b.lat) / 2;

        const midLng =
            (a.lng + b.lng) / 2;


        const shallow =
            Math.min(
                Number(a.depth),
                Number(b.depth)
            );

        const deep =
            Math.max(
                Number(a.depth),
                Number(b.depth)
            );


        const popup = `
            <div>

                <h3>🔥 БРОВКА</h3>

                <b>Мілка сторона:</b>
                ${shallow.toFixed(1)} м
                <br>

                <b>Глибока сторона:</b>
                ${deep.toFixed(1)} м
                <br>

                <b>Перепад:</b>
                ${difference.toFixed(1)} м
                <br>

                <b>Відстань:</b>
                ${Math.round(connection.distance)} м

            </div>
        `;


        line.bindPopup(popup);


        // Підпис у центрі бровки
        L.marker(
            [midLat, midLng],
            {
                icon: L.divIcon({
                    className: "browka-label",

                    html:
                        `<div style="
                            background:#ff5500;
                            color:white;
                            padding:4px 7px;
                            border-radius:10px;
                            font-weight:bold;
                            font-size:12px;
                            white-space:nowrap;
                            box-shadow:0 2px 5px rgba(0,0,0,.35);
                        ">
                        🔥 БРОВКА
                        </div>`,

                    iconSize: [90, 25],
                    iconAnchor: [45, 12]
                }),

                interactive: true

            }
        )
        .bindPopup(popup)
        .addTo(browLayer);

    });

}


// ======================================
// ЗАВАНТАЖЕННЯ ТОЧОК
// ======================================

function loadPoints() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {

        const points = JSON.parse(saved);

        points.forEach(point => {
            createMarker(point);
        });

        // Малюємо рельєф
        drawBottomRelief(points);

    } catch (error) {

        console.error(
            "Помилка завантаження:",
            error
        );

    }
}


// ======================================
// ЗБЕРЕЖЕННЯ
// ======================================

function savePoint(point) {

    let points = [];

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (saved) {

        try {
            points = JSON.parse(saved);
        } catch {
            points = [];
        }

    }

    points.push(point);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(points)
    );

    return points;
}


// ======================================
// ДОДАТИ ТОЧКУ
// ======================================

document.getElementById("addPoint").onclick = () => {

    addMode = true;

    alert(
        "🎯 Натисни на карту в місці проміру."
    );

};


// ======================================
// НАТИСКАННЯ НА КАРТУ
// ======================================

map.on("click", function(e) {

    if (!addMode) return;


    const depth = prompt(
        "🌊 Глибина в метрах:",
        "3.5"
    );


    if (depth === null) {

        addMode = false;
        return;

    }


    if (
        depth.trim() === "" ||
        isNaN(Number(depth))
    ) {

        alert("❌ Введи правильну глибину.");

        addMode = false;
        return;

    }


    const bottom = prompt(
        "🪨 Тип дна:",
        "мул"
    );

    if (bottom === null) {

        addMode = false;
        return;

    }


    const bait = prompt(
        "🎣 Наживка:",
        "попап"
    );

    if (bait === null) {

        addMode = false;
        return;

    }


    const fish = prompt(
        "🐟 Яка риба:",
        "короп"
    );

    if (fish === null) {

        addMode = false;
        return;

    }


    const rating = prompt(
        "⭐ Оцінка 1–5:",
        "5"
    );

    if (rating === null) {

        addMode = false;
        return;

    }


    const note = prompt(
        "📝 Примітка:",
        "Промір"
    );

    if (note === null) {

        addMode = false;
        return;

    }


    const point = {

        id: Date.now(),

        lat: e.latlng.lat,

        lng: e.latlng.lng,

        depth: Number(depth),

        bottom: bottom,

        bait: bait,

        fish: fish,

        rating: Math.min(
            5,
            Math.max(
                1,
                Number(rating) || 1
            )
        ),

        note: note,

        createdAt:
            new Date().toISOString()

    };


    const points = savePoint(point);

    createMarker(point);

    // Перемальовуємо рельєф
    drawBottomRelief(points);

    addMode = false;


    alert(
        "✅ Промір збережено!\n\n" +
        "Глибина: " +
        point.depth +
        " м"
    );

});


// ======================================
// ЗАПУСК
// ======================================

loadPoints();

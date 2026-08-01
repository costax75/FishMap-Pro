const map = L.map('map').setView([48.460, 34.980], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);


// ===============================
// FishMap Pro — точки водойми
// ===============================

let addMode = false;

const STORAGE_KEY = "fishmappro_points";


// ---------- Безпечний текст ----------

function safeText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ---------- Завантаження точок ----------

function loadPoints() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {

        const points = JSON.parse(saved);

        points.forEach(point => {
            createMarker(point);
        });

    } catch (error) {

        console.error("Помилка завантаження точок:", error);

    }
}


// ---------- Збереження ----------

function savePoint(point) {

    let points = [];

    const saved = localStorage.getItem(STORAGE_KEY);

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
}


// ---------- Створення маркера ----------

function createMarker(point) {

    const marker = L.marker([
        point.lat,
        point.lng
    ]).addTo(map);

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


// ---------- Кнопка додавання ----------

document.getElementById("addPoint").onclick = () => {

    addMode = true;

    alert(
        "🎯 Режим додавання точки увімкнено.\n\n" +
        "Натисни на карту в місці проміру."
    );
};


// ---------- Натискання карти ----------

map.on("click", function(e) {

    if (!addMode) return;

    const depth = prompt(
        "🌊 Введи глибину в метрах:",
        "3.5"
    );

    if (depth === null) {
        addMode = false;
        return;
    }


    if (depth.trim() === "" || isNaN(Number(depth))) {

        alert("Вкажи правильну глибину, наприклад 3.5");

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
        "⭐ Оціни точку від 1 до 5:",
        "5"
    );

    if (rating === null) {
        addMode = false;
        return;
    }


    const note = prompt(
        "📝 Примітка:",
        "Перспективна точка"
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

        createdAt: new Date().toISOString()

    };


    savePoint(point);

    createMarker(point);

    addMode = false;


    alert(
        "✅ Точку збережено!\n\n" +
        "Глибина: " + point.depth + " м\n" +
        "Дно: " + point.bottom
    );

});


// ---------- Запуск ----------

loadPoints();

// =====================================================
// FISHMAP PRO
// Карта глибин + кольоровий рельєф + ізобати
// =====================================================


// =====================================================
// КАРТА
// =====================================================

const map = L.map("map").setView([48.460, 34.980], 11);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap"
    }
).addTo(map);


// =====================================================
// НАЛАШТУВАННЯ
// =====================================================

const STORAGE_KEY = "fishmappro_points";

let points = [];
let addMode = false;

// =====================================================
// FISHMAP PRO — МОЇ ВОДОЙМИ
// =====================================================

const WATERS_KEY = "fishmappro_waters";
const CURRENT_WATER_KEY = "fishmappro_current_water";

let waters = [];
let currentWaterId = null;


// Завантаження водойм
function loadWaters() {

    const saved = localStorage.getItem(WATERS_KEY);

    if (saved) {
        try {
            waters = JSON.parse(saved);
        } catch (e) {
            waters = [];
        }
    }

    // Якщо водойм ще немає — створюємо першу
    if (waters.length === 0) {

        waters.push({
            id: Date.now(),
            name: "Криничанський ставок",
            lat: 48.460,
            lng: 34.980
        });

        saveWaters();
    }

    const savedCurrent =
        localStorage.getItem(CURRENT_WATER_KEY);

    if (savedCurrent) {
        currentWaterId = Number(savedCurrent);
    }

    if (!waters.some(w => w.id === currentWaterId)) {
        currentWaterId = waters[0].id;
    }

    localStorage.setItem(
        CURRENT_WATER_KEY,
        currentWaterId
    );
}


// Збереження водойм
function saveWaters() {

    localStorage.setItem(
        WATERS_KEY,
        JSON.stringify(waters)
    );

}


// Поточна водойма
function getCurrentWater() {

    return waters.find(
        w => w.id === currentWaterId
    );

}


// =====================================================
// ПАНЕЛЬ "МОЇ ВОДОЙМИ"
// =====================================================

function createWatersPanel() {

    const panel =
        document.createElement("div");

    panel.id = "fishmap-waters-panel";

    panel.innerHTML = `

        <div class="waters-title">
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


    document.getElementById(
        "watersOpen"
    ).onclick = function() {

        const list =
            document.getElementById("watersList");

        list.style.display =
            list.style.display === "none"
                ? "block"
                : "none";

        renderWaters();

    };


    document.getElementById(
        "addWater"
    ).onclick = addWater;

}


// =====================================================
// ДОДАТИ ВОДОЙМУ
// =====================================================

function addWater() {

    const name =
        prompt(
            "🏞 Назва водойми:",
            "Нова водойма"
        );

    if (!name) return;


    const water = {

        id: Date.now(),

        name: name,

        lat: map.getCenter().lat,

        lng: map.getCenter().lng

    };


    waters.push(water);

    saveWaters();


    currentWaterId =
        water.id;

    localStorage.setItem(
        CURRENT_WATER_KEY,
        currentWaterId
    );


    renderWaters();


    map.setView(
        [
            water.lat,
            water.lng
        ],
        14
    );

}


// =====================================================
// ВІДОБРАЖЕННЯ ВОДОЙМ
// =====================================================

function renderWaters() {

    const container =
        document.getElementById(
            "watersItems"
        );

    if (!container) return;


    container.innerHTML = "";


    waters.forEach(function(water) {

        const count =
            points.filter(
                p => p.waterId === water.id
            ).length;


        const item =
            document.createElement("div");

        item.className =
            "water-item";


        if (water.id === currentWaterId) {
            item.classList.add(
                "water-selected"
            );
        }


        item.innerHTML = `

            <div class="water-name">
                🏞️ ${water.name}
            </div>

            <div class="water-info">
                📍 ${water.lat.toFixed(5)},
                ${water.lng.toFixed(5)}
                <br>
                📌 Промірів: ${count}
            </div>

            <button class="water-select">
                ${water.id === currentWaterId
                    ? "✓ Відкрита"
                    : "Відкрити"}
            </button>

        `;


        item.querySelector(
            ".water-select"
        ).onclick = function() {

            selectWater(water.id);

        };


        container.appendChild(item);

    });

}


// =====================================================
// ВИБІР ВОДОЙМИ
// =====================================================

function selectWater(id) {

    currentWaterId = id;


    localStorage.setItem(
        CURRENT_WATER_KEY,
        id
    );


    const water =
        getCurrentWater();


    if (!water) return;


    map.setView(
        [
            water.lat,
            water.lng
        ],
        14
    );


    // Показуємо тільки точки цієї водойми
    points = points.filter(function(point) {

        return point.waterId === currentWaterId;

    });


    drawPoints();

    drawRelief();

    renderWaters();

}


// =====================================================
// СТИЛІ
// =====================================================

const watersStyle =
    document.createElement("style");

watersStyle.innerHTML = `

#fishmap-waters-panel {

    position: fixed;

    top: 15px;

    left: 15px;

    z-index: 10000;

    width: 240px;

    background: white;

    border-radius: 12px;

    padding: 10px;

    box-shadow:
        0 3px 15px
        rgba(0,0,0,.3);

    font-family: Arial, sans-serif;

}


.waters-title {

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

}


.waters-header {

    display: flex;

    justify-content: space-between;

    align-items: center;

    margin-top: 10px;

    margin-bottom: 8px;

}


#addWater {

    width: 30px;

    height: 30px;

    border: 0;

    border-radius: 7px;

    background: #2e7d32;

    color: white;

    font-size: 20px;

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

}

`;

document.head.appendChild(
    watersStyle
);


// =====================================================
// ЗАПУСК ВОДОЙМ
// =====================================================

loadWaters();

createWatersPanel();
// =====================================================
// ОКРЕМИЙ ШАР ДЛЯ РЕЛЬЄФУ
// =====================================================

map.createPane("reliefPane");

map.getPane("reliefPane").style.zIndex = 350;
map.getPane("reliefPane").style.pointerEvents = "none";

const reliefCanvas = document.createElement("canvas");

reliefCanvas.style.position = "absolute";
reliefCanvas.style.left = "0";
reliefCanvas.style.top = "0";
reliefCanvas.style.pointerEvents = "none";

map.getPane("reliefPane").appendChild(reliefCanvas);


// =====================================================
// КОЛІР ГЛИБИНИ
// =====================================================

function depthColor(depth) {

    const stops = [
        { d: 0,  r: 255, g: 40,  b: 40  },
        { d: 1,  r: 255, g: 100, b: 30  },
        { d: 2,  r: 255, g: 170, b: 20  },
        { d: 3,  r: 255, g: 220, b: 40  },
        { d: 4,  r: 150, g: 220, b: 50  },
        { d: 5,  r: 60,  g: 200, b: 100 },
        { d: 7,  r: 30,  g: 190, b: 170 },
        { d: 10, r: 20,  g: 150, b: 220 },
        { d: 15, r: 20,  g: 90,  b: 190  },
        { d: 20, r: 20, g: 55,  b: 150  },
        { d: 30, r: 10, g: 25,  b: 90   }
    ];

    if (depth <= stops[0].d) {
        return `rgb(${stops[0].r},${stops[0].g},${stops[0].b})`;
    }

    for (let i = 0; i < stops.length - 1; i++) {

        const a = stops[i];
        const b = stops[i + 1];

        if (depth >= a.d && depth <= b.d) {

            const t =
                (depth - a.d) /
                (b.d - a.d);

            const r = Math.round(
                a.r + (b.r - a.r) * t
            );

            const g = Math.round(
                a.g + (b.g - a.g) * t
            );

            const blue = Math.round(
                a.b + (b.b - a.b) * t
            );

            return `rgb(${r},${g},${blue})`;
        }
    }

    return "rgb(10,25,90)";
}


// =====================================================
// ЗБЕРЕЖЕННЯ
// =====================================================

function savePoints() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(points)
    );
}


// =====================================================
// ЗАВАНТАЖЕННЯ
// =====================================================

function loadPoints() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        points = [];
        return;
    }

    try {

        points = JSON.parse(saved);

        if (!Array.isArray(points)) {
            points = [];
        }

    } catch (error) {

        console.error(error);
        points = [];

    }
}


// =====================================================
// ОЧИСТКА ТОЧОК НА КАРТІ
// =====================================================

function clearPointMarkers() {

    map.eachLayer(function(layer) {

        if (layer._fishmapPoint) {
            map.removeLayer(layer);
        }

    });
}


// =====================================================
// POPUP
// =====================================================

function makePopup(point) {

    return `
        <div style="min-width:190px">

            <h3 style="margin:0 0 8px 0">
                🎣 FishMap Pro
            </h3>

            <b>🌊 Глибина:</b>
            ${Number(point.depth).toFixed(1)} м
            <br>

            <b>🪨 Дно:</b>
            ${point.bottom || "—"}
            <br>

            <b>📍 Координати:</b>
            ${Number(point.lat).toFixed(6)},
            ${Number(point.lng).toFixed(6)}

            <br><br>

            <button
                onclick="deletePoint(${point.id})"
                style="
                    background:#e53935;
                    color:white;
                    border:0;
                    border-radius:6px;
                    padding:7px 12px;
                "
            >
                🗑 Видалити
            </button>

        </div>
    `;
}


// =====================================================
// ВІДОБРАЖЕННЯ ТОЧОК
// =====================================================

function drawPoints() {

    clearPointMarkers();

    points.forEach(function(point) {

        const depth =
            Number(point.depth);

        const color =
            depthColor(depth);


        const marker =
            L.circleMarker(
                [point.lat, point.lng],
                {
                    radius: 9,
                    color: "#111",
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.95
                }
            );


        marker._fishmapPoint = true;


        marker.bindPopup(
            makePopup(point)
        );


        marker.addTo(map);

    });
}


// =====================================================
// ВИДАЛЕННЯ ТОЧКИ
// =====================================================

window.deletePoint = function(id) {

    if (!confirm("Видалити цю точку?")) {
        return;
    }

    points =
        points.filter(function(point) {
            return point.id !== id;
        });

    savePoints();

    drawPoints();

    drawRelief();

};


// =====================================================
// ДОДАВАННЯ ТОЧКИ
// =====================================================

const addPointButton =
    document.getElementById("addPoint");


if (addPointButton) {

    addPointButton.onclick = function() {

        addMode = true;

        alert(
            "🎯 Режим проміру увімкнено.\n\n" +
            "Натисни на карту там, де хочеш " +
            "додати глибину."
        );

    };

}


// =====================================================
// КЛІК ПО КАРТІ
// =====================================================

map.on("click", function(e) {

    if (!addMode) {
        return;
    }


    const depthText =
        prompt(
            "🌊 Введи глибину в метрах:",
            "3.5"
        );


    if (
        depthText === null ||
        depthText.trim() === ""
    ) {

        addMode = false;
        return;

    }


    const depth =
        Number(
            depthText
                .replace(",", ".")
        );


    if (
        !Number.isFinite(depth) ||
        depth < 0
    ) {

        alert(
            "❌ Введи правильну глибину."
        );

        addMode = false;
        return;

    }


    const bottom =
        prompt(
            "🪨 Тип дна:",
            "мул"
        ) || "—";


    const point = {

        id:
            Date.now(),

        lat:
            e.latlng.lat,

        lng:
            e.latlng.lng,

        depth:
            depth,

        bottom:
            bottom

    };


    points.push(point);

    savePoints();

    drawPoints();

    drawRelief();

    addMode = false;

});


// =====================================================
// ПЕРЕТВОРЕННЯ КООРДИНАТ У ПІКСЕЛІ
// =====================================================

function pointToPixel(point) {

    const p =
        map.latLngToContainerPoint([
            Number(point.lat),
            Number(point.lng)
        ]);

    return {
        x: p.x,
        y: p.y
    };

}


// =====================================================
// IDW — ІНТЕРПОЛЯЦІЯ
// =====================================================

function estimateDepth(x, y) {

    if (points.length === 0) {
        return null;
    }


    let numerator = 0;

    let denominator = 0;


    for (const point of points) {

        const p =
            pointToPixel(point);


        const dx =
            x - p.x;

        const dy =
            y - p.y;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (distance < 1) {

            return Number(point.depth);

        }


        // Радіус впливу
        const influence = 700;


        if (distance > influence) {
            continue;
        }


        const weight =
            1 /
            Math.pow(distance, 2);


        numerator +=
            Number(point.depth) *
            weight;


        denominator +=
            weight;

    }


    if (denominator === 0) {
        return null;
    }


    return (
        numerator /
        denominator
    );

}


// =====================================================
// ОБЛАСТЬ РЕЛЬЄФУ
// =====================================================

function getBounds() {

    if (points.length < 3) {
        return null;
    }


    const pixels =
        points.map(pointToPixel);


    let minX = Infinity;
    let minY = Infinity;

    let maxX = -Infinity;
    let maxY = -Infinity;


    pixels.forEach(function(p) {

        minX =
            Math.min(
                minX,
                p.x
            );

        minY =
            Math.min(
                minY,
                p.y
            );

        maxX =
            Math.max(
                maxX,
                p.x
            );

        maxY =
            Math.max(
                maxY,
                p.y
            );

    });


    const padding = 80;


    return {

        minX:
            Math.max(
                0,
                minX - padding
            ),

        minY:
            Math.max(
                0,
                minY - padding
            ),

        maxX:
            Math.min(
                map.getSize().x,
                maxX + padding
            ),

        maxY:
            Math.min(
                map.getSize().y,
                maxY + padding
            )

    };

}


// =====================================================
// МАЛЮВАННЯ РЕЛЬЄФУ
// =====================================================

function drawRelief() {

    const canvas =
        reliefCanvas;

    const ctx =
        canvas.getContext("2d");


    const size =
        map.getSize();


    canvas.width =
        size.x;

    canvas.height =
        size.y;


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if (points.length < 3) {
        return;
    }


    const bounds =
        getBounds();


    if (!bounds) {
        return;
    }


    const step = 12;


    const values = [];


    // -----------------------------------------------
    // РОЗРАХУНОК СІТКИ
    // -----------------------------------------------

    for (
        let y = bounds.minY;
        y <= bounds.maxY;
        y += step
    ) {

        const row = [];


        for (
            let x = bounds.minX;
            x <= bounds.maxX;
            x += step
        ) {

            row.push(
                estimateDepth(
                    x,
                    y
                )
            );

        }


        values.push(row);

    }


    // -----------------------------------------------
    // КОЛЬОРОВА ЗАЛИВКА
    // -----------------------------------------------

    ctx.globalAlpha = 0.30;


    for (
        let row = 0;
        row < values.length;
        row++
    ) {

        for (
            let col = 0;
            col < values[row].length;
            col++
        ) {

            const depth =
                values[row][col];


            if (depth === null) {
                continue;
            }


            ctx.fillStyle =
                depthColor(depth);


            ctx.fillRect(

                bounds.minX +
                col * step,

                bounds.minY +
                row * step,

                step + 1,
                step + 1

            );

        }

    }


    ctx.globalAlpha = 1;


    // -----------------------------------------------
    // ІЗОБАТИ
    // -----------------------------------------------

    const levels = [
        1,
        2,
        3,
        4,
        5,
        6,
        8,
        10,
        12,
        15,
        20
    ];


    levels.forEach(function(level) {

        drawContourLevel(
            ctx,
            values,
            bounds,
            step,
            level
        );

    });

}


// =====================================================
// ІЗОБАТИ
// =====================================================

function drawContourLevel(
    ctx,
    values,
    bounds,
    step,
    level
) {

    if (values.length < 2) {
        return;
    }


    const rows =
        values.length;

    const cols =
        values[0].length;


    ctx.beginPath();


    for (
        let row = 0;
        row < rows - 1;
        row++
    ) {

        for (
            let col = 0;
            col < cols - 1;
            col++
        ) {


            const a =
                values[row][col];

            const b =
                values[row][col + 1];

            const c =
                values[row + 1][col + 1];

            const d =
                values[row + 1][col];


            if (
                a === null ||
                b === null ||
                c === null ||
                d === null
            ) {
                continue;
            }


            let code = 0;


            if (a >= level) {
                code |= 1;
            }

            if (b >= level) {
                code |= 2;
            }

            if (c >= level) {
                code |= 4;
            }

            if (d >= level) {
                code |= 8;
            }


            if (
                code === 0 ||
                code === 15
            ) {
                continue;
            }


            const x =
                bounds.minX +
                col * step;


            const y =
                bounds.minY +
                row * step;


            function interpolate(v1, v2) {

                if (v1 === v2) {
                    return 0.5;
                }


                return (
                    (level - v1) /
                    (v2 - v1)
                );

            }


            const top = {

                x:
                    x +
                    step *
                    interpolate(a, b),

                y:
                    y

            };


            const right = {

                x:
                    x + step,

                y:
                    y +
                    step *
                    interpolate(b, c)

            };


            const bottom = {

                x:
                    x +
                    step *
                    interpolate(d, c),

                y:
                    y + step

            };


            const left = {

                x:
                    x,

                y:
                    y +
                    step *
                    interpolate(a, d)

            };


            function line(p1, p2) {

                ctx.moveTo(
                    p1.x,
                    p1.y
                );

                ctx.lineTo(
                    p2.x,
                    p2.y
                );

            }


            switch (code) {

                case 1:
                    line(left, top);
                    break;

                case 2:
                    line(top, right);
                    break;

                case 3:
                    line(left, right);
                    break;

                case 4:
                    line(right, bottom);
                    break;

                case 5:
                    line(top, right);
                    line(left, bottom);
                    break;

                case 6:
                    line(top, bottom);
                    break;

                case 7:
                    line(left, bottom);
                    break;

                case 8:
                    line(left, bottom);
                    break;

                case 9:
                    line(top, bottom);
                    break;

                case 10:
                    line(top, left);
                    line(right, bottom);
                    break;

                case 11:
                    line(right, bottom);
                    break;

                case 12:
                    line(left, right);
                    break;

                case 13:
                    line(top, right);
                    break;

                case 14:
                    line(left, top);
                    break;

            }

        }

    }


    // Товщина ізобати
    ctx.lineWidth =
        level % 5 === 0
            ? 2
            : 1;


    // Колір лінії
    ctx.strokeStyle =
        level % 5 === 0
            ? "rgba(0,0,80,0.75)"
            : "rgba(0,0,0,0.40)";


    ctx.stroke();

}


// =====================================================
// ПЕРЕМАЛЬОВУВАННЯ ПРИ РУСІ КАРТИ
// =====================================================

map.on(
    "move zoom resize",
    function() {

        drawRelief();

    }
);


// =====================================================
// СТАРТ
// =====================================================

loadPoints();

drawPoints();

drawRelief();


// =====================================================
// ГОТОВО
// =====================================================

console.log(
    "🎣 FishMap Pro запущено."
);

console.log(
    "Промірів:",
    points.length
);

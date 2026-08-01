const map = L.map('map').setView([48.460, 34.980], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);


// =====================================================
// FISHMAP PRO — РЕЛЬЄФ ДНА
// =====================================================

const STORAGE_KEY = "fishmappro_points";

let addMode = false;
let points = [];


// =====================================================
// ЗАВАНТАЖЕННЯ ТОЧОК
// =====================================================

function loadSavedPoints() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        points = [];
        return;
    }

    try {
        points = JSON.parse(saved);
    } catch (e) {
        console.error("Помилка даних:", e);
        points = [];
    }
}


// =====================================================
// КОЛІР ГЛИБИНИ
// =====================================================

function depthColor(depth) {

    const stops = [
        { d: 0,  r: 230, g: 40,  b: 30  },
        { d: 2,  r: 255, g: 150, b: 20  },
        { d: 4,  r: 255, g: 225, b: 50  },
        { d: 6,  r: 70,  g: 190, b: 80  },
        { d: 8,  r: 30,  g: 170, b: 180 },
        { d: 10, r: 20,  g: 120, b: 220 },
        { d: 15, r: 20,  g: 70,  b: 180 },
        { d: 25, r: 10,  g: 35,  b: 120 }
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

            const r = Math.round(a.r + (b.r - a.r) * t);
            const g = Math.round(a.g + (b.g - a.g) * t);
            const bl = Math.round(a.b + (b.b - a.b) * t);

            return `rgb(${r},${g},${bl})`;
        }
    }

    return "rgb(10,35,120)";
}


// =====================================================
// CANVAS ШАР
// =====================================================

const reliefCanvas = document.createElement("canvas");

reliefCanvas.style.position = "absolute";
reliefCanvas.style.pointerEvents = "none";
reliefCanvas.style.zIndex = "200";

const ReliefLayer = L.Layer.extend({

    onAdd: function(map) {

        this._map = map;

        const pane = map.getPane("overlayPane");

        pane.appendChild(reliefCanvas);

        map.on(
            "move zoom resize",
            this._reset,
            this
        );

        this._reset();
    },

    onRemove: function(map) {

        map.off(
            "move zoom resize",
            this._reset,
            this
        );

        if (reliefCanvas.parentNode) {
            reliefCanvas.parentNode.removeChild(reliefCanvas);
        }
    },

    _reset: function() {

        const size = this._map.getSize();

        const topLeft =
            this._map.containerPointToLayerPoint([0, 0]);

        L.DomUtil.setPosition(
            reliefCanvas,
            topLeft
        );

        reliefCanvas.width = size.x;
        reliefCanvas.height = size.y;

        drawRelief();
    }

});

const reliefLayer = new ReliefLayer();

reliefLayer.addTo(map);


// =====================================================
// КОНВЕРТАЦІЯ КООРДИНАТ
// =====================================================

function pointToPixel(point) {

    const p = map.latLngToContainerPoint([
        Number(point.lat),
        Number(point.lng)
    ]);

    return {
        x: p.x,
        y: p.y
    };
}


// =====================================================
// ІНТЕРПОЛЯЦІЯ ГЛИБИНИ
// =====================================================

function estimateDepth(x, y) {

    if (points.length === 0) {
        return null;
    }

    let numerator = 0;
    let denominator = 0;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const point of points) {

        const p = pointToPixel(point);

        const dx = x - p.x;
        const dy = y - p.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance < nearestDistance) {

            nearestDistance = distance;
            nearest = Number(point.depth);
        }

        // Якщо прямо біля проміру
        if (distance < 8) {
            return Number(point.depth);
        }

        const weight =
            1 / Math.pow(distance, 2);

        numerator +=
            Number(point.depth) * weight;

        denominator += weight;
    }

    if (!denominator) {
        return nearest;
    }

    return numerator / denominator;
}


// =====================================================
// ОБМЕЖЕННЯ ОБЛАСТІ РЕЛЬЄФУ
// =====================================================

function getBounds() {

    if (points.length < 2) {
        return null;
    }

    const pixels =
        points.map(pointToPixel);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    pixels.forEach(p => {

        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);

        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);

    });

    const padding = 120;

    return {
        minX: Math.max(0, minX - padding),
        minY: Math.max(0, minY - padding),
        maxX: Math.min(map.getSize().x, maxX + padding),
        maxY: Math.min(map.getSize().y, maxY + padding)
    };
}


// =====================================================
// ПОБУДОВА КОЛЬОРОВОЇ КАРТИ
// =====================================================

function drawRelief() {

    const canvas = reliefCanvas;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (points.length < 3) {
        return;
    }

    const bounds = getBounds();

    if (!bounds) {
        return;
    }

    const step = 14;

    const width =
        bounds.maxX - bounds.minX;

    const height =
        bounds.maxY - bounds.minY;


    const values = [];

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
                estimateDepth(x, y)
            );

        }

        values.push(row);
    }


    // -----------------------------------------------
    // КОЛЬОРОВА ЗАЛИВКА
    // -----------------------------------------------

    for (let row = 0; row < values.length; row++) {

        for (
            let col = 0;
            col < values[row].length;
            col++
        ) {

            const depth = values[row][col];

            if (depth === null) continue;

            const color = depthColor(depth);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.32;

            ctx.fillRect(
                bounds.minX + col * step,
                bounds.minY + row * step,
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


    levels.forEach(level => {

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
// ІЗОБАТА — MARCHING SQUARES
// =====================================================

function drawContourLevel(
    ctx,
    values,
    bounds,
    step,
    level
) {

    const rows = values.length;

    if (rows < 2) return;

    const cols = values[0].length;

    ctx.beginPath();

    for (let row = 0; row < rows - 1; row++) {

        for (let col = 0; col < cols - 1; col++) {

            const a = values[row][col];
            const b = values[row][col + 1];
            const c = values[row + 1][col + 1];
            const d = values[row + 1][col];

            if (
                a === null ||
                b === null ||
                c === null ||
                d === null
            ) {
                continue;
            }


            let code = 0;

            if (a >= level) code |= 1;
            if (b >= level) code |= 2;
            if (c >= level) code |= 4;
            if (d >= level) code |= 8;


            if (code === 0 || code === 15) {
                continue;
            }


            const x =
                bounds.minX + col * step;

            const y =
                bounds.minY + row * step;


            function interp(v1, v2) {

                if (v1 === v2) return 0.5;

                return (
                    (level - v1) /
                    (v2 - v1)
                );
            }


            const top = {
                x: x + step * interp(a, b),
                y: y
            };

            const right = {
                x: x + step,
                y: y + step * interp(b, c)
            };

            const bottom = {
                x: x + step * interp(d, c),
                y: y + step
            };

            const left = {
                x: x,
                y: y + step * interp(a, d)
            };


            function line(p1, p2) {

                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

            }


            switch (code) {

         case 

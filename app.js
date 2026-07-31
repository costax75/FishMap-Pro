const map = L.map('map').setView([48.460, 34.980], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let addMode = false;

document.getElementById("addPoint").onclick = () => {
    addMode = true;
    alert("Натисни на карту, щоб додати точку.");
};

map.on("click", function(e){

    if(!addMode) return;

    let depth = prompt("Введи глибину (м):");

    if(depth===null){
        addMode=false;
        return;
    }

    let bottom = prompt("Тип дна (мул, пісок, глина, черепашка):","мул");

    L.marker(e.latlng)
        .addTo(map)
        .bindPopup(
            "<b>Глибина:</b> "+depth+" м<br><b>Дно:</b> "+bottom
        );

    addMode=false;

});

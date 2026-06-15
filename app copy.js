const map = L.map('map').setView([5.5, 125.1], 8);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let quakes = [];
let markers = [];

const slider = document.getElementById("slider");
const timeLabel = document.getElementById("currentTime");

const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_HOUR = 1000 * 60 * 60;

const START_ZOOM = 5;
const END_ZOOM = 8;

let startTime;
let endTime;
let currentTime;

function parsePHDate(str) {

    const match = str.match(
        /(\d+)\s+(\w+)\s+(\d+)\s+-\s+(\d+):(\d+)\s+(AM|PM)/
    );

    if (!match) return null;

    let [, day, month, year, hour, minute, period] = match;

    const months = {
        January: 0, February: 1, March: 2, April: 3,
        May: 4, June: 5, July: 6, August: 7,
        September: 8, October: 9, November: 10, December: 11
    };

    hour = parseInt(hour);
    minute = parseInt(minute);

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return new Date(
        parseInt(year),
        months[month],
        parseInt(day),
        hour,
        minute
    );
}

fetch("./earthquakes.json")
    .then(res => res.json())
    .then(data => {

        quakes = data.map(row => ({
            time: parsePHDate(row["Date - Time"]),
            rawTime: row["Date - Time"],
            lat: Number(row["Latitude"]),
            lng: Number(row["Longitude"]),
            depth: Number(row["Depth"]),
            mag: Number(row["Mag"]),
            location: row["Location"]
        }));

        quakes.sort((a, b) => a.time - b.time);

        console.log("Quakes loaded:", quakes.length);

        startTime = quakes[0].time;
        endTime = quakes[quakes.length - 1].time;
        currentTime = new Date(startTime);

        // slider now represents TIME index (hour steps)
        const totalHours =
            Math.floor((endTime - startTime) / ONE_HOUR);

        slider.max = totalHours;
        slider.value = 0;

        renderAtTime(currentTime);
        updateDashboard(); 
        
    });

function depthColor(depth) {
    return depth < 34 ? "#ff3b21" :
           depth < 70 ? "#ffb121" :
           depth < 150 ? "#fff455" :
                        "#b4d656";
}

function updateDashboard() {

    if (!quakes.length) return;

    document.getElementById("count").innerText = quakes.length;

    const maxMag = Math.max(...quakes.map(q => q.mag));
    document.getElementById("maxMag").innerText = maxMag.toFixed(1);

    const maxDepth = Math.max(...quakes.map(q => q.depth));
    document.getElementById("maxDepth").innerText = maxDepth + " km";

    const latest = quakes[quakes.length - 1];
    document.getElementById("latest").innerText = latest.rawTime;
}

function renderAtTime(currentTime) {

    // clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const cutoffTime = new Date(currentTime.getTime() - ONE_DAY);

    for (let i = 0; i < quakes.length; i++) {

        const q = quakes[i];

        if (q.time > currentTime) continue;
        if (q.time < cutoffTime) continue;

        const age = currentTime - q.time;
        const ageRatio = age / ONE_DAY;
        const opacity = Math.max(0, 1 - ageRatio);

        const marker = L.circleMarker(
            [q.lat, q.lng],
            {
                radius: Math.pow(q.mag, 2) * 1.5,
                color: depthColor(q.depth),
                fillOpacity: opacity,
                opacity: opacity
            }
        ).addTo(map);

        marker.bindPopup(`
            <b>Magnitude:</b> ${q.mag}<br>
            <b>Depth:</b> ${q.depth} km<br>
            <b>Time:</b> ${q.rawTime}<br>
            <b>Location:</b> ${q.location}
        `);

        markers.push(marker);
    }

    timeLabel.innerText =
        currentTime.toLocaleString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        updateZoom(currentTime);
}

// 🎚️ SLIDER (now time-based)
slider.addEventListener("input", () => {

    const hours = Number(slider.value);

    currentTime = new Date(startTime.getTime() + hours * ONE_HOUR);

    renderAtTime(currentTime);
});

// ▶️ PLAYBACK (TIME-BASED)
let playing = false;
let timer;

document.getElementById("playBtn")
.addEventListener("click", () => {

    if (!playing) {

        playing = true;

        timer = setInterval(() => {

            const hours =
                Math.floor((currentTime - startTime) / ONE_HOUR) + 1;

            if (hours <= slider.max) {

                slider.value = hours;

                currentTime = new Date(
                    startTime.getTime() + hours * ONE_HOUR
                );

                renderAtTime(currentTime);

            } else {

                clearInterval(timer);
                playing = false;
            }

        }, 500);

    } else {
        clearInterval(timer);
        playing = false;
    }
}); 

function updateZoom(currentTime) {

    const progress =
        (currentTime - startTime) / (endTime - startTime);

    const zoom = START_ZOOM + progress * (END_ZOOM - START_ZOOM);

    map.flyTo(map.getCenter(), zoom, {
        duration: 0.6,
        easeLinearity: 0.25
    });
}
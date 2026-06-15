const map = L.map('map').setView([5.5, 125.1], 8);

L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap'
    }
).addTo(map);

let quakes = [];
let markers = [];

const slider = document.getElementById("slider");
const timeLabel = document.getElementById("currentTime");
 

function parsePHDate(str) {

    const match = str.match(
        /(\d+)\s+(\w+)\s+(\d+)\s+-\s+(\d+):(\d+)\s+(AM|PM)/
    );

    if (!match) return null;

    let [
        ,
        day,
        month,
        year,
        hour,
        minute,
        period
    ] = match;

    const months = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11
    };

    hour = parseInt(hour);
    minute = parseInt(minute);

    if (period === "PM" && hour !== 12) {
        hour += 12;
    }

    if (period === "AM" && hour === 12) {
        hour = 0;
    }

    return new Date(
        parseInt(year),
        months[month],
        parseInt(day),
        hour,
        minute
    );
}


Papa.parse("earthquakes.csv", {

    download: true,
    header: true,

    complete: function(results){

        quakes = results.data
            .filter(row => row.Latitude && row.Longitude)
            .map(row => {

                return {

                    time: parsePHDate(
                        row["Date - Time"]
                    ),

                    lat: Number(row.Latitude),

                    lng: Number(row.Longitude),

                    depth: Number(row.Depth),

                    mag: Number(row.Mag),

                    location: row.Location
                };
            });

        quakes.sort(
            (a,b) => a.time - b.time
        );

        document.getElementById("count").innerText = quakes.length;

        const maxMag = Math.max(...quakes.map(q => q.mag));
        document.getElementById("maxMag").innerText = maxMag;

        const maxDepth = Math.max(...quakes.map(q => q.depth));
        document.getElementById("maxDepth").innerText = maxDepth + " km";

        const latest = quakes[quakes.length - 1];
        document.getElementById("latest").innerText =
            latest.rawTime;

//         console.log(row["Date - Time"]);
// console.log(new Date(row["Date - Time"]));

        slider.max = quakes.length - 1;

        render(0);
    }
});

function depthColor(depth){
    return depth < 10 ? "#ff3b21" :
           depth < 30 ? "#ffb121" :
           depth < 70 ? "#fff455" :
                        "#b4d656";
}

function render(index){

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    for(let i=0;i<=index;i++){

        const q = quakes[i]; 

        const marker = L.circleMarker(
            [q.lat,q.lng],
            {
                radius: Math.pow(q.mag, 2) * 1.5,
                color: depthColor(q.depth),
                fillOpacity: 0.6
            }
        ).addTo(map);

        marker.bindPopup(`
            <b>Magnitude:</b> ${q.mag}<br>
            <b>Depth:</b> ${q.depth} km<br>
            <b>Time:</b> ${q.time}<br>
            <b>Location:</b> ${q.location}
        `);

        markers.push(marker);
    }

    timeLabel.innerText =
        quakes[index].time.toLocaleString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

slider.addEventListener("input", () => {

    render(Number(slider.value));
});

let playing = false;
let timer;

document.getElementById("playBtn")
.addEventListener("click", () => {

    if(!playing){

        playing = true;

        timer = setInterval(() => {

            let value = Number(slider.value);

            if(value < quakes.length - 1){

                slider.value = value + 1;
                render(value + 1);

            }else{

                clearInterval(timer);
                playing = false;
            }

        },500);

    }else{

        clearInterval(timer);
        playing = false;
    }
});

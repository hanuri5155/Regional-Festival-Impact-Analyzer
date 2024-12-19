function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return '날짜 정보 없음';

    const year = dateStr.substring(0, 4);
    const month = parseInt(dateStr.substring(4, 6), 10);
    const day = parseInt(dateStr.substring(6, 8), 10);
    return `${year}년 ${month}월 ${day}일`;
}

document.addEventListener('DOMContentLoaded', () => {
    const defaultCenter = new naver.maps.LatLng(36.0, 127.5);
    const map = new naver.maps.Map('map', {
        center: defaultCenter,
        zoom: 7
    });

    if (!Array.isArray(data)) {
        console.error('잘못된 데이터 형식:', data);
        return;
    }

    console.log(data);

    let activeInfoWindow = null;

    data.forEach((item, index) => {
        const lat = parseFloat(item.mapy);
        const lng = parseFloat(item.mapx);

        if (isNaN(lat) || isNaN(lng)) {
            console.warn(`유효하지 않은 좌표: ${item.title}`);
            return;
        }

        const position = new naver.maps.LatLng(lat, lng);
        const marker = new naver.maps.Marker({
            map: map,
            position: position,
            title: item.title
        });

        const formattedStartDate = formatDate(item.eventstartdate);
        const formattedEndDate = formatDate(item.eventenddate);
        const activationRaw = parseFloat(item.activation_rate) || 0;
        const visitorPrediction = item.nextYearVisitors || 'N/A';

        const contentString = `
            <div class="info-window">
                <div class="info-title">
                    ${item.title}
                    <span class="close-button" onclick="closeActiveInfoWindow()">&#10005;</span>
                </div>
                <div class="image-section">
                    <img src="${item.firstimage}" alt="${item.title} 사진">
                </div>
                <div class="data-row">
                    <div class="info-block">
                        <div class="info-section-title">위치</div>
                        <div>${item.addr1 || '위치 정보 없음'}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-section-title">축제일정</div>
                        <div>${formattedStartDate} ~ ${formattedEndDate}</div>
                    </div>
                </div>
                <div class="data-row">
                    <div class="info-block center-content">
                        <div class="info-section-title">지역 활성화 정도</div>
                        <canvas id="activation-chart-${index}" width="100" height="100"></canvas>
                    </div>
                    <div class="info-block center-content">
                        <div class="info-section-title">방문자 수 예측</div>
                        <div>${visitorPrediction}</div>
                    </div>
                </div>
            </div>
        `;

        const infowindow = new naver.maps.InfoWindow({
            content: contentString,
            anchorSkew: true,
            pixelOffset: new naver.maps.Point(0, 50)
        });

        naver.maps.Event.addListener(marker, "click", () => {
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }

            infowindow.open(map, marker);
            activeInfoWindow = infowindow;

            adjustMapCenter(map, position, infowindow);

            setTimeout(() => drawChart(`activation-chart-${index}`, activationRaw), 100);
        });
    });

    window.closeActiveInfoWindow = () => {
        if (activeInfoWindow) {
            activeInfoWindow.close();
            activeInfoWindow = null;
        }
    };

    function adjustMapCenter(map, position, infowindow) {
        const mapBounds = map.getBounds();
        const infoSize = { width: 400, height: 550 };
        const projection = map.getProjection();

        const markerPixel = projection.fromCoordToOffset(position);
        const newPixel = new naver.maps.Point(
            markerPixel.x,
            markerPixel.y - infoSize.height / 2
        );

        const newCenter = projection.fromOffsetToCoord(newPixel);

        if (!mapBounds.hasLatLng(newCenter)) {
            map.setCenter(newCenter);
        }
    }

    function drawChart(canvasId, value) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const isPositive = value >= 0;
        const percentage = Math.abs(value);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [
                    {
                        data: [percentage, 100 - percentage],
                        backgroundColor: [isPositive ? 'blue' : 'red', '#e0e0e0'],
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: false,
                cutout: '70%',
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false },
                    centerText: { display: true, text: `${value}%` }
                }
            },
            plugins: [
                {
                    id: 'centerText',
                    beforeDraw(chart) {
                        const { width, height, ctx } = chart;
                        const text = chart.options.plugins.centerText.text;

                        ctx.save();
                        ctx.font = '16px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'black';
                        ctx.fillText(text, width / 2, height / 2);
                        ctx.restore();
                    }
                }
            ]
        });
    }
});
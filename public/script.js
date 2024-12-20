// // 시군구 코드를 특정 지역 코드를 매핑하는 객체
// // 예: '10'이라는 key에 '11305'라는 특정 행정코드 매핑
// const sigungucodeMapping = {
//     '10': '11305', '100': '11500', '1000': '11680', '20': '11560', '21': '11170', '22': '11380',
//     '23': '11110', '25': '11260', '17': '11290', '18': '11710', '19': '11470', '130': '11440',
//     '140': '11410', '141': '11230', '150': '11215', '160': '11200', '233': '11740', '244': '11530',
//     '255': '11350', '24': '11140', '15': '11650', '122': '11590', '123': '11620', '124': '11545',
//     '222': '28245', '223': '28140', '224': '28177', '225': '28237', '226': '28260', '227': '28110',
//     '228': '28200', '229': '28185', '230': '28710', '247': '28720', '3': '26710', '12': '26500',
//     '13': '26470', '14': '26200', '16': '26350', '2': '26410', '6': '26260', '7': '26230', '9': '26530',
//     '1': '26440', '4': '26290', '5': '26170', '55': '26380', '56': '26110', '11': '26140', '2000': '31140',
//     '2001': '31110', '2002': '31200', '3333': '31170', '500': '31710', '200': '27290', '111': '27200',
//     '112': '27200', '8': '27110', '50': '27230', '333': '27710', '444': '27260', '555': '27720',
//     '3002': '30200', '3000': '30110', '3003': '30170', '3004': '30230', '3005': '30140',
//     '4000': '29155', '4001': '29110', '4002': '29140', '4003': '29200', '4004': '29170'
// };

// // 날짜 문자열(예: "20240101")을 "YYYY년 MM월 DD일" 형식으로 변환하는 함수
// function formatDate(dateStr) {
//     if (!dateStr || dateStr.length !== 8) return '날짜 정보 없음';
//     const year = dateStr.substring(0, 4);    // 앞 4자리는 연도
//     const month = parseInt(dateStr.substring(4, 6), 10); // 5~6자리는 월
//     const day = parseInt(dateStr.substring(6, 8), 10);   // 7~8자리는 일
//     return `${year}년 ${month}월 ${day}일`;
// }

// // DOM 컨텐츠가 모두 로드된 후 실행될 함수
// document.addEventListener('DOMContentLoaded', () => {
//     // 초기 지도 중심 좌표 (위도: 36.0, 경도: 127.5)
//     const defaultCenter = new naver.maps.LatLng(36.0, 127.5);

//     // 네이버 지도 객체 생성
//     // center: 지도 중심 좌표, zoom: 확대 수준
//     const map = new naver.maps.Map('map', {
//         center: defaultCenter,
//         zoom: 7
//     });

//     // data라는 배열에 축제 정보가 들어있다고 가정(상단 코드에서 외부 변수)
//     if (!Array.isArray(data)) {
//         console.error('잘못된 데이터 형식:', data);
//         return;
//     }

//     console.log(data);

//     let activeInfoWindow = null; // 현재 열려있는 정보창을 저장할 변수

//     // data 배열을 순회하면서 각 축제 정보를 지도에 마커로 표시
//     data.forEach((item, index) => {
//         const lat = parseFloat(item.mapy); // 축제 위치의 위도
//         const lng = parseFloat(item.mapx); // 축제 위치의 경도

//         // 좌표값이 유효한지 확인
//         if (isNaN(lat) || isNaN(lng)) {
//             console.warn(`유효하지 않은 좌표: ${item.title}`);
//             return;
//         }

//         const position = new naver.maps.LatLng(lat, lng);

//         // 마커 생성
//         const marker = new naver.maps.Marker({
//             map: map,
//             position: position,
//             title: item.title
//         });

//         // 축제 시작, 종료 날짜를 읽기 쉽게 변환
//         const formattedStartDate = formatDate(item.eventstartdate);
//         const formattedEndDate = formatDate(item.eventenddate);

//         // 지역 활성화 정도(퍼센트 값)
//         const activationRaw = parseFloat(item.activation_rate) || 0;

//         // 시군구 코드 매핑을 통해 실제 행정코드로 변환
//         const mappedSigungucode = sigungucodeMapping[item.sigungucode];

//         // predictedVisitors 배열에서 해당 축제 지역(행정코드)에 맞는 방문자 예측 데이터 필터링
//         const visitorData = predictedVisitors.filter(visitor => visitor.signguCode === mappedSigungucode);

//         // 방문자 데이터를 분류 (현지인, 외지인, 외국인)
//         const localVisitors = visitorData.filter(v => v.touDivNm.includes('현지인')).reduce((acc, cur) => acc + cur.predicted_touNum, 0);
//         const domesticVisitors = visitorData.filter(v => v.touDivNm.includes('외지인')).reduce((acc, cur) => acc + cur.predicted_touNum, 0);
//         const foreignVisitors = visitorData.filter(v => v.touDivNm.includes('외국인')).reduce((acc, cur) => acc + cur.predicted_touNum, 0);

//         // 정보창(Infowindow)에 표시할 HTML 템플릿
//         const contentString = `
//          <div class="info-window">
//              <div class="info-title">
//                  ${item.title}
//                  <span class="close-button" onclick="closeActiveInfoWindow()">&#10005;</span>
//              </div>
//              <div class="image-section">
//                  <img src="${item.firstimage}" alt="${item.title} 사진">
//              </div>
//              <div class="data-row">
//                  <div class="info-block">
//                      <div class="info-section-title center-content">위치</div>
//                      <div class="info-section">${item.addr1 || '위치 정보 없음'}</div>
//                  </div>
//                  <div class="info-block">
//                      <div class="info-section-title center-content">축제일정</div>
//                      <div class="info-section">${formattedStartDate} ~ ${formattedEndDate}</div>
//                  </div>
//              </div>
//              <div class="data-row">
//                  <div class="info-block center-content">
//                      <div class="info-section-title">지역 활성화 정도</div>
//                      <canvas id="activation-chart-${index}" width="200" height="200"></canvas>
//                  </div>
//                  <div class="info-block center-content">
//                      <div class="info-section-title">내년 지역 방문자 수 예측</div>
//                      <canvas id="visitor-chart-${index}" width="200" height="200"></canvas>
//                  </div>
//              </div>
//          </div>
//         `;

//         // 정보창(Infowindow) 생성
//         const infowindow = new naver.maps.InfoWindow({
//             content: contentString,
//             anchorSkew: true,
//             pixelOffset: new naver.maps.Point(0, 50)
//         });

//         // 마커 클릭 시 이벤트 처리
//         naver.maps.Event.addListener(marker, "click", () => {
//             // 다른 정보창이 열려있다면 닫기
//             if (activeInfoWindow) {
//                 activeInfoWindow.close();
//             }

//             // 현재 마커에 대한 정보창 열기
//             infowindow.open(map, marker);
//             activeInfoWindow = infowindow;

//             // 지도 중심을 클릭한 마커에 맞춰 조정
//             adjustMapCenter(map, position);

//             // 차트는 정보창이 열리고 DOM이 준비된 후 그리기 위해 setTimeout 사용
//             setTimeout(() => {
//                 drawChart(`activation-chart-${index}`, activationRaw);
//                 drawVisitorChart(`visitor-chart-${index}`, localVisitors, domesticVisitors, foreignVisitors);
//             }, 100);
//         });
//     });

//     // 열려있는 정보창 닫는 함수
//     window.closeActiveInfoWindow = () => {
//         if (activeInfoWindow) {
//             activeInfoWindow.close();
//             activeInfoWindow = null;
//         }
//     };

//     // 지도 중심을 정보창 위치로 재조정하는 함수
//     function adjustMapCenter(map, position) {
//         const mapBounds = map.getBounds();
//         const infoSize = { width: 480, height: 650 };
//         const projection = map.getProjection();

//         // 마커 위치를 픽셀 단위로 변환
//         const markerPixel = projection.fromCoordToOffset(position);

//         // 정보창 높이만큼 위로 올려서 중심 조정
//         const newPixel = new naver.maps.Point(
//             markerPixel.x,
//             markerPixel.y - infoSize.height / 2
//         );

//         // 다시 좌표로 변환
//         const newCenter = projection.fromOffsetToCoord(newPixel);

//         // 새 중심이 지도 범위를 벗어난다면 지도 중심 업데이트
//         if (!mapBounds.hasLatLng(newCenter)) {
//             map.setCenter(newCenter);
//         }
//     }

//     // 지역 활성화 정도를 도넛 차트로 표현하는 함수
//     function drawChart(canvasId, value) {
//         const ctx = document.getElementById(canvasId).getContext('2d');
//         const isPositive = value >= 0;
//         const percentage = Math.abs(value);

//         new Chart(ctx, {
//             type: 'doughnut',
//             data: {
//                 datasets: [
//                     {
//                         // 데이터: [활성화 정도 퍼센트, 나머지 영역]
//                         data: [percentage, 100 - percentage],
//                         backgroundColor: [isPositive ? 'blue' : 'red', '#e0e0e0'],
//                         borderWidth: 0
//                     }
//                 ]
//             },
//             options: {
//                 responsive: false,
//                 cutout: '60%',
//                 plugins: {
//                     tooltip: { enabled: false },
//                     legend: { display: false },
//                     centerText: { display: true, text: `${value}%` }
//                 }
//             },
//             plugins: [
//                 {
//                     id: 'centerText',
//                     beforeDraw(chart) {
//                         const { width, height, ctx } = chart;
//                         const text = chart.options.plugins.centerText.text;

//                         ctx.save();
//                         ctx.font = '20px Arial';
//                         ctx.textAlign = 'center';
//                         ctx.textBaseline = 'middle';
//                         ctx.fillStyle = 'black';
//                         ctx.fillText(text, width / 2, height / 2);
//                         ctx.restore();
//                     }
//                 }
//             ]
//         });
//     }

//     // 방문자 예측 데이터를 막대 차트로 그리는 함수
//     function drawVisitorChart(canvasId, local, domestic, foreign) {
//         const ctx = document.getElementById(canvasId).getContext('2d');

//         new Chart(ctx, {
//             type: 'bar',
//             data: {
//                 labels: ['현지인', '외지인', '외국인'],
//                 datasets: [{
//                     label: '방문자 수',
//                     data: [local, domestic, foreign],
//                     backgroundColor: ['blue', 'green', 'orange']
//                 }]
//             },
//             options: {
//                 responsive: false,
//                 plugins: {
//                     legend: { display: false },
//                     tooltip: { enabled: true }
//                 }
//             }
//         });
//     }
// });

// 시군구 코드를 특정 지역 코드를 매핑하는 객체
// 예: '10'이라는 key에 '11305'라는 특정 행정코드 매핑
const sigungucodeMapping = {
    '10': '11305', '100': '11500', '1000': '11680', '20': '11560', '21': '11170', '22': '11380',
    '23': '11110', '25': '11260', '17': '11290', '18': '11710', '19': '11470', '130': '11440',
    '140': '11410', '141': '11230', '150': '11215', '160': '11200', '233': '11740', '244': '11530',
    '255': '11350', '24': '11140', '15': '11650', '122': '11590', '123': '11620', '124': '11545',
    '222': '28245', '223': '28140', '224': '28177', '225': '28237', '226': '28260', '227': '28110',
    '228': '28200', '229': '28185', '230': '28710', '247': '28720', '3': '26710', '12': '26500',
    '13': '26470', '14': '26200', '16': '26350', '2': '26410', '6': '26260', '7': '26230', '9': '26530',
    '1': '26440', '4': '26290', '5': '26170', '55': '26380', '56': '26110', '11': '26140', '2000': '31140',
    '2001': '31110', '2002': '31200', '3333': '31170', '500': '31710', '200': '27290', '111': '27200',
    '112': '27200', '8': '27110', '50': '27230', '333': '27710', '444': '27260', '555': '27720',
    '3002': '30200', '3000': '30110', '3003': '30170', '3004': '30230', '3005': '30140',
    '4000': '29155', '4001': '29110', '4002': '29140', '4003': '29200', '4004': '29170'
};

// 시군구별 방문자 데이터를 캐싱하기 위한 객체
const visitorCache = {};

// 날짜 문자열(예: "20240101")을 "YYYY년 MM월 DD일" 형식으로 변환하는 함수
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return '날짜 정보 없음';
    const year = dateStr.substring(0, 4);    // 앞 4자리는 연도
    const month = parseInt(dateStr.substring(4, 6), 10); // 5~6자리는 월
    const day = parseInt(dateStr.substring(6, 8), 10);   // 7~8자리는 일
    return `${year}년 ${month}월 ${day}일`;
}

// DOM 컨텐츠가 모두 로드된 후 실행될 함수
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

        // 시군구 코드 매핑
        const mappedSigungucode = sigungucodeMapping[item.sigungucode];
        if (!mappedSigungucode) {
            console.warn(`시군구 매핑 실패: ${item.title}, 시군구코드: ${item.sigungucode}`);
            return;
        }

        // 축제 기간
        const festivalStart = parseInt(item.eventstartdate, 10);
        const festivalEnd = parseInt(item.eventenddate, 10);
        if (isNaN(festivalStart) || isNaN(festivalEnd)) {
            console.warn(`유효하지 않은 축제 기간: ${item.title}, 시작일: ${item.eventstartdate}, 종료일: ${item.eventenddate}`);
            return;
        }

        // 방문자 데이터 필터링 (시군구 + 축제 기간, 연도 무시)
        const visitorData = predictedVisitors.filter(visitor => {
        // 방문 날짜를 MMDD 형식으로 변환
            const visitDate = parseInt(visitor.baseYmd.substring(4), 10); // MMDD 추출
            const festivalStart = parseInt(item.eventstartdate.substring(4), 10); // MMDD 추출
            const festivalEnd = parseInt(item.eventenddate.substring(4), 10); // MMDD 추출

            return (
                visitor.signguCode === mappedSigungucode &&
                visitDate >= festivalStart &&
                visitDate <= festivalEnd
            );
        });

        // if (visitorData.length === 0) {
        //     console.warn(`방문자 데이터 없음: ${item.title}, 시군구코드: ${mappedSigungucode}`);
        //     return;
        // }

        // 방문자 데이터 계산
        const localVisitors = visitorData
            .filter(v => v.touDivNm.includes('현지인'))
            .reduce((acc, cur) => acc + cur.predicted_touNum, 0);

        const domesticVisitors = visitorData
            .filter(v => v.touDivNm.includes('외지인'))
            .reduce((acc, cur) => acc + cur.predicted_touNum, 0);

        const foreignVisitors = visitorData
            .filter(v => v.touDivNm.includes('외국인'))
            .reduce((acc, cur) => acc + cur.predicted_touNum, 0);

        // console.log(`축제 ${item.title} 방문자 예측 - 현지인: ${localVisitors}, 외지인: ${domesticVisitors}, 외국인: ${foreignVisitors}, 시군구코드: ${item.sigungucode}, 매핑된 코드: ${mappedSigungucode}`);

        // 정보창(Infowindow)에 표시할 HTML 템플릿
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
                     <div class="info-section-title center-content">위치</div>
                     <div class="info-section">${item.addr1 || '위치 정보 없음'}</div>
                 </div>
                 <div class="info-block">
                     <div class="info-section-title center-content">축제일정</div>
                     <div class="info-section">${formattedStartDate} ~ ${formattedEndDate}</div>
                 </div>
             </div>
             <div class="data-row">
                 <div class="info-block center-content">
                     <div class="info-section-title">지역 활성화 정도</div>
                     <canvas id="activation-chart-${index}" width="200" height="200"></canvas>
                 </div>
                 <div class="info-block center-content">
                     <div class="info-section-title">내년 지역 방문자 수 예측</div>
                     <canvas id="visitor-chart-${index}" width="200" height="200"></canvas>
                 </div>
             </div>
         </div>
        `;

        // 정보창(Infowindow) 생성
        const infowindow = new naver.maps.InfoWindow({
            content: contentString,
            anchorSkew: true,
            pixelOffset: new naver.maps.Point(0, 50)
        });

        // 마커 클릭 시 이벤트 처리
        naver.maps.Event.addListener(marker, "click", () => {
            // 다른 정보창이 열려있다면 닫기
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }

            // 현재 마커에 대한 정보창 열기
            infowindow.open(map, marker);
            activeInfoWindow = infowindow;

            // 지도 중심을 클릭한 마커에 맞춰 조정
            adjustMapCenter(map, position);

            // 차트는 정보창이 열리고 DOM이 준비된 후 그리기 위해 setTimeout 사용
            setTimeout(() => {
                drawChart(`activation-chart-${index}`, activationRaw);
                drawVisitorChart(`visitor-chart-${index}`, localVisitors, domesticVisitors, foreignVisitors);
            }, 100);
        });
    });

    // 열려있는 정보창 닫는 함수
    window.closeActiveInfoWindow = () => {
        if (activeInfoWindow) {
            activeInfoWindow.close();
            activeInfoWindow = null;
        }
    };

    // 지도 중심을 정보창 위치로 재조정하는 함수
    function adjustMapCenter(map, position) {
        const mapBounds = map.getBounds();
        const infoSize = { width: 480, height: 650 };
        const projection = map.getProjection();

        // 마커 위치를 픽셀 단위로 변환
        const markerPixel = projection.fromCoordToOffset(position);

        // 정보창 높이만큼 위로 올려서 중심 조정
        const newPixel = new naver.maps.Point(
            markerPixel.x,
            markerPixel.y - infoSize.height / 2
        );

        // 다시 좌표로 변환
        const newCenter = projection.fromOffsetToCoord(newPixel);

        // 새 중심이 지도 범위를 벗어난다면 지도 중심 업데이트
        if (!mapBounds.hasLatLng(newCenter)) {
            map.setCenter(newCenter);
        }
    }

    // 지역 활성화 정도를 도넛 차트로 표현하는 함수
    function drawChart(canvasId, value) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const isPositive = value >= 0;
        const percentage = Math.abs(value);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [
                    {
                        // 데이터: [활성화 정도 퍼센트, 나머지 영역]
                        data: [percentage, 100 - percentage],
                        backgroundColor: [isPositive ? 'blue' : 'red', '#e0e0e0'],
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: false,
                cutout: '60%',
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
                        ctx.font = '20px Arial';
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

    // 방문자 예측 데이터를 막대 차트로 그리는 함수
    function drawVisitorChart(canvasId, local, domestic, foreign) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['현지인', '외지인', '외국인'],
                datasets: [{
                    label: '방문자 수',
                    data: [local, domestic, foreign],
                    backgroundColor: ['blue', 'green', 'orange']
                }]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }
});
# Regional-Festival-Impact-Analyzer

## 개요 (Overview)
**Regional-Festival-Impact-Analyzer**는 지역 축제 정보를 기반으로 해당 지역의 활성화 정도와 방문자 수 예측을 제공하는 웹 애플리케이션입니다. 네이버 지도 API를 통해 대한민국 지도 상에 축제 위치를 마커로 표시하고, 해당 마커를 클릭하면 축제명, 일정, 위치, 대표이미지, 지역 활성화 정도, 내년 예측 방문자 수 등을 확인할 수 있습니다.

## 주요 기능 (Features)
- **축제 정보 시각화**: 전국 지역 축제를 지도 마커로 표시
- **지역 활성화 정도 분석**: 축제 기간 전후 방문자 수 변화를 통한 활성화 비율(증가율) 산출
- **방문자 수 예측**: XGBoost 모델로 미래 방문자 수 예측
- **데이터 관리**: MongoDB를 통한 축제 및 방문자 데이터 관리

## 개발환경 (Development Environment)
- **IDE/Editor**: Visual Studio Code (VS Code)
- **Database**: MongoDB
- **사용 언어**:  
  - Backend: Node.js(Express), Python(3.11.0)  
  - Frontend: HTML, CSS, JavaScript
- **주요 라이브러리/패키지**:
  - Python: `prophet`, `xgboost`, `pymongo`, `matplotlib`, `pandas`, `scikit-learn` 등
  - Node.js: `mongoose`, `express`, `axios`, `dotenv`, `nunjucks`, `ejs` 등

## Python 패키지 버전 정보 (Python Packages)
```bash
Package             Version
------------------- -----------
cmdstanpy           1.2.5
colorama            0.4.6
contourpy           1.3.1
cycler              0.12.1
dnspython           2.7.0
fonttools           4.55.3
holidays            0.62
importlib_resources 6.4.5
joblib              1.4.2
kiwisolver          1.4.7
matplotlib          3.9.3
numpy               2.2.0
packaging           24.2
pandas              2.2.3
pillow              11.0.0
pip                 24.3.1
prophet             1.1.6
pymongo             4.10.1
pyparsing           3.2.0
python-dateutil     2.9.0.post0
pytz                2024.2
scikit-learn        1.5.2
scipy               1.14.1
setuptools          65.5.0
six                 1.17.0
stanio              0.5.1
threadpoolctl       3.5.0
tqdm                4.67.1
tzdata              2024.2
xgboost             2.1.3
```

## Node.js 패키지 버전 정보 (NPM Packages)
```bash
Regional-Festival-Impact-Analyzer
├── axios@1.7.9
├── chokidar@3.6.0
├── cookie-parser@1.4.7
├── dotenv@16.4.7
├── ejs@3.1.10
├── express-session@1.18.1
├── express@4.21.2
├── mongoose@8.8.4
├── morgan@1.10.0
├── nunjucks@3.2.4
└── path@0.12.7
```

## 데이터베이스 (Database)
- **컬렉션(Collection)**:
  - `events`: 축제 데이터 (약 678개, 대표 이미지 포함)
  - `visitors`: 방문자 데이터 (약 517,046개, 시/군/구별 방문객 정보, 2023~2024년)
  - `results`: 지역 활성화 정도 분석 결과 (609개, 해당 축제 일정동안 방문자 데이터 부족으로 인한 항목 제외됨)
  - `predicted_visitors`: 미래 방문자 예측 데이터 (330,870개, 2024-11-17 ~ 2025-12-31)

- **데이터 형식**: JSON 형태

## 사용 API (공공 데이터)
1. **한국관광공사 국문 관광정보 서비스**: 지역별 행사정보목록 조회 (REST, JSON)
2. **한국관광공사 관광빅데이터 정보서비스**: 기초 지자체별 방문자 수 집계 데이터 조회 (REST, JSON)
3. **Naver Maps API**: 네이버 지도 및 위치 기반 데이터 시각화

## 환경 설정 및 사전 준비 (Setup & Prerequisites)
1. **REST API 호출 링크**
   `.env` 파일에 REST API 키가 포함된 호출 링크가 설정 되어있습니다.
   ```env
   EVENT_API_URL=...
   VISITOR_API_URL=...
2. **데이터 삽입**
   `data` 폴더 내 다음 CSV 파일을 MongoDB에 삽입합니다:
   - `mydatabase.events.csv`: 축제 데이터 (678개, 대표 이미지 포함)
   - `mydatabase.visitors.csv`: 방문자 데이터 (517,046개, 시/군/구별 방문객 정보, 2023~2024년)
   - `mydatabase.results.csv`: 지역 활성화 정도 분석 결과 데이터 (609개)
   - `mydatabase.predicted_visitors.csv`: 내년 방문자 예측 데이터 (330,870개, 2024-11-17 ~ 2025-12-31)

   **삽입 방법**:
   1. MongoDB 데이터베이스를 설정한 후, 각 CSV 파일을 삽입합니다.

   **주의사항**:
   - `VISITOR_API_URL`을 통해 호출하여 삽입 시, 일부 데이터의 시/군/구 코드(signguCode)와 명칭 간 불일치 문제가 있습니다.  
     이를 해결하기 위해 별도로 매핑 과정을 수행하였습니다.
   - `Activation_Rate.py`을 통해 생성한 `results` 컬렉션은 불완전하며, 일부 데이터를 직접 수정하였습니다.  
     예: 축제명에 작은따옴표(`'`)가 포함된 경우 JSON 변환 에러가 발생하여 수정 완료.
   - 위와 같은 이유로 프로젝트 실행에 필요한 정확한 데이터는 **첨부된 CSV 파일을 바로 삽입하는 것을 권장**합니다.
   - `mydatabase.visitors.csv` 데이터 삽입 시 `ObjectId` 중복 에러가 발생할 수 있으나, 모든 데이터(약 517,046개)가 정상 삽입되었다면 문제가 없습니다.

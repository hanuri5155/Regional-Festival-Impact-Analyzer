import pandas as pd
from pymongo import MongoClient
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
import holidays
from xgboost import XGBRegressor
import logging

# 한글 로그 설정
# -*- coding: euc-kr -*-
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# MongoDB 연결
logger.info("MongoDB에 연결 중...")
client = MongoClient("mongodb://localhost:27017/")
db = client['mydatabase']

# 데이터 로드
logger.info("방문자 데이터를 MongoDB에서 로드 중...")
visitors = pd.DataFrame(list(db.visitors.find()))
logger.info(f"방문자 데이터 로드 완료! 데이터 개수: {len(visitors)}")

logger.info("이벤트 데이터를 MongoDB에서 로드 중...")
events = pd.DataFrame(list(db.events.find()))
logger.info(f"이벤트 데이터 로드 완료! 데이터 개수: {len(events)}")

# 날짜 형식 변환
logger.info("날짜 형식을 변환 중...")
visitors['baseYmd'] = pd.to_datetime(visitors['baseYmd'], format='%Y%m%d')
events['eventstartdate'] = pd.to_datetime(events['eventstartdate'], format='%Y%m%d')
events['eventenddate'] = pd.to_datetime(events['eventenddate'], format='%Y%m%d')
logger.info("날짜 변환 완료!")



# # 지역 코드 매핑
# logger.info("지역 코드를 매핑 중...")
# visitors['sigungucode'] = visitors['sigungucode']
# logger.info("지역 코드 매핑 완료!")

# 공휴일 여부 추가
logger.info("공휴일 정보를 추가 중...")
holiday_dates = set(holidays.KR(years=[2024, 2025]).keys())
visitors['is_holiday'] = visitors['baseYmd'].dt.date.isin(holiday_dates).astype(int)
logger.info("공휴일 정보 추가 완료!")

# 요일 정보 추가
logger.info("요일 정보를 매핑 중...")
def map_daywk_div_cd_to_name(code):
    day_mapping = {
        "1": "Monday",
        "2": "Tuesday",
        "3": "Wednesday",
        "4": "Thursday",
        "5": "Friday",
        "6": "Saturday",
        "7": "Sunday"
    }
    return day_mapping.get(str(code), "Unknown")

visitors['daywkDivNm'] = visitors['daywkDivCd'].apply(map_daywk_div_cd_to_name)
logger.info("요일 정보 매핑 완료!")

# 계절 정보 추가
logger.info("계절 정보를 추가 중...")
def get_season(date):
    month = date.month
    if month in [12, 1, 2]:
        return 'Winter'
    elif month in [3, 4, 5]:
        return 'Spring'
    elif month in [6, 7, 8]:
        return 'Summer'
    else:
        return 'Autumn'

visitors['season'] = visitors['baseYmd'].apply(get_season)
logger.info("계절 정보 추가 완료!")

# Lag features 생성
logger.info("Lag 특징을 생성 중...")
visitors = visitors.sort_values('baseYmd')
visitors['lag_1'] = visitors.groupby('signguCode')['touNum'].shift(1)  # 전날 방문자 수
visitors['lag_7'] = visitors.groupby('signguCode')['touNum'].shift(7)  # 전주 동일 요일 방문자 수
visitors['rolling_mean_7'] = visitors.groupby('signguCode')['touNum'].shift(1).rolling(window=7).mean()  # 지난 7일 평균 방문자 수
visitors['lag_3'] = visitors.groupby('signguCode')['touNum'].shift(3)  # 3일 전 방문자 수
visitors['rolling_std_7'] = visitors.groupby('signguCode')['touNum'].shift(1).rolling(window=7).std()  # 7일 표준편차
logger.info("Lag 특징 생성 완료!")

# 결측치 처리
logger.info("결측치를 처리 중...")
visitors.fillna(0, inplace=True)  # 결측치는 0으로 대체
logger.info("결측치 처리 완료!")

# 데이터 준비
logger.info("데이터를 모델 학습에 적합한 형태로 준비 중...")
data = visitors[['daywkDivNm', 'season', 'is_holiday', 'touDivNm', 'lag_1', 'lag_7', 'rolling_mean_7', 'touNum']]
data = pd.get_dummies(data, columns=['daywkDivNm', 'season', 'touDivNm'], drop_first=True)
data['log_touNum'] = np.log1p(data['touNum'])

X = data.drop(columns=['touNum', 'log_touNum'])
y = data['log_touNum']
logger.info("데이터 준비 완료!")

# 데이터 분할
logger.info("학습 데이터와 테스트 데이터로 분할 중...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
logger.info("데이터 분할 완료!")

# XGBoost 하이퍼파라미터 튜닝
logger.info("XGBoost 하이퍼파라미터 튜닝 시작 (RandomizedSearchCV 사용)...")
param_distributions = {
    'n_estimators': [100, 300, 500],
    'learning_rate': [0.01, 0.05, 0.1],
    'max_depth': [6, 8, 10],
    'subsample': [0.8, 1.0],
    'colsample_bytree': [0.8, 1.0]
}
xgb = XGBRegressor(random_state=42)

random_search = RandomizedSearchCV(
    estimator=xgb,
    param_distributions=param_distributions,
    n_iter=20,  # 시도할 조합의 수
    scoring='neg_mean_squared_error',
    cv=3, # 교차 검증 fold 수 증가
    verbose=1,
    random_state=42
)
logger.info("하이퍼파라미터 튜닝을 위한 학습 시작...")
random_search.fit(X_train, y_train)
logger.info("하이퍼파라미터 튜닝 완료!")

# 최적 하이퍼파라미터 확인
best_params = random_search.best_params_
logger.info(f"최적 하이퍼파라미터: {best_params}")

# 최적 모델로 재학습
logger.info("최적 모델로 재학습 중...")
model = XGBRegressor(**best_params, random_state=42)
model.fit(X_train, y_train)
logger.info("모델 재학습 완료!")

# 모델 평가
logger.info("모델 평가 중...")
y_pred = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
logger.info(f"평가 완료! 개선된 Root Mean Squared Error: {rmse:.2f}")

# 학습 데이터에 대한 평가
logger.info("학습 데이터에 대한 모델 평가 시작...")
y_train_pred = model.predict(X_train)
train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
logger.info(f"학습 데이터 평가 완료! RMSE: {train_rmse:.2f}")

# RMSE 비교 로그
if train_rmse - rmse > 0.5:
    logger.warning(f"학습 데이터와 테스트 데이터 RMSE 차이가 큽니다. 과적합 가능성 있음!")
else:
    logger.info(f"학습 데이터와 테스트 데이터 RMSE 차이가 적정 범위 내에 있습니다.")

# 미래 날짜 생성
logger.info("미래 날짜 데이터를 생성 중...")
future_dates = pd.date_range(start='2024-12-30', end='2025-12-31')
daywk_div_cd = [(i % 7) + 1 for i in range(len(future_dates))]
future_visitors = pd.DataFrame({
    'baseYmd': np.repeat(future_dates, 3),
    'daywkDivCd': np.tile(daywk_div_cd, 3),
    'season': np.tile(future_dates.map(get_season), 3),
    'is_holiday': np.tile([1 if d.date() in holiday_dates else 0 for d in future_dates], 3),
    'touDivNm': ['현지인(a)', '외지인(b)', '외국인(c)'] * len(future_dates)
})
logger.info("미래 날짜 데이터 생성 완료!")

# daywkDivCd를 daywkDivNm으로 매핑
logger.info("미래 데이터에 요일 정보를 추가 중...")
future_visitors['daywkDivNm'] = future_visitors['daywkDivCd'].apply(map_daywk_div_cd_to_name)
logger.info("요일 정보 추가 완료!")

# 원-핫 인코딩 적용
logger.info("미래 데이터를 학습 데이터와 동일한 형식으로 변환 중...")
future_data = pd.get_dummies(future_visitors, columns=['daywkDivNm', 'season', 'touDivNm'], drop_first=True)
missing_cols = set(X.columns) - set(future_data.columns)
for col in missing_cols:
    future_data[col] = 0
future_data = future_data[X.columns]
logger.info("변환 완료!")

# 방문자 수 예측
logger.info("미래 방문자 수를 예측 중...")
future_visitors['predicted_log_touNum'] = model.predict(future_data)
future_visitors['predicted_touNum'] = np.expm1(future_visitors['predicted_log_touNum'])
future_visitors['signguCode'] = visitors['signguCode']

# 결과 저장
logger.info("예측 결과를 MongoDB에 저장 중...")
future_visitors.drop(columns=['daywkDivCd', 'daywkDivNm', 'season', 'is_holiday', 'predicted_log_touNum'], inplace=True)
future_visitors['baseYmd'] = future_visitors['baseYmd'].dt.strftime('%Y%m%d')

predicted_records = future_visitors.to_dict(orient='records')
db.predicted_visitors.insert_many(predicted_records)
logger.info("예측 결과 저장 완료! MongoDB에 결과가 저장되었습니다.")

# 터미널 닫힘 방지
input("프로그램 실행이 완료되었습니다. 터미널을 닫으려면 Enter 키를 누르세요.")



# import pandas as pd
# from pymongo import MongoClient
# import numpy as np
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import mean_squared_error
# from sklearn.model_selection import RandomizedSearchCV
# from sklearn.preprocessing import StandardScaler
# import holidays
# from xgboost import XGBRegressor
# import logging

# # 한글 로그 설정
# # -*- coding: euc-kr -*-
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
# logger = logging.getLogger()

# # MongoDB 연결
# logger.info("MongoDB에 연결 중...")
# client = MongoClient("mongodb://localhost:27017/")
# db = client['mydatabase']

# # 데이터 로드
# logger.info("방문자 데이터를 MongoDB에서 로드 중...")
# visitors = pd.DataFrame(list(db.visitors.find()))
# logger.info(f"방문자 데이터 로드 완료! 데이터 개수: {len(visitors)}")

# logger.info("이벤트 데이터를 MongoDB에서 로드 중...")
# events = pd.DataFrame(list(db.events.find()))
# logger.info(f"이벤트 데이터 로드 완료! 데이터 개수: {len(events)}")

# # 날짜 형식 변환
# logger.info("날짜 형식을 변환 중...")
# visitors['baseYmd'] = pd.to_datetime(visitors['baseYmd'], format='%Y%m%d')
# events['eventstartdate'] = pd.to_datetime(events['eventstartdate'], format='%Y%m%d')
# events['eventenddate'] = pd.to_datetime(events['eventenddate'], format='%Y%m%d')
# logger.info("날짜 변환 완료!")

# # 지역 코드 매핑
# logger.info("지역 코드를 매핑 중...")
# visitors['mapped_areacode'] = visitors['areaCode'].replace({'26': '6'})
# logger.info("지역 코드 매핑 완료!")

# # 공휴일 여부 추가
# logger.info("공휴일 정보를 추가 중...")
# holiday_dates = set(holidays.KR(years=[2024, 2025]).keys())
# visitors['is_holiday'] = visitors['baseYmd'].dt.date.isin(holiday_dates).astype(int)
# logger.info("공휴일 정보 추가 완료!")

# # 요일 정보 추가
# logger.info("요일 정보를 매핑 중...")
# def map_daywk_div_cd_to_name(code):
#     day_mapping = {
#         "1": "Monday",
#         "2": "Tuesday",
#         "3": "Wednesday",
#         "4": "Thursday",
#         "5": "Friday",
#         "6": "Saturday",
#         "7": "Sunday"
#     }
#     return day_mapping.get(str(code), "Unknown")

# visitors['daywkDivNm'] = visitors['daywkDivCd'].apply(map_daywk_div_cd_to_name)
# logger.info("요일 정보 매핑 완료!")

# # 계절 정보 추가
# logger.info("계절 정보를 추가 중...")
# def get_season(date):
#     month = date.month
#     if month in [12, 1, 2]:
#         return 'Winter'
#     elif month in [3, 4, 5]:
#         return 'Spring'
#     elif month in [6, 7, 8]:
#         return 'Summer'
#     else:
#         return 'Autumn'

# visitors['season'] = visitors['baseYmd'].apply(get_season)
# logger.info("계절 정보 추가 완료!")

# # Lag features 생성
# logger.info("Lag 특징을 생성 중...")
# visitors = visitors.sort_values('baseYmd')
# visitors['lag_1'] = visitors.groupby('areaCode')['touNum'].shift(1)  # 전날 방문자 수
# visitors['lag_7'] = visitors.groupby('areaCode')['touNum'].shift(7)  # 전주 동일 요일 방문자 수
# visitors['rolling_mean_7'] = visitors.groupby('areaCode')['touNum'].shift(1).rolling(window=7).mean()  # 지난 7일 평균 방문자 수
# visitors['lag_3'] = visitors.groupby('areaCode')['touNum'].shift(3)  # 3일 전 방문자 수
# visitors['rolling_std_7'] = visitors.groupby('areaCode')['touNum'].shift(1).rolling(window=7).std()  # 7일 표준편차
# logger.info("Lag 특징 생성 완료!")

# # 결측치 처리
# logger.info("결측치를 처리 중...")
# visitors.fillna(0, inplace=True)  # 결측치는 0으로 대체
# logger.info("결측치 처리 완료!")

# # 데이터 준비
# logger.info("데이터를 모델 학습에 적합한 형태로 준비 중...")
# data = visitors[['daywkDivNm', 'season', 'is_holiday', 'touDivNm', 'lag_1', 'lag_7', 'rolling_mean_7', 'touNum']]
# data = pd.get_dummies(data, columns=['daywkDivNm', 'season', 'touDivNm'], drop_first=True)
# data['log_touNum'] = np.log1p(data['touNum'])

# X = data.drop(columns=['touNum', 'log_touNum'])
# y = data['log_touNum']
# logger.info("데이터 준비 완료!")

# # 데이터 분할
# logger.info("학습 데이터와 테스트 데이터로 분할 중...")
# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
# logger.info("데이터 분할 완료!")

# # XGBoost 하이퍼파라미터 튜닝
# logger.info("XGBoost 하이퍼파라미터 튜닝 시작 (RandomizedSearchCV 사용)...")
# param_distributions = {
#     'n_estimators': [100, 300, 500],
#     'learning_rate': [0.01, 0.05, 0.1],
#     'max_depth': [6, 8, 10],
#     'subsample': [0.8, 1.0],
#     'colsample_bytree': [0.8, 1.0]
# }
# xgb = XGBRegressor(random_state=42)

# random_search = RandomizedSearchCV(
#     estimator=xgb,
#     param_distributions=param_distributions,
#     n_iter=20,  # 시도할 조합의 수
#     scoring='neg_mean_squared_error',
#     cv=3, # 교차 검증 fold 수 증가
#     verbose=1,
#     random_state=42
# )
# logger.info("하이퍼파라미터 튜닝을 위한 학습 시작...")
# random_search.fit(X_train, y_train)
# logger.info("하이퍼파라미터 튜닝 완료!")

# # 최적 하이퍼파라미터 확인
# best_params = random_search.best_params_
# logger.info(f"최적 하이퍼파라미터: {best_params}")

# # 최적 모델로 재학습
# logger.info("최적 모델로 재학습 중...")
# model = XGBRegressor(**best_params, random_state=42)
# model.fit(X_train, y_train)
# logger.info("모델 재학습 완료!")

# # 모델 평가
# logger.info("모델 평가 중...")
# y_pred = model.predict(X_test)
# rmse = np.sqrt(mean_squared_error(y_test, y_pred))
# logger.info(f"평가 완료! 개선된 Root Mean Squared Error: {rmse:.2f}")

# # 학습 데이터에 대한 평가
# logger.info("학습 데이터에 대한 모델 평가 시작...")
# y_train_pred = model.predict(X_train)
# train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
# logger.info(f"학습 데이터 평가 완료! RMSE: {train_rmse:.2f}")

# # RMSE 비교 로그
# if train_rmse - rmse > 0.5:
#     logger.warning(f"학습 데이터와 테스트 데이터 RMSE 차이가 큽니다. 과적합 가능성 있음!")
# else:
#     logger.info(f"학습 데이터와 테스트 데이터 RMSE 차이가 적정 범위 내에 있습니다.")

# # 미래 날짜 생성
# logger.info("미래 날짜 데이터를 생성 중...")
# future_dates = pd.date_range(start='2024-12-30', end='2025-12-31')
# daywk_div_cd = [(i % 7) + 1 for i in range(len(future_dates))]
# future_visitors = pd.DataFrame({
#     'baseYmd': np.repeat(future_dates, 3),
#     'daywkDivCd': np.tile(daywk_div_cd, 3),
#     'season': np.tile(future_dates.map(get_season), 3),
#     'is_holiday': np.tile([1 if d.date() in holiday_dates else 0 for d in future_dates], 3),
#     'touDivNm': ['현지인(a)', '외지인(b)', '외국인(c)'] * len(future_dates)
# })
# logger.info("미래 날짜 데이터 생성 완료!")

# # daywkDivCd를 daywkDivNm으로 매핑
# logger.info("미래 데이터에 요일 정보를 추가 중...")
# future_visitors['daywkDivNm'] = future_visitors['daywkDivCd'].apply(map_daywk_div_cd_to_name)
# logger.info("요일 정보 추가 완료!")

# # 원-핫 인코딩 적용
# logger.info("미래 데이터를 학습 데이터와 동일한 형식으로 변환 중...")
# future_data = pd.get_dummies(future_visitors, columns=['daywkDivNm', 'season', 'touDivNm'], drop_first=True)
# missing_cols = set(X.columns) - set(future_data.columns)
# for col in missing_cols:
#     future_data[col] = 0
# future_data = future_data[X.columns]
# logger.info("변환 완료!")

# # 방문자 수 예측
# logger.info("미래 방문자 수를 예측 중...")
# future_visitors['predicted_log_touNum'] = model.predict(future_data)
# future_visitors['predicted_touNum'] = np.expm1(future_visitors['predicted_log_touNum'])
# future_visitors['mapped_areacode'] = '6'

# # 결과 저장
# logger.info("예측 결과를 MongoDB에 저장 중...")
# future_visitors.drop(columns=['daywkDivCd', 'daywkDivNm', 'season', 'is_holiday', 'predicted_log_touNum'], inplace=True)
# future_visitors['baseYmd'] = future_visitors['baseYmd'].dt.strftime('%Y%m%d')

# predicted_records = future_visitors.to_dict(orient='records')
# db.predicted_visitors.insert_many(predicted_records)
# logger.info("예측 결과 저장 완료! MongoDB에 결과가 저장되었습니다.")

# # 터미널 닫힘 방지
# input("프로그램 실행이 완료되었습니다. 터미널을 닫으려면 Enter 키를 누르세요.")
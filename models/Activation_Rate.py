# -*- coding: euc-kr -*-
import pandas as pd
from pymongo import MongoClient
import logging

# 한글 로그 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# MongoDB 연결 설정
logger.info("몽고DB 연결 중...")
client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
events_collection = db['events']
visitors_collection = db['visitors']
results_collection = db['results']  # 'results' 컬렉션 추가

# 시군구 코드 매핑: event_sigungucode -> visitor_sigungucode
sigungucode_mapping = {
    '10': '11305',  # 서울 강북구
    '100': '11500',  # 서울 강서구
    '1000': '11680',  # 서울 강남구
    '20': '11560',  # 서울 영등포구
    '21': '11170',  # 서울 용산구
    '22': '11380',  # 서울 은평구
    '23': '11110',  # 서울 종로구
    '25': '11260',  # 서울 중랑구
    '17': '11290',  # 서울 성북구
    '18': '11710',  # 서울 송파구
    '19': '11470',  # 서울 양천구
    '130': '11440',  # 서울 마포구
    '140': '11410',  # 서울 서대문구
    '141': '11230',  # 서울 동대문구
    '150': '11215',  # 서울 광진구
    '160': '11200',  # 서울 성동구
    '233': '11740',  # 서울 강동구
    '244': '11530',  # 서울 구로구
    '255': '11350',  # 서울 노원구
    '24': '11140',  # 서울 중구
    '15': '11650',  # 서울 서초구
    '122': '11590',  # 서울 동작구
    '123': '11620',  # 서울 관악구
    '124': '11545',  # 서울 금천구

    '222': '28245',  # 인천 계양구
    '223': '28140',  # 인천 동구
    '224': '28177',  # 인천 미추홀구
    '225': '28237',  # 인천 부평구
    '226': '28260',  # 인천 서구
    '227': '28110',  # 인천 중구
    '228': '28200',  # 인천 남동구
    '229': '28185',  # 인천 연수구
    '230': '28710',  # 인천 강화군
    '247': '28720',  # 인천 옹진군

    '3': '26710',  # 부산 기장군
    '12': '26500',  # 부산 수영구
    '13': '26470',  # 부산 연제구
    '14': '26200',  # 부산 영도구
    '16': '26350',  # 부산 해운대구
    '2': '26410',  # 부산 금정구
    '6': '26260',  # 부산 동래구
    '7': '26230',  # 부산 부산진구
    '9': '26530',  # 부산 사상구
    '1': '26440',  # 부산 강서구
    '4': '26290',  # 부산 남구
    '5': '26170',  # 부산 동구
    '55': '26380',  # 부산 사하구
    '56': '26110',  # 부산 중구
    '11': '26140',  # 부산 서구

    '2000': '31140',  # 울산 남구
    '2001': '31110',  # 울산 중구
    '2002': '31200',  # 울산 북구
    '3333': '31170',  # 울산 동구
    '500': '31710',  # 울산 울주군

    '200': '27290',  # 대구 달서구
    '111': '27200',  # 대구 남구
    '112': '27200',  # 대구 서구
    '8': '27110',  # 대구 중구
    '50': '27230',  # 대구 북구
    '333': '27710',  # 대구 달성군
    '444': '27260',  # 대구 수성구
    '555': '27720',  # 대구 군위군

    '3002': '30200',  # 대전 유성구
    '3000': '30110',  # 대전 동구
    '3003': '30170',  # 대전 서구
    '3004': '30230',  # 대전 대덕구
    '3005': '30140',  # 대전 중구

    '4000': '29155',  # 광주 남구
    '4001': '29110',  # 광주 동구
    '4002': '29140',  # 광주 서구
    '4003': '29200',  # 광주 광산구
    '4004': '29170',  # 광주 북구
}

def extract_district_name(addr1):
    """
    주소에서 시군구명을 추출합니다.
    예: "부산광역시 사상구 감전로 123 (상동)"에서 '사상구'를 추출합니다.
    """
    if not isinstance(addr1, str):
        return None
    parts = addr1.split(' ')
    for part in parts:
        if '구' in part or '군' in part or '시' in part:
            return part
    return None

# 축제 정보 가져오기
logger.info("1차 API 데이터를 가져오는 중...")
events = pd.DataFrame(list(events_collection.find()))
logger.info(f"1차 API 데이터 가져오기 완료! 데이터 개수: {len(events)}")

# 지역 방문자수 정보 가져오기
logger.info("2차 API 데이터를 가져오는 중...")
visitors = pd.DataFrame(list(visitors_collection.find()))
logger.info(f"2차 API 데이터 가져오기 완료! 데이터 개수: {len(visitors)}")

# 날짜 형식 변환
logger.info("날짜 형식 변환 중...")
events['eventstartdate'] = pd.to_datetime(events['eventstartdate'], format='%Y%m%d', errors='coerce')
events['eventenddate'] = pd.to_datetime(events['eventenddate'], format='%Y%m%d', errors='coerce')
visitors['baseYmd'] = pd.to_datetime(visitors['baseYmd'], format='%Y%m%d', errors='coerce')

# 시군구별 분석 데이터 준비
logger.info("시군구별 분석 데이터 준비 중...")
analysis_data = []

for _, event in events.iterrows():
    sigungucode = str(event.get('sigungucode', ''))
    visitor_sigungucode = sigungucode_mapping.get(sigungucode)
    
    if not visitor_sigungucode:
        logger.warning(f"sigungucode 매핑 실패: {sigungucode} (Event ID: {event.get('contentid', 'Unknown ID')})")
        continue
    
    # 시군구명 추출
    addr1 = event.get('addr1', '')
    district_name = extract_district_name(addr1)
    if not district_name:
        logger.warning(f"시군구명 추출 실패: {addr1} (Event ID: {event.get('contentid', 'Unknown ID')})")
        continue
    
    start_date = event.get('eventstartdate')
    end_date = event.get('eventenddate')
    event_name = event.get('title', '제목 없음')
    contentid = event.get('contentid', 'Unknown ID')
    firstimage = event.get('firstimage', '')
    
    if pd.isna(start_date) or pd.isna(end_date):
        logger.warning(f"축제 '{event_name}'의 시작일 또는 종료일이 유효하지 않습니다.")
        continue
    
    # 축제 기간 동안 방문자 데이터 필터링
    festival_visitors = visitors[
        (visitors['signguCode'] == visitor_sigungucode) &
        (visitors['baseYmd'] >= start_date) &
        (visitors['baseYmd'] <= end_date)
    ]
    logger.info(f"축제 '{event_name}' ({district_name}) 기간 데이터 개수: {len(festival_visitors)}")
    
    # 축제 기간 이전 방문자 데이터 필터링
    pre_festival_visitors = visitors[
        (visitors['signguCode'] == visitor_sigungucode) &
        (visitors['baseYmd'] < start_date)
    ]
    logger.info(f"축제 '{event_name}' ({district_name}) 이전 데이터 개수: {len(pre_festival_visitors)}")
    
    if not festival_visitors.empty and not pre_festival_visitors.empty:
        mean_festival = festival_visitors['touNum'].mean()
        mean_pre_festival = pre_festival_visitors['touNum'].mean()
        activation_rate = (mean_festival / mean_pre_festival) * 100 - 100
        activation_rate = round(activation_rate, 2)  # 소수점 두 번째 자리에서 반올림
        activation_rate_str = f"{activation_rate:.2f}%"  # 문자열 형식으로 변환
        
        analysis_data.append({
            'title': event_name,
            'addr1': addr1,
            'eventstartdate': event['eventstartdate'].strftime('%Y%m%d'),
            'eventenddate': event['eventenddate'].strftime('%Y%m%d'),
            'contentid': contentid,
            'activation_rate': activation_rate_str,
            'firstimage': firstimage
        })
    else:
        logger.warning(f"축제 '{event_name}' ({district_name})의 데이터가 부족합니다.")

logger.info(f"시군구별 분석 대상 축제 데이터 준비 완료! 총 {len(analysis_data)}건")

# Prophet 모델은 이번 예제에서는 사용하지 않고, 단순히 활성화 정도를 계산하여 저장합니다.

# results 컬렉션에 데이터 삽입
if analysis_data:
    try:
        # 기존 데이터 삭제 (선택 사항)
        # results_collection.delete_many({})
        
        # 일괄 삽입
        results_collection.insert_many(analysis_data)
        logger.info(f"'results' 컬렉션에 {len(analysis_data)}개의 문서를 성공적으로 삽입했습니다.")
    except Exception as e:
        logger.error(f"'results' 컬렉션에 삽입 중 오류 발생: {e}")
else:
    logger.warning("분석 데이터가 없어 'results' 컬렉션에 삽입할 문서가 없습니다.")

logger.info("프로그램 실행이 완료되었습니다.")

# 터미널 닫힘 방지
input("프로그램 실행이 완료되었습니다. 터미널을 닫으려면 Enter 키를 누르세요.")
# -*- coding: euc-kr -*-
import pandas as pd
from pymongo import MongoClient
import logging

# �ѱ� �α� ����: INFO ���� �̻� �޽����� ǥ���ϰ�, �ð��� �޽����� �Բ� ���
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# MongoDB ���� ����
logger.info("����DB ���� ��...")
client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
events_collection = db['events']            # ���� ������ ����ִ� �÷���
visitors_collection = db['visitors']        # �湮�� ������ ����ִ� �÷���
results_collection = db['results']          # �м� ����� ������ �÷���

# �ñ��� �ڵ� ����: ���� �������� sigungucode�� �湮�� �������� signguCode�� �°� ��ȯ
sigungucode_mapping = {
    '10': '11305',  # ���� ���ϱ�
    '100': '11500',  # ���� ������
    '1000': '11680',  # ���� ������
    '20': '11560',  # ���� ��������
    '21': '11170',  # ���� ��걸
    '22': '11380',  # ���� ����
    '23': '11110',  # ���� ���α�
    '25': '11260',  # ���� �߶���
    '17': '11290',  # ���� ���ϱ�
    '18': '11710',  # ���� ���ı�
    '19': '11470',  # ���� ��õ��
    '130': '11440',  # ���� ������
    '140': '11410',  # ���� ���빮��
    '141': '11230',  # ���� ���빮��
    '150': '11215',  # ���� ������
    '160': '11200',  # ���� ������
    '233': '11740',  # ���� ������
    '244': '11530',  # ���� ���α�
    '255': '11350',  # ���� �����
    '24': '11140',  # ���� �߱�
    '15': '11650',  # ���� ���ʱ�
    '122': '11590',  # ���� ���۱�
    '123': '11620',  # ���� ���Ǳ�
    '124': '11545',  # ���� ��õ��

    '222': '28245',  # ��õ ��籸
    '223': '28140',  # ��õ ����
    '224': '28177',  # ��õ ����Ȧ��
    '225': '28237',  # ��õ ����
    '226': '28260',  # ��õ ����
    '227': '28110',  # ��õ �߱�
    '228': '28200',  # ��õ ������
    '229': '28185',  # ��õ ������
    '230': '28710',  # ��õ ��ȭ��
    '247': '28720',  # ��õ ������

    '3': '26710',  # �λ� ���屺
    '12': '26500',  # �λ� ������
    '13': '26470',  # �λ� ������
    '14': '26200',  # �λ� ������
    '16': '26350',  # �λ� �ؿ�뱸
    '2': '26410',  # �λ� ������
    '6': '26260',  # �λ� ������
    '7': '26230',  # �λ� �λ�����
    '9': '26530',  # �λ� ���
    '1': '26440',  # �λ� ������
    '4': '26290',  # �λ� ����
    '5': '26170',  # �λ� ����
    '55': '26380',  # �λ� ���ϱ�
    '56': '26110',  # �λ� �߱�
    '11': '26140',  # �λ� ����

    '2000': '31140',  # ��� ����
    '2001': '31110',  # ��� �߱�
    '2002': '31200',  # ��� �ϱ�
    '3333': '31170',  # ��� ����
    '500': '31710',  # ��� ���ֱ�

    '200': '27290',  # �뱸 �޼���
    '111': '27200',  # �뱸 ����
    '112': '27200',  # �뱸 ����
    '8': '27110',  # �뱸 �߱�
    '50': '27230',  # �뱸 �ϱ�
    '333': '27710',  # �뱸 �޼���
    '444': '27260',  # �뱸 ������
    '555': '27720',  # �뱸 ������

    '3002': '30200',  # ���� ������
    '3000': '30110',  # ���� ����
    '3003': '30170',  # ���� ����
    '3004': '30230',  # ���� �����
    '3005': '30140',  # ���� �߱�

    '4000': '29155',  # ���� ����
    '4001': '29110',  # ���� ����
    '4002': '29140',  # ���� ����
    '4003': '29200',  # ���� ���걸
    '4004': '29170',  # ���� �ϱ�
}

def extract_district_name(addr1):
    """
    �ּ� ���ڿ����� '��', '��', '��' ���� �������� ������ ã�� ��ȯ�ϴ� �Լ�.
    ��: "�λ걤���� ��� ������ 123 (��)" �� '���'
    """
    if not isinstance(addr1, str):
        return None
    parts = addr1.split(' ')
    for part in parts:
        if '��' in part or '��' in part or '��' in part:
            return part
    return None

# 1�� API(���� ����) ������ ��������
logger.info("1�� API �����͸� �������� ��...")
events = pd.DataFrame(list(events_collection.find()))
logger.info(f"1�� API ������ �������� �Ϸ�! ������ ����: {len(events)}")

# 2�� API(�湮�� ����) ������ ��������
logger.info("2�� API �����͸� �������� ��...")
visitors = pd.DataFrame(list(visitors_collection.find()))
logger.info(f"2�� API ������ �������� �Ϸ�! ������ ����: {len(visitors)}")

# ��¥ ���� ��ȯ: 'YYYYMMDD' ���¸� datetime �������� ��ȯ
logger.info("��¥ ���� ��ȯ ��...")
events['eventstartdate'] = pd.to_datetime(events['eventstartdate'], format='%Y%m%d', errors='coerce')
events['eventenddate'] = pd.to_datetime(events['eventenddate'], format='%Y%m%d', errors='coerce')
visitors['baseYmd'] = pd.to_datetime(visitors['baseYmd'], format='%Y%m%d', errors='coerce')

# �ñ����� �м� ������ �غ�
logger.info("�ñ����� �м� ������ �غ� ��...")
analysis_data = []

# �� �������� �湮�� �����͸� �м�
for _, event in events.iterrows():
    # �̺�Ʈ�� �ش��ϴ� �ñ��� �ڵ� ����
    sigungucode = str(event.get('sigungucode', ''))
    visitor_sigungucode = sigungucode_mapping.get(sigungucode)
    
    if not visitor_sigungucode:
        # ���� ���� �� ��� �α�
        logger.warning(f"sigungucode ���� ����: {sigungucode} (Event ID: {event.get('contentid', 'Unknown ID')})")
        continue
    
    # �ּҿ��� �ñ����� ����
    addr1 = event.get('addr1', '')
    district_name = extract_district_name(addr1)
    if not district_name:
        logger.warning(f"�ñ����� ���� ����: {addr1} (Event ID: {event.get('contentid', 'Unknown ID')})")
        continue
    
    # ���� ������, ������, ������, contentid �� �ʿ� ���� ��������
    start_date = event.get('eventstartdate')
    end_date = event.get('eventenddate')
    event_name = event.get('title', '���� ����')
    contentid = event.get('contentid', 'Unknown ID')
    sigungucode = event.get('sigungucode')
    firstimage = event.get('firstimage', '')
    mapx = event.get('mapx')
    mapy = event.get('mapy')
    
    # ��¥�� ��ȿ���� �˻�
    if pd.isna(start_date) or pd.isna(end_date):
        logger.warning(f"���� '{event_name}'�� ������ �Ǵ� �������� ��ȿ���� �ʽ��ϴ�.")
        continue
    
    # ���� �Ⱓ ���� �ش� �ñ����� �湮�� ������ ����
    festival_visitors = visitors[
        (visitors['signguCode'] == visitor_sigungucode) &
        (visitors['baseYmd'] >= start_date) &
        (visitors['baseYmd'] <= end_date)
    ]
    logger.info(f"���� '{event_name}' ({district_name}) �Ⱓ ������ ����: {len(festival_visitors)}")
    
    # ���� ���� ������ �湮�� ������ ����
    pre_festival_visitors = visitors[
        (visitors['signguCode'] == visitor_sigungucode) &
        (visitors['baseYmd'] < start_date)
    ]
    logger.info(f"���� '{event_name}' ({district_name}) ���� ������ ����: {len(pre_festival_visitors)}")
    
    # ���� �Ⱓ �����Ϳ� ���� �����Ͱ� ��� ���� ���� Ȱ��ȭ ���� ���
    if not festival_visitors.empty and not pre_festival_visitors.empty:
        mean_festival = festival_visitors['touNum'].mean()          # ���� �Ⱓ ��� �湮�� ��
        mean_pre_festival = pre_festival_visitors['touNum'].mean()  # ���� ���� ��� �湮�� ��
        activation_rate = (mean_festival / mean_pre_festival) * 100 - 100
        activation_rate = round(activation_rate, 2)  # �Ҽ��� ��° �ڸ� �ݿø�
        activation_rate_str = f"{activation_rate:.2f}%"
        
        # �м� ��� ������ ����Ʈ�� �߰�
        analysis_data.append({
            'title': event_name,
            'addr1': addr1,
            'sigungucode': sigungucode,
            'eventstartdate': event['eventstartdate'].strftime('%Y%m%d'),
            'eventenddate': event['eventenddate'].strftime('%Y%m%d'),
            'contentid': contentid,
            'activation_rate': activation_rate_str,
            'firstimage': firstimage,
            'mapx': mapx,
            'mapy': mapy,
        })
    else:
        logger.warning(f"���� '{event_name}' ({district_name})�� �����Ͱ� �����մϴ�.")

logger.info(f"�ñ����� �м� ��� ���� ������ �غ� �Ϸ�! �� {len(analysis_data)}��")

# 'results' �÷��ǿ� �м� ��� ����
if analysis_data:
    try:
        # �ʿ��ϴٸ� ���� ������ ���� ���� (�ּ� ���� �� ���)
        # results_collection.delete_many({})

        # ��� ���� �ϰ� ����
        results_collection.insert_many(analysis_data)
        logger.info(f"'results' �÷��ǿ� {len(analysis_data)}���� ������ ���������� �����߽��ϴ�.")
    except Exception as e:
        logger.error(f"'results' �÷��ǿ� ���� �� ���� �߻�: {e}")
else:
    logger.warning("�м� �����Ͱ� ���� 'results' �÷��ǿ� ������ ������ �����ϴ�.")

logger.info("���α׷� ������ �Ϸ�Ǿ����ϴ�.")

# ���α׷� ���Ḧ ��ٸ��� ���� Enter ��� (IDE�� �͹̳��� �ٷ� ������ ���� ����)
input("���α׷� ������ �Ϸ�Ǿ����ϴ�. �͹̳��� �������� Enter Ű�� ��������.")
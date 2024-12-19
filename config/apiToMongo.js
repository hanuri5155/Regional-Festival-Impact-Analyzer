const mongoose = require('mongoose'); // MongoDB와 상호작용을 위한 mongoose 모듈
const axios = require('axios'); // REST API 호출을 위한 axios 모듈
require('dotenv').config(); // 환경 변수 설정

/**
 * MongoDB 연결 함수
 */
const connect = () => {
    mongoose.set('strictPopulate', false); // 잘못된 populate 사용 시 경고 비활성화

    mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 100, // 동시 연결 최대 100개
    });

    mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB 연결 성공');
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB 연결 에러:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.error('⚠️ MongoDB 연결이 끊어졌습니다. 재연결 시도 중...');
        connect(); // 재연결 시도
    });
};

/**
 * 축제 데이터 스키마 및 모델 정의 (1차 API용)
 */
const eventSchema = new mongoose.Schema({
    title: String,
    addr1: String,
    areacode: String,
    sigungucode: String,
    eventstartdate: String,
    eventenddate: String,
    contentid: String,
    mapx: String,
    mapy: String,
    firstimage: String,
});

const EventModel = mongoose.model('Event', eventSchema);

/**
 * 방문자 수 데이터 스키마 및 모델 정의 (2차 API용)
 */
const visitorSchema = new mongoose.Schema({
    signguCode: String,
    signguNm: String,
    daywkDivCd: String,
    daywkDivNm: String,
    touDivCd: String,
    touDivNm: String,
    touNum: Number,
    baseYmd: String,
});

// 복합 인덱스 추가 (성능 최적화)
visitorSchema.index({ signguCode: 1, baseYmd: 1, touDivNm: 1 });

const VisitorModel = mongoose.model('Visitor', visitorSchema);

/**
 * 축제 데이터 전처리 함수
 */
const preprocessEventData = (item) => {
    return {
        title: item.title,
        addr1: item.addr1,
        areacode: item.areacode,
        sigungucode: item.sigungucode,
        eventstartdate: item.eventstartdate,
        eventenddate: item.eventenddate,
        contentid: item.contentid,
        mapx: item.mapx,
        mapy: item.mapy,
        firstimage: item.firstimage,
    };
};


/**
 * 방문자 데이터 전처리 함수
 */
const preprocessVisitorData = (item) => {
    return {
        signguCode: item.signguCode,
        signguNm: item.signguNm,
        daywkDivCd: item.daywkDivCd,
        daywkDivNm: item.daywkDivNm,
        touDivCd: item.touDivCd,
        touDivNm: item.touDivNm,
        touNum: parseFloat(item.touNum),
        baseYmd: item.baseYmd,
    };
};

/**
 * 축제 데이터 API 호출 및 MongoDB 저장 함수
 * 필요할 때 호출
 */
const fetchEventDataAndStore = async () => {
    try {
        console.log('📡 축제 데이터 REST API 호출 중...');
        const response = await axios.get(process.env.EVENT_API_URL);
        // 실제 배열 경로: response.data.response.body.items.item
        const rawData = response.data?.response?.body?.items?.item;

        // 배열 형태인지 확인
        if (!Array.isArray(rawData)) {
            console.error('❌ 축제 데이터 응답이 예상했던 배열 형태가 아닙니다. 응답:', response.data);
            return;
        }

        console.log(`📦 축제 데이터 ${rawData.length}개 가져옴`);

        for (const item of rawData) {
            const processed = preprocessEventData(item);
            const existingData = await EventModel.findOne({ contentid: processed.contentid });
            if (!existingData) {
                await EventModel.create(processed);
                console.log(`✅ 축제 데이터 저장 성공: ${processed.title}`);
            } 
            else {
                console.log(`⚠️ 중복 축제 데이터 스킵: ${processed.title}`);
            }
        }

        console.log('🎉 모든 축제 데이터 저장 완료!');
    } catch (error) {
        console.error('❌ 축제 데이터 가져오기/저장 중 에러:', error);
    }
};

/**
 * 방문자 수 데이터 API 호출 및 MongoDB 저장 함수
 * 필요할 때 호출
 */
const fetchVisitorDataAndStore = async () => {
    try {
        console.log('📡 방문자 수 데이터 REST API 호출 중...');
        const response = await axios.get(process.env.VISITOR_API_URL);

        const rawData = response.data?.response?.body?.items?.item;

        if (!Array.isArray(rawData)) {
            console.error('❌ 방문자 수 데이터 응답이 예상했던 배열 형태가 아닙니다. 응답:', response.data);
            return;
        }

        console.log(`📦 방문자 수 데이터 ${rawData.length}개 가져옴`);

        const BATCH_SIZE = 1000; // 한 번에 처리할 데이터 수
        console.time('전체 데이터 저장 시간');

        for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
            const batch = rawData.slice(i, i + BATCH_SIZE); // 현재 배치 데이터
            const bulkOps = batch.map((item) => {
                const processed = preprocessVisitorData(item);
                return {
                    updateOne: {
                        filter: {
                            signguCode: processed.signguCode,
                            baseYmd: processed.baseYmd,
                            touDivNm: processed.touDivNm,
                        },
                        update: { $set: processed },
                        upsert: true, // 데이터가 없으면 삽입
                    },
                };
            });

            console.time(`Batch ${i / BATCH_SIZE + 1} 저장 시간`);
            try {
                const result = await VisitorModel.bulkWrite(bulkOps);
                console.log(
                    `✅ Batch ${i / BATCH_SIZE + 1} 저장 완료: ${result.upsertedCount || 0}개 추가, ${
                        result.modifiedCount || 0
                    }개 수정`
                );
            } catch (batchError) {
                console.error(`❌ Batch ${i / BATCH_SIZE + 1} 저장 중 에러:`, batchError);
            }
            console.timeEnd(`Batch ${i / BATCH_SIZE + 1} 저장 시간`);
        }

        console.timeEnd('전체 데이터 저장 시간');
        console.log('🎉 모든 방문자 수 데이터 저장 완료!');
    } catch (error) {
        console.error('❌ 방문자 수 데이터 가져오기/저장 중 에러:', error);
    }
};

module.exports = { connect, fetchEventDataAndStore, fetchVisitorDataAndStore, EventModel, VisitorModel };
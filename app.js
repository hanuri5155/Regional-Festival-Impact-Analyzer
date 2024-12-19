require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();

// 서버 포트 설정
app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');

// Nunjucks 템플릿 엔진 설정
nunjucks.configure('views', {
  express: app,
  watch: true,
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB 연결
let db;
(async () => {
  try {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/');
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || 'mydatabase');
    console.log("MongoDB connected");
  } catch (error) {s
    console.error("MongoDB 연결 실패:", error);
  }
})();

// 메인 페이지 라우터
app.get('/', async (req, res) => {
    try {
        const results = await db.collection('results').find({}).toArray();
        res.render('layout', { results: JSON.stringify(results) });
    } catch (error) {
        console.error('데이터 가져오기 중 에러:', error);
        res.status(500).send('데이터를 가져오는 중 오류 발생');
    }
});


// 404 처리
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 존재하지 않습니다.`);
  error.status = 404;
  next(error);
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// 서버 실행
app.listen(app.get('port'), () => {
  console.log(`${app.get('port')}번 포트에서 서버 실행 중`);
});

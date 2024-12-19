require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();

// 서버가 사용할 포트를 설정. .env파일에 PORT 지정 없으면 기본값 8001
app.set('port', process.env.PORT || 8001);

// 뷰 엔진을 HTML로 설정(실제 표시될 템플릿 엔진: Nunjucks)
app.set('view engine', 'html');

// nunjucks 템플릿 엔진 설정
// views 폴더에 있는 html 파일을 템플릿으로 사용하고, watch: true로 템플릿 변경 시 자동 반영
nunjucks.configure('views', {
  express: app,
  watch: true,
});

// 정적 파일을 제공할 디렉토리 지정: public 폴더에 있는 CSS, JS, 이미지 등을 클라이언트에 서빙
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB 연결 설정
let db;
(async () => {
  try {
    // MongoDB 클라이언트 생성. 환경변수 MONGO_URI 사용, 미지정시 로컬 mongodb://localhost:27017/
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/');
    await client.connect(); // MongoDB 연결 시도
    // 연결 후 사용할 데이터베이스 선택. 환경변수 MONGO_DB_NAME 없으면 'mydatabase' 사용
    db = client.db(process.env.MONGO_DB_NAME || 'mydatabase');
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB 연결 실패:", error);
  }
})();

// 메인 페이지 라우팅: '/' 경로로 요청이 오면 데이터베이스의 'results'와 'predicted_visitors' 컬렉션에서
// 모든 문서를 가져와서 layout.html 템플릿에 렌더링
app.get('/', async (req, res) => {
  try {
      // results 컬렉션에서 모든 문서 조회
      const results = await db.collection('results').find({}).toArray();
      // predicted_visitors 컬렉션에서 모든 문서 조회
      const predictedVisitors = await db.collection('predicted_visitors').find({}).toArray();

      // layout 템플릿(html)에 데이터를 넘김.
      // JSON.stringify로 배열을 문자열로 변환하여 템플릿 내 스크립트에서 사용할 수 있게 함
      res.render('layout', { 
          results: JSON.stringify(results),
          predictedVisitors: JSON.stringify(predictedVisitors) 
      });
  } catch (error) {
      console.error('데이터 가져오기 중 에러:', error);
      res.status(500).send('데이터를 가져오는 중 오류 발생');
  }
});

// 404 처리 미들웨어: 등록되지 않은 라우트로 요청 시 에러 처리
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 존재하지 않습니다.`);
  error.status = 404;
  next(error);
});

// 에러 처리 미들웨어: 애플리케이션 내 발생한 에러 처리
app.use((err, req, res, next) => {
  res.locals.message = err.message; // 템플릿에서 message 사용 가능
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  // error.html 렌더링하며 에러 정보 표시
  res.render('error');
});

// 서버 실행: 지정한 포트에서 서버를 시작
app.listen(app.get('port'), () => {
  console.log(`${app.get('port')}번 포트에서 서버 실행 중`);
});
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();
app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
  express: app,
  watch: true,
});

// MongoDB 연결
let db;
(async () => {
  const client = new MongoClient('mongodb://localhost:27017/');
  await client.connect();
  db = client.db('mydatabase'); // 실제 사용 DB명으로 변경
  console.log("MongoDB connected");
})();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  try {
    const results = await db.collection('results').find({}).toArray();
    // JSON 문자열로 변환
    const resultsData = JSON.stringify(results);
    // 템플릿에 전달
    res.render('layout', { results: resultsData });
  } catch (error) {
    console.error('데이터 가져오기 중 에러:', error);
    res.status(500).send('데이터를 가져오는 중 오류 발생');
  }
});

// 404 처리
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error); 
});

// 에러 처리
app.use((err, req, res, next) => {
  res.locals.message = err.message; 
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {}; 
  res.status(err.status || 500); 
  res.render('error');
});

app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});
require('dotenv').config(); // 환경 변수 로드
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
// const passportConfig = require('./passport'); // 패스포트 설정이 있다면 주석 해제

// apiToMongo.js에서 내보낸 DB 연결 및 데이터 가져오기 함수
const { connect, fetchEventDataAndStore, fetchVisitorDataAndStore } = require('./config/apiToMongo.js');

const app = express();

// 포트 및 템플릿 엔진 설정
app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
  express: app,
  watch: false,
});

// MongoDB 연결 (서버 시작 시 한 번만)
connect();  // 데이터베이스 연결 설정 및 오류 시 재연결 로직 포함

// 여기서 필요한 미들웨어들 (현재는 모두 주석처리 되어 있어 필요시 해제)
// app.use(morgan('dev'));
// app.use(express.static(path.join(__dirname, 'public')));
// app.use('/img', express.static(path.join(__dirname, 'uploads')));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser(process.env.COOKIE_SECRET));
// app.use(
//   session({
//     resave: false,
//     saveUninitialized: false,
//     secret: process.env.COOKIE_SECRET,
//     cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' },
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());

// 새로운 라우트: 축제 데이터 업데이트 요청 시 실행
// 404 에러 처리 전에 위치시켜야 함
app.get('/updateEvents', async (req, res) => {
  await fetchEventDataAndStore();
  res.send('축제 데이터 업데이트 완료!');
});

// 새로운 라우트: 방문자 데이터 업데이트 요청 시 실행
// 마찬가지로 404 에러 처리 전에 위치
app.get('/updateVisitors', async (req, res) => {
  await fetchVisitorDataAndStore();
  res.send('방문자 수 데이터 업데이트 완료!');
});

// 9. 404 에러 처리 미들웨어 (라우트 등록 후)
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error); 
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  res.locals.message = err.message; 
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {}; 
  res.status(err.status || 500); 
  // 여기에 'error' 템플릿이 필요합니다. 없을 경우 텍스트 응답으로 수정할 수 있습니다.
  res.render('error');
});

app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});
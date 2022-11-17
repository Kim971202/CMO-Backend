const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 9000;

const memberapi = require("./routes/memberapi");
const vuebbsRoute = require("./routes/vuebbs-route");
const boardapi = require("./routes/boardapi");

/////////////////// APT API //////////////////////////////////
const elvRouter = require("./routes/elvRouter");
const parcelRouter = require("./routes/parcelRouter");
const elecCarRouter = require("./routes/elecCarRouter");
const complaintRouter = require("./routes/complaintRouter");
const emsRouter = require("./routes/emsRouter");
const noticeRouter = require("./routes/noticeRouter");
const voteRouter = require("./routes/voteRouter");
const mngFeeRouter = require("./routes/mngFeeRouter");
const donghoInfoRoute = require("./routes/donghoInfo-route");
const fileUploadRouter = require("./common/commonApi");
const dashBoardRouter = require("./routes/dashBoardRouter");
/////////////////////////////////////////////////////////////

const corsOptions = {
  origin: "http://localhost:8080", //허용할 도메인 설정
  optionsSuccessStatus: 200,
};

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  //res.header("Access-Control-Allow-Headers", "content-type");
  res.header("Access-Control-Allow-Headers", "content-type, access-token"); //Vue.js 3 & NodeJS  Vue CLI 로그인 처리 3 테스트 시 반드시 필요
  next();
});

app.use("/members", memberapi);
app.use("/vueboard", vuebbsRoute);
app.use("/boards", boardapi);

/////////////////// APT API //////////////////////////////////
app.use("/elv", elvRouter);
app.use("/parcel", parcelRouter);
app.use("/elecCar", elecCarRouter);
app.use("/complaint", complaintRouter);
app.use("/ems", emsRouter);
app.use("/notice", noticeRouter);
app.use("/vote", voteRouter);
app.use("/mngFee", mngFeeRouter);
app.use("/donghoInfo", donghoInfoRoute);
app.use("/fileUpload", fileUploadRouter);
app.use("/dashBoard", dashBoardRouter);
/////////////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("Hello Node.js!");
});

app.listen(port, () => {
  console.log(`서버가 실행됩니다. http://localhost:${port}`);
});

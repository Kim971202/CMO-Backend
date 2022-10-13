var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

//목록조회
router.get("/list", async (req, res, next) => {
  let {
    page = 1, //             현재페이지
    size = 10, //        페이지 당 결과수
    title = "", //            검색조건(title)
    author = "",
  } = req.query;

  console.log("게시판 목록조회.............");
  console.log(page, size, author);
  //http://localhost:9000/vueboard/list?size=10&page=1

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;
  let strSQL = "";
  let strWhere = " where ";

  try {
    if (title !== "") {
      strSQL += ` ${strWhere} title like '%${title}'`;
      strWhere = " and ";
    }
    if (author !== "") {
      strSQL += ` ${strWhere} author like '%${author}%'`;
    }
    let sql = `select count(*) as cnt from vue_bbs ${strSQL}`;
    console.log("sql =>" + sql);
    const data = await pool.query(sql);
    //console.log(data[0][0]);
    totalCount = data[0][0].cnt; //총 게시글 수
    total_page = Math.ceil(totalCount / size); //총 페이지 수

    start = (page - 1) * size; //시작행
    start_page = page - ((page - 1) % block);
    end_page = start_page + block - 1;

    console.log("start=%d", start);
    console.log("end=%d", end);
    if (total_page < end_page) end_page = total_page;

    let paging = {
      totalCount,
      total_page,
      page,
      start_page,
      end_page,
      ipp: size,
    };

    sql = `select idx, TITLE as title, AUTHOR as author, DATE_FORMAT(CREATED_AT, '%Y-%m-%d %h:%i:%s') as created_at 
                 from vue_bbs ${strSQL}
                 order by idx desc
                 limit ?, ?`;
    console.log("sql2=>" + sql);

    const data2 = await pool.query(sql, [Number(start), Number(end)]);
    let list = data2[0];

    //let jsonResult = { success: true, list: list, paging: paging };
    let jsonResult = { resultCode: "00", list: list, paging: paging };
    console.log(jsonResult);

    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//공지사항 상세보기
router.get("/detail/:idx", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    idx = 0,
  } = req.params;

  //console.log(idx);
  //http://localhost:9000/vueboard/detail/idx=1

  try {
    const sql = `select title, author,contents,
                        DATE_FORMAT(created_at, '%Y-%m-%d %h:%i:%s') as created_at 
                 from vue_bbs
                 where idx = ?`;
    const data = await pool.query(sql, [idx]);

    let resultList = "";
    let title = "";
    let author = "";
    let contents = "";
    let created_at = "";

    resultList = data[0];
    if (resultList.length > 0) {
      title = resultList[0].title;
      author = resultList[0].author;
      contents = resultList[0].contents;
      created_at = resultList[0].created_at;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      idx,
      title,
      author,
      contents,
      created_at,
    };
    //console.log(resultList[0]);
    return res.json(resultList[0]);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//게시판 등록
router.post("/write", async (req, res, next) => {
  // console.log(JSON.stringify(req.body));
  // console.log(req.body);

  let { title = "", author = "", contents = "" } = req.body;

  console.log(title, author, contents);
  //http://localhost:9000/vueboard/write  {"title":"게시판","author":"홍길동","contents": “가나다라마바사아 자차카타...”}

  let resulCode = "00";
  if (title === "") resulCode = "10";

  if (author === "") resulCode = "10";

  if (contents === "") resulCode = "10";

  console.log("resulCode=> " + resulCode);

  if (resulCode === "00") {
    try {
      let sql = `insert into vue_bbs(title, author, contents) values (?, ?, ?) `;
      console.log("sql=>" + sql);
      const data = await pool.query(sql, [title, author, contents]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resulCode,
        resultMsg: "글이 등록되었습니다.",
      };

      return res.json(jsonResult);
    } catch (err) {
      console.log("test===============" + err);
      return res.status(500).json(err);
    }
  }
});

//게시판 수정
router.patch("/write", async (req, res, next) => {
  // console.log(JSON.stringify(req.body));
  // console.log(req.body);

  let { idx = 0, title = "", author = "", contents = "" } = req.body;
  console.log(idx, title, author, contents);

  //http://localhost:9000/vueboard/write  {"idx":1, title":"게시판","author":"홍길동","contents": “가나다라마바사아 자차카타...”}

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (title === "") resultCode = "10";

  if (author === "") resultCode = "10";

  if (contents === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `update vue_bbs set
                  title = ?, author =?, contents = ? 
                 where idx = ? `;
      console.log("sql=>" + sql);
      const data = await pool.query(sql, [title, author, contents, idx]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "글이 수정되었습니다.",
        idx,
      };

      return res.json(jsonResult);
    } catch (err) {
      console.log("test===============" + err);
      return res.status(500).json(err);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;

//게시판 삭제
router.delete("/delete/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  //http://localhost:9000/vueboard/delete  {"idx":1}

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `delete from vue_bbs where idx = ? `;
      console.log("sql=>" + sql);
      const data = await pool.query(sql, [idx]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "글이 삭제되었습니다.",
      };

      return res.json(jsonResult);
    } catch (err) {
      console.log("test===============" + err);
      return res.status(500).json(err);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;

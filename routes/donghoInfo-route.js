/**
 * 프로그램내용 : 동/호 정보를 취득하는 공통 모듈
 * 작성자 : 장문욱
 * 최초작성일 : 2022년10월26일
 * 수정자 : 김동현
 * 최종수정일 : 2022년10월27일
 * 수정내용: 동,호 정보 요청시 전체 동/호에 대한 응답 코드 작성
 */

var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

//동호정보 목록조회
router.get("/list", async (req, res, next) => {
  let {
    page = 1, //             현재페이지
    size = 10, //        페이지 당 결과수
    dongCode = "", //            검색조건(dongCode)
    hoCode = "",
    hAreaType = "",
    hnSendFlag = "",
    moveOutDtime = "",
    moveOutDtimeStart = "",
    moveOutDtimeEnd = "",
  } = req.query;

  console.log("동호정보 목록조회.............");
  console.log(
    page,
    size,
    dongCode,
    hoCode,
    hAreaType,
    hnSendFlag,
    moveOutDtime,
    moveOutDtimeStart,
    moveOutDtimeEnd
  );
  //http://localhost:9000/donghoInfo/list?size=10&page=1&dongCode=101&hoCode=101&hAreaType=0&hnSendFlag=Y

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
    if (dongCode !== "") {
      strSQL += ` ${strWhere} a.dong_code = '${dongCode}'`;
      strWhere = " and ";
    }
    if (hoCode !== "") {
      strSQL += ` ${strWhere} a.ho_code = '${hoCode}'`;
      strWhere = " and ";
    }
    if (hAreaType !== "") {
      strSQL += ` ${strWhere} a.h_area_type = '${hAreaType}'`;
      strWhere = " and ";
    }

    if (moveOutDtime !== "") {
      strSQL += ` ${strWhere} a.move_out_dtime is not null `;
      strWhere = " and ";

      if (moveOutDtimeStart !== "") {
        strSQL += ` ${strWhere} a.move_out_dtime  >= '${moveOutDtimeStart}' `;
        strWhere = " and ";
      }

      if (moveOutDtimeEnd !== "") {
        strSQL += ` ${strWhere} a.move_out_dtime  <= '${
          moveOutDtimeEnd + " 23:59:59"
        }' `;
        strWhere = " and ";
      }
    }

    if (hnSendFlag == "Y") {
      strSQL += ` ${strWhere} a.hn_send_flag ='Y' `;
    } else if (hnSendFlag == "N") {
      strSQL += ` ${strWhere} a.hn_send_flag = 'N' `;
    }

    let sql = `select count(*) as cnt 
               from t_dongho a inner join t_household_type b on a.h_area_type = b.h_area_type ${strSQL}`;
    console.log("sql =>" + sql);
    const data = await pool.query(sql);
    //console.log(data[0][0]);
    totalCount = data[0][0].cnt; //총 게시글 수
    total_page = Math.ceil(totalCount / size); //총 페이지 수

    ////start = (page - 1) * 10;
    // start = (page - 1) * size;
    // start_page = Math.ceil(page / block);
    // end_page = start_page * block;

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

    sql = `select a.dong_code as dongCode, a.ho_code as hoCode, a.line_code as lineCode, 
                  b.h_area_type as hAreaType, a.hn_send_flag as hnSendFlag,
                  IFNULL(DATE_FORMAT(a.move_out_dtime, '%Y-%m-%d'), '') as moveOutDtime 
            from t_dongho a inner join t_household_type b on a.h_area_type = b.h_area_type ${strSQL}
            order by convert(a.dong_code, signed), convert(a.ho_code, signed)
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

//동호정보 상세보기
router.get("/detail/:dongCode/:hoCode", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    dongCode,
    hoCode,
  } = req.params;

  console.log(dongCode, hoCode);
  //http://localhost:9000/donghoInfo/detail/101/101

  try {
    const sql = `select a.dong_code as dongCode, a.ho_code as hoCode, a.line_code as lineCode, 
                        a.h_area_type as hAreaType, b.h_area_name as hAreaName, a.hn_send_flag as hnSendFlag, IFNULL(a.memo, '') as memo,
                        IFNULL(DATE_FORMAT(a.move_out_dtime, '%Y-%m-%d'), '-') as moveOutDtime 
                 from t_dongho a inner join t_household_type b on a.h_area_type = b.h_area_type
                 where dong_code = ? and ho_code = ?`;
    const data = await pool.query(sql, [dongCode, hoCode]);

    resultList = data[0];

    // let resultList = "";
    // let lineCode = "";
    // let hAreaType = "";
    // let hAreaName = "";
    // let hnSendFlag = "";
    // let moveOutDtime = "";
    // let memo = "";

    // if (resultList.length > 0) {
    //   lineCode = resultList[0].lineCode;
    //   hAreaType = resultList[0].hAreaType;
    //   hAreaName = resultList[0].hAreaName;
    //   hnSendFlag = resultList[0].hnSendFlag;
    //   moveOutDtime = resultList[0].moveOutDtime;
    //   memo = resultList[0].memo;
    // }

    // let jsonResult = {
    //   resultCode: "00",
    //   resultMsg: "NORMAL_SERVICE",
    //   dongCode,
    //   hoCode,
    //   lineCode,
    //   hAreaType,
    //   hAreaName,
    //   hnSendFlag,
    //   moveOutDtime,
    //   memo,
    // };
    console.log(resultList[0]);
    return res.json(resultList[0]);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//동호정보 수정(전체)
router.put("/write", async (req, res, next) => {
  // console.log(JSON.stringify(req.body));
  // console.log(req.body);

  let { dongCode, hoCode, hAreaType, hnSendFlag, memo = "" } = req.body;
  console.log(dongCode, hoCode, hAreaType, hnSendFlag, memo);

  //http://localhost:9000/donghoInfo/write  {"dongCode": "101", "hoCode":"101","hAreaType":"0","hnSendFlag": “Y”}

  let resultCode = "00";
  if (dongCode === "") resultCode = "10";

  if (hoCode === "") resultCode = "10";

  if (hAreaType === "") resultCode = "10";

  if (hnSendFlag === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `update t_dongho set
                  h_area_type = ?, hn_send_flag =?, memo = ? 
                 where dong_code = ? and ho_code = ? `;
      console.log("sql=>" + sql);
      const data = await pool.query(sql, [
        hAreaType,
        hnSendFlag,
        memo,
        dongCode,
        hoCode,
      ]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "동호정보가 수정되었습니다.",
      };

      return res.json(jsonResult);
    } catch (err) {
      console.log("test===============" + err);
      return res.status(500).json(err);
    }
  } else return res.json({ resultCode: resultCode });
});

//동호정보 수정(이사처리)
router.patch("/write", async (req, res, next) => {
  // console.log(JSON.stringify(req.body));
  // console.log(req.body);

  let { dongCode, hoCode, moveFlag } = req.body;
  console.log(dongCode, hoCode, moveFlag);

  //http://localhost:9000/donghoInfo/write  {"dongCode": "101", "hoCode":"101","moveFlag":“Y”}

  let resultCode = "00";
  if (dongCode === "") resultCode = "10";

  if (hoCode === "") resultCode = "10";

  if (moveFlag !== "Y") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `update t_dongho set move_out_dtime = now()  
                 where dong_code = ? and ho_code = ? `;
      console.log("sql=>" + sql);
      const data = await pool.query(sql, [dongCode, hoCode]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "이사처리가 완료되었습니다.",
      };

      return res.json(jsonResult);
    } catch (err) {
      console.log("test===============" + err);
      return res.status(500).json(err);
    }
  } else return res.json({ resultCode: resultCode });
});

//동정보 콤보박스
router.get("/dongList", async (req, res, next) => {
  try {
    let sql =
      "select dong_code as code, dong_code as name from t_dong order by dong_code";
    console.log("sql=>" + sql);

    const data = await pool.query(sql);
    let items = data[0];
    let jsonResult = { items };
    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//동호정보 콤보박스
router.get("/donghoList", async (req, res, next) => {
  let { dongCode = "" } = req.query;
  console.log("dongCode=>" + dongCode);

  try {
    let sql = "";
    if (dongCode == "ALL") {
      dongCode = `LIKE '%'`;
      sql += `SELECT dong_code AS dongCode, ho_code AS code, ho_code AS name FROM t_dongho WHERE dong_code ${dongCode} ORDER BY ho_code`;
    } else {
      dongCode = `= ${dongCode}`;
      sql += `SELECT dong_code AS dongCode, ho_code AS code, ho_code AS name FROM t_dongho WHERE dong_code ${dongCode} ORDER BY ho_code`;
    }
    console.log("sql=>" + sql);

    const data = await pool.query(sql);
    let items = data[0];
    let jsonResult = { items };

    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//면적정보 콤보박스
router.get("/hAreaList", async (req, res, next) => {
  try {
    let sql =
      "select h_area_type as code, h_area_name as name from t_household_type";
    console.log("sql=>" + sql);

    const data = await pool.query(sql);
    let items = data[0];
    let jsonResult = { items };

    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;

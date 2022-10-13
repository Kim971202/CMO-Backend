var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 엘리베이터 이력 조회
router.get("/getElevatorCallLog", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    reqMethod = "",
    elvDirection = "",
    commResult = "",
    dongCode = "",
    hoCode = "",
  } = req.query;

  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    reqMethod,
    elvDirection,
    commResult,
    dongCode,
    hoCode
  );
  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;
  //   if ((await checkServiceKeyResult(serviceKey)) == false) {
  //     return res.json({
  //       resultCode: "30",
  //       resultMsg: "등록되지 않은 서비스키 입니다.",
  //     });
  //   }
  try {
    let defaultCondition = `LIKE '%'`;

    let defaultReqMethodCondition = defaultCondition;
    let defaultElvDirectionCondition = defaultCondition;
    let defaultCommResultCondition = defaultCondition;
    let defaultDongCondition = defaultCondition;
    let defaultHoCondition = defaultCondition;

    let defaultStartDateCondition = "";
    let defaultEndDateCondition = "";

    let reqMethodCondition = "";
    let elvDirectionCondition = "";
    let commResultConditCondition = "";
    let dongCondition = "";
    let hoCondition = "";

    if (!startDate) {
      defaultStartDateCondition = "1900-01-01";
    }
    if (!endDate) {
      defaultEndDateCondition = "3000-01-01";
    }
    if (!!reqMethod) {
      reqMethodCondition = `= '${reqMethod}'`;
      defaultReqMethodCondition = "";
    }
    if (!!elvDirection) {
      elvDirectionCondition = `= '${elvDirection}'`;
      defaultElvDirectionCondition = "";
    }
    if (!!commResult) {
      commResultConditCondition = `= '${commResult}'`;
      defaultCommResultCondition = "";
    }
    if (!!dongCode) {
      dongCondition = `= '${dongCode}'`;
      defaultDongCondition = "";
    }
    if (!!hoCode) {
      hoCondition = `= '${hoCode}'`;
      defaultHoCondition = "";
    }
    const sql2 = `SELECT count(idx) as cnt
    FROM t_elevator_control
    WHERE (DATE(ev_arrive_time) >= '${defaultStartDateCondition} ${startDate}' AND DATE(ev_arrive_time) <= '${defaultEndDateCondition} ${endDate}') 
          AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition})
          AND req_method ${defaultReqMethodCondition} ${reqMethodCondition} 
          AND comm_result ${defaultCommResultCondition} ${commResultConditCondition}
          AND direction ${defaultElvDirectionCondition} ${elvDirectionCondition}`;
    const data2 = await pool.query(sql2);
    totalCount = data2[0][0].cnt; //총 게시글 수
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

    const sql = `SELECT ROW_NUMBER() OVER(ORDER BY idx) AS No, DATE_FORMAT(control_req_dtime, '%Y-%m-%d %h:%i:%s') AS controlReqDTime, 
                        (CASE WHEN req_method = 'W' THEN '월패드'
                              WHEN req_method = 'S' THEN '스마트폰' ELSE '-' END) as  resvMethod,
                        (CASE WHEN direction = 'U' THEN '상향'
                              WHEN direction = 'D' THEN '하향' ELSE '-' END) AS direction, 
                        dong_code AS dongCode, ho_code AS hoCode, DATE_FORMAT(comm_dtime, '%h:%i:%s') AS commDTime,
                        (CASE WHEN comm_result = 'Y' THEN '성공'
                              WHEN comm_result = 'N' THEN '실패' ELSE '-' END) AS commResult
                 FROM t_elevator_control
                 WHERE (DATE(ev_arrive_time) >= '${defaultStartDateCondition} ${startDate}' AND DATE(ev_arrive_time) <= '${defaultEndDateCondition} ${endDate}') 
                       AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition})
                       AND req_method ${defaultReqMethodCondition} ${reqMethodCondition} 
                       AND comm_result ${defaultCommResultCondition} ${commResultConditCondition}
                       AND direction ${defaultElvDirectionCondition} ${elvDirectionCondition}
                       LIMIT ?,?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [Number(start), Number(end)]);
    let list = data[0];

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      list: list,
      paging: paging,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 엘리베이터 이력 삭제
router.delete("/deleteElevatorCallLog", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.body;
  console.log(serviceKey, idx);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const sql = `DELETE FROM t_elevator_control WHERE idx = ?`;
    console.log(sql);
    const data = await pool.query(sql, [idx]);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

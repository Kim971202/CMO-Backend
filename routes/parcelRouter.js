var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 택배 정보 조회
router.get("/getParcelList", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    dongCode = "",
    hoCode = "",
    parcelStatus = "",
    sendResult = "",
  } = req.query;

  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    dongCode,
    hoCode,
    parcelStatus,
    sendResult
  );

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;
  let parcelStatus_ = "%";

  if (parcelStatus === "LOCKER") parcelStatus_ = "0";
  else if (parcelStatus === "RETURN") parcelStatus_ = "1";
  else if (parcelStatus === "RECEIPT") parcelStatus_ = "2";
  console.log("parcelStatus_=>" + parcelStatus_);

  try {
    let defaultCondition = `LIKE '%'`;
    let defaultDongCondition = defaultCondition;
    let defaultHoCondition = defaultCondition;
    let defaultParcelStatusCondition = defaultCondition;
    let defaultSendResultCondition = defaultCondition;

    let dongCondition = "";
    let hoCondition = "";
    let parcelStatusCondition = "";
    let sendResultCondition = "";
    let defaultADateCondition = "";
    let defaultRDateCondition = "";

    // 도착일시 와 수령시간이 없을 경우 Default 날자 값을 넣는다.
    if (!startDate) {
      defaultADateCondition = "1900-01-01";
    }
    if (!endDate) {
      defaultRDateCondition = "3000-01-01";
    }
    if (!!dongCode) {
      dongCondition = `= '${dongCode}'`;
      defaultDongCondition = "";
    }
    if (!!hoCode) {
      hoCondition = `= '${hoCode}'`;
      defaultHoCondition = "";
    }
    if (!!parcelStatus) {
      parcelStatusCondition = `= ${parcelStatus_}`;
      defaultParcelStatusCondition = "";
    }
    if (!!sendResult) {
      sendResultCondition = `= '${sendResult}'`;
      defaultSendResultCondition = "";
    }

    const sql2 = `SELECT count(idx) as cnt
                    FROM t_delivery
                    WHERE (DATE(arrival_time) >= '${defaultADateCondition} ${startDate}' AND DATE(receive_time) <= '${defaultRDateCondition} ${endDate}') 
                          AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition}) 
                          AND parcel_status ${defaultParcelStatusCondition} ${parcelStatusCondition}
                          AND send_result ${defaultSendResultCondition} ${sendResultCondition};`;
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

    const sql = `SELECT idx as idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, dong_code AS dongCode, ho_code AS hoCode, (parcel_flag) AS parcelFlag, IFNULL(memo, '-') AS parcelCorp, 
                          DATE_FORMAT(arrival_time, '%Y-%m-%d %h:%i:%s') AS arrivalTime, DATE_FORMAT(receive_time, '%Y-%m-%d %h:%i:%s') AS receiveTime,
                          send_result AS sendResult
                  FROM t_delivery
                  WHERE (DATE(arrival_time) >= '${defaultADateCondition} ${startDate}' AND DATE(receive_time) <= '${defaultRDateCondition} ${endDate}') 
                        AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition}) 
                        AND parcel_status ${defaultParcelStatusCondition} ${parcelStatusCondition}
                        AND send_result ${defaultSendResultCondition} ${sendResultCondition}
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

// 택배 정보 조회
router.get("/getDetailedParcelList/:idx", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    idx = 0,
  } = req.params;

  console.log(serviceKey, idx);

  try {
    const sql = `SELECT DATE_FORMAT(arrival_time, '%Y-%m-%d %h:%i:%s') AS arrivalTime, (parcel_flag) AS parcelFlag,
                        dong_code AS dongCode, ho_code AS hoCode, IFNULL(memo, '-') AS parcelCorp
                 FROM t_delivery
                 WHERE idx = ?`;

    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
    let resultList = data[0];

    resultList = data[0];
    if (resultList.length > 0) {
      arrivalTime = resultList[0].arrivalTime;
      parcelFlag = resultList[0].parcelFlag;
      dongCode = resultList[0].dongCode;
      hoCode = resultList[0].hoCode;
      parcelCorp = resultList[0].parcelCorp;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      idx,
      arrivalTime,
      parcelFlag,
      dongCode,
      hoCode,
      parcelCorp,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 택배 정보 등록
// 경비실에서 받아서 직접 등록
router.post("/postParcel", async (req, res, next) => {
  let {
    parcelStatus = 0,
    dongCode = "",
    hoCode = "",
    parcelCorp = "",
  } = req.body;
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  console.log(parcelStatus, dongCode, hoCode, parcelCorp);
  try {
    parcelBoxNo = "00" + 1;
    mailBoxNo = "0" + 1;
    receiver = `${dongCode} - ${hoCode}`;
    del_fee = 1000;
    parcelFlage = "유인";

    let sql = `INSERT INTO t_delivery(arrival_time, parcel_box_no, mail_box_no, receiver, del_fee, dong_code, ho_code, receive_time, parcel_status, parcel_flag, user_id, send_time, send_result, memo)
                 VALUES(now(),?,?,?,?,?,?,now(),?,?,'tester',now(),'N',?)`;
    const data = await pool.query(sql, [
      parcelBoxNo,
      mailBoxNo,
      receiver,
      del_fee,
      dongCode,
      hoCode,
      parcelStatus,
      parcelFlage,
      parcelCorp,
    ]);
    console.log("data[0]=>" + data[0]);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 택배 정보 수정
// 수령여부 변경
/**
   * *택배구분
    '무인' : 무인택배
    '경비' : 경비실기
    'PC' : 관리자 PC
    *택배상태
    0 : 미수령(택배도착)
    1 : 수령
    2 : 반품
   * 
   */
router.put("/updateParcel", async (req, res, next) => {
  let { serviceKey = "", idx = 0, parcelStatus = 0 } = req.body;
  console.log(serviceKey, idx, parcelStatus);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const sql = `UPDATE t_delivery SET parcel_status = ?, receive_time = now() WHERE idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [parcelStatus, idx]);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 택배 등록 삭제
router.delete("/deleteParcel/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(idx);

  try {
    const sql = `DELETE FROM t_delivery WHERE idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
    let resultList = data[0];
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

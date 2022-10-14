var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 민원 목록 조회
router.get("/getApplicationList", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    appReceiptDate = "",
    dongCode = "",
    hoCode = "",
  } = req.query;
  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    appReceiptDate,
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
  let parcelStatus_ = "%";

  try {
    let defaultCondition = `LIKE '%'`;
    let defaultAppReceiptDateCondition = defaultCondition;
    let defaultDongCodeCondition = defaultCondition;
    let defaultHoCodeCondition = defaultCondition;

    let defaultStartDateCondition = "";
    let defaultEndDateCondition = "";

    let appReceiptDateCondition = "";
    let dongCodeCondition = "";
    let hoCodeCondition = "";

    if (!startDate) {
      defaultStartDateCondition = "1900-01-01";
    }
    if (!endDate) {
      defaultEndDateCondition = "3000-01-01";
    }
    if (!!appReceiptDate) {
      appReceiptDateCondition = `= '${appReceiptDate}'`;
      defaultAppReceiptDate = "";
    }
    if (!!dongCode) {
      dongCodeCondition = `= '${dongCode}'`;
      defaultDongCodeCondition = "";
    }
    if (!!hoCode) {
      hoCodeCondition = `= '${hoCode}'`;
      defaultHoCodeCondition = "";
    }
    const sql2 = `SELECT count(idx) as cnt
    FROM t_application_complaint
    WHERE (DATE(app_date) >= '${defaultStartDateCondition} ${startDate}' AND DATE(app_date) <= '${defaultEndDateCondition} ${endDate}')
    AND (dong_code ${defaultDongCodeCondition} ${dongCodeCondition} AND ho_code ${defaultHoCodeCondition} ${hoCodeCondition})
    AND app_date ${defaultAppReceiptDateCondition} ${appReceiptDateCondition}`;
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

    const sql = `SELECT idx AS idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, DATE_FORMAT(app_date, '%Y-%m-%d') AS appReceiptDate,
                          CONCAT(dong_code, '동 ', ho_code, '호') AS applicant,
                          (CASE WHEN app_method = 'W' THEN '월패드'
                                WHEN app_method = 'S' THEN '스마트폰'
                                ELSE '-' END) AS appMethod, IFNULL(DATE_FORMAT(app_complete_date, '%Y-%m-%d'), '-') AS appCompleteDate,
                          (CASE WHEN progress_status = 0 THEN '취소'
                                WHEN progress_status = 1 THEN '신청'
                                WHEN progress_status = 2 THEN '접수'
                                WHEN progress_status = 3 THEN '처리' ELSE '-' END) AS progressStatus
                   FROM t_application_complaint
                   WHERE (DATE(app_date) >= '${defaultStartDateCondition} ${startDate}' AND DATE(app_date) <= '${defaultEndDateCondition} ${endDate}')
                         AND (dong_code ${defaultDongCodeCondition} ${dongCodeCondition} AND ho_code ${defaultHoCodeCondition} ${hoCodeCondition})
                         AND app_date ${defaultAppReceiptDateCondition} ${appReceiptDateCondition}
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

// 민원 상세 보기
router.get("/getDetailedApplicationList/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(serviceKey, idx);

  //   if ((await checkServiceKeyResult(serviceKey)) == false) {
  //     return res.json({
  //       resultCode: "30",
  //       resultMsg: "등록되지 않은 서비스키 입니다.",
  //     });
  //   }

  try {
    const sql = `SELECT DATE_FORMAT(a.app_date, '%Y-%m-%d') AS appDate,  
                          (CASE WHEN a.progress_status = 0 THEN '취소'
                            WHEN a.app_code = 1 THEN '하자보수신청'
                            WHEN a.app_code = 2 THEN '세대 민원'
                            WHEN a.app_code = 3 THEN '공용부 민원' ELSE '-' END) AS appCode, a.app_content AS appContent,
                            CONCAT(a.dong_code, '동 ', a.ho_code, '호') AS applicant,
                            (CASE WHEN a.app_method = 'W' THEN '월패드'
                                  WHEN a.app_method = 'S' THEN '스마트폰'
                                  ELSE '-' END) AS appMethod,
                            DATE_FORMAT(a.app_receipt_date, '%Y-%m-%d') AS appReceiptDate,
                            IFNULL(DATE_FORMAT(a.app_complete_date, '%Y-%m-%d'), '-') AS appCompleteDate,
                            (CASE WHEN a.progress_status = 0 THEN '취소'
                                WHEN a.progress_status = 1 THEN '신청'
                                WHEN a.progress_status = 2 THEN '접수'
                                WHEN a.progress_status = 3 THEN '처리' ELSE '-' END) AS progressStatus,
                                IFNULL(b.memo, '-') AS memo
                  FROM t_application_complaint a
                  INNER JOIN t_complaints_type b
                  WHERE a.app_code = b.app_code AND a.idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
    let resultList = data[0];
    console.log(resultList);
    resultList = data[0];
    if (resultList.length > 0) {
      appDate = resultList[0].appDate;
      appCode = resultList[0].appCode;
      appContent = resultList[0].appContent;
      applicant = resultList[0].applicant;
      appMethod = resultList[0].appMethod;
      appReceiptDate = resultList[0].appReceiptDate;
      appCompleteDate = resultList[0].appCompleteDate;
      progressStatus = resultList[0].progressStatus;
      memo = resultList[0].memo;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      idx,
      appDate,
      appCode,
      appContent,
      applicant,
      appMethod,
      appReceiptDate,
      appCompleteDate,
      appMethod,
      progressStatus,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/**
   * 민원 상태 변경
   * 관리사무실에서의 민원 변경은
   * 민원의 진행 상태값만 변경 가능하다.
   * 예: 처리가 완료된 민원의 경우 접수 -> 완료로 변경
   * 
   * *진행단계
      0: 취소
      1: 신청
      2: 접수
      3: 처리
   * */
router.put("/updateApplication", async (req, res, next) => {
  let { idx = 0, progressStatus = 0, memo = "" } = req.body;
  console.log(idx, progressStatus, memo);

  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }

  try {
    let sql = "";

    sql =
      progressStatus == 0
        ? (sql += `UPDATE t_application_complaint a INNER JOIN t_complaints_type b SET a.progress_status = ?, a.app_cancel_date = now(), b.memo = ? WHERE idx = ?`)
        : progressStatus == 2
        ? (sql += `UPDATE t_application_complaint a INNER JOIN t_complaints_type b SET a.progress_status = ?, a.app_receipt_date = now(), b.memo = ? WHERE idx = ?`)
        : (sql += `UPDATE t_application_complaint a INNER JOIN t_complaints_type b SET a.progress_status = ?, a.app_complete_date = now(), b.memo = ? WHERE idx = ?`);

    console.log("sql: " + sql);
    const data = await pool.query(sql, [progressStatus, memo, idx]);
    console.log(data[0]);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.delete("/deleteApplication/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(serviceKey, idx);

  try {
    const sql = `DELETE FROM t_application_complaint WHERE idx = ?`;
    console.log("sql: " + sql);
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

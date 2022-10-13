var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 전기차충전 이력 리스트 조회
router.get("/getEVChargingLog", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    chargerLoc = "",
    dongCode = "", //        동코드
    hoCode = "", //          호코드
  } = req.query;

  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    chargerLoc,
    dongCode,
    hoCode
  );
  //   if ((await checkServiceKeyResult(serviceKey)) == false) {
  //     return res.json({
  //       resultCode: "30",
  //       resultMsg: "등록되지 않은 서비스키 입니다.",
  //     });
  //   }

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;

  try {
    let defaultCondition = `Like '%'`;
    let defaultChargerLocCondition = defaultCondition;
    let defaultDongCondition = defaultCondition;
    let defaultHoCondition = defaultCondition;

    let defaultStartTimeCondition = "";
    let defaultEndTimeCondition = "";

    let dongCondition = "";
    let hoCondition = "";
    let chargerLocCondition = "";

    if (!startDate) {
      defaultStartTimeCondition = "1900-01-01";
    }
    if (!endDate) {
      defaultEndTimeCondition = "3000-01-01";
    }
    if (!!dongCode) {
      dongCondition = `= '${dongCode}'`;
      defaultDongCondition = "";
    }
    if (!!hoCode) {
      hoCondition = `= '${hoCode}'`;
      defaultHoCondition = "";
    }
    if (!!chargerLoc) {
      chargerLocCondition = `= '${chargerLoc}'`;
      defaultChargerLocCondition = "";
    }
    const sql2 = `SELECT count(idx) as cnt
    FROM t_ev_charging_log
    WHERE (DATE(charge_start_dtime) >= '${defaultStartTimeCondition} ${startDate}' AND DATE(charge_end_dtime) <= '${defaultEndTimeCondition} ${endDate}') 
          AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition}) 
          AND charger_loc ${defaultChargerLocCondition} ${chargerLocCondition}`;
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

    const sql = `SELECT ROW_NUMBER() OVER(ORDER BY idx) AS No, dong_code AS dongCode, ho_code AS hoCode, 
                          charger_loc AS chargerLoc, charger_type AS chargerType, charge_amount AS chargeAmount,
                          DATE_FORMAT(charge_start_dtime, '%Y-%m-%d %h:%i:%s') AS chargeStartDtime,
                          DATE_FORMAT(charge_end_dtime, '%Y-%m-%d %h:%i:%s') AS chargeEndDtime,
                          use_fee AS useFee
                   FROM t_ev_charging_log
                   WHERE (DATE(charge_start_dtime) >= '${defaultStartTimeCondition} ${startDate}' AND DATE(charge_end_dtime) <= '${defaultEndTimeCondition} ${endDate}') 
                         AND (dong_code ${defaultDongCondition} ${dongCondition} AND ho_code ${defaultHoCondition} ${hoCondition}) 
                         AND charger_loc ${defaultChargerLocCondition} ${chargerLocCondition}
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
// 전기차충전 이력 리스트 상세조회
router.get("/getDeatiledEVChargingLog", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    idx,
    dongCode = "0000", //        동코드
    hoCode = "0000", //          호코드
    //viewPeriod = "ALL", //       조회기간전체: (ALL)/일주일(1WEEK)/1개월(1MONTH)/3개월(3MONTH)
  } = req.query;

  console.log(serviceKey, idx, dongCode, hoCode);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    let sRow = (pageNo - 1) * numOfRows;
    let size = numOfRows * (doubleDataFlag === "Y" ? 2 : 1);

    const sql = `SELECT DATE_FORMAT(charge_start_dtime, '%Y%m%d%h%i%s') AS startDTime, dong_code AS dongCode, ho_code AS hoCode, charger_loc AS chargerLoc, (
                          CASE WHEN charger_type = '완속' THEN 'slow'
                              WHEN charger_type = '급속' THEN 'fast'
                              ELSE '-'
                          END
                        ) AS  chargerType, charge_amount AS elecAmount, use_fee AS chargeUseFee, DATE_FORMAT(charge_start_dtime, '%Y%m%d%h%i%s') AS insertDate
                  FROM t_ev_charging_log
                  WHERE idx = ? AND dong_code = ? AND ho_code = ?;`;

    console.log("sql=>" + sql);
    const data = await pool.query(sql, [idx, dongCode, hoCode]);
    let resultList = data[0];

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      numOfRows,
      pageNo,
      doubleDataFlag,
      data: {
        dongCode,
        hoCode,
        items: resultList,
      },
    };

    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});
// 전기차충전 이력 삭제
router.delete("/deleteEVChargingLog", async (req, res, next) => {
  let { idx = 0 } = req.body;
  console.log(idx);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const sql = `DELETE FROM t_ev_charging_log WHERE idx = ?`;
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

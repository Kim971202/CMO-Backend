var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 관리비 조회
router.get("/getMngFeeList", async (req, res, next) => {
  let {
    serviceKey = "serviceKey", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    dongCode = "",
    hoCode = "",
    hAreaType = "",
  } = req.query;
  console.log(serviceKey, size, page, dongCode, hoCode, hAreaType);

  try {
    let defaultCondition = `LIKE '%'`;
    let defaultDongCondition = defaultCondition;
    let defaultHoCondition = defaultCondition;
    let defaultAreaCondition = defaultCondition;

    let dongCondition = "";
    let hoCondition = "";
    let areaCondition = "";

    if (!!dongCode) {
      dongCondition = `= '${dongCode}'`;
      defaultDongCondition = "";
    }
    if (!!hoCode) {
      hoCondition = `= '${hoCode}'`;
      defaultHoCondition = "";
    }
    if (!!hAreaType) {
      areaCondition = `= '${hAreaType}'`;
      defaultAreaCondition = "";
    }

    let totalCount = 0;
    let block = 10;
    let total_page = 0;
    let start = 0;
    let end = size;
    let start_page = 1;
    let end_page = block;

    const sql2 = `SELECT count(a.insert_date) as cnt
                    FROM t_management_fee a
                    INNER JOIN t_dongho b
                    WHERE (a.dong_code = b.dong_code AND a.ho_code = b.ho_code)
                    AND (a.dong_code ${defaultDongCondition} ${dongCondition} AND a.ho_code  ${defaultHoCondition} ${hoCondition})
                    AND b.h_area_type ${defaultAreaCondition} ${areaCondition};`;
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

    const sql = `SELECT DATE_FORMAT(a.insert_date, '%Y-%m-%d %d:%i:%s') AS iDate, ROW_NUMBER() OVER(ORDER BY insert_date) AS no, a.dong_code AS dongCode, a.ho_code AS hoCode, b.h_area_type AS hAreaType, 
                          CONCAT(mng_year, "-",mng_month) AS payMonth, a.total_mng AS totalMng, mng_year AS mngYear, mng_month AS mngMonth
                   FROM t_management_fee a
                   INNER JOIN t_dongho b
                   WHERE (a.dong_code = b.dong_code AND a.ho_code = b.ho_code)
                         AND (a.dong_code ${defaultDongCondition} ${dongCondition} AND a.ho_code  ${defaultHoCondition} ${hoCondition})
                         AND b.h_area_type ${defaultAreaCondition} ${areaCondition}
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
    console.log(jsonResult);
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 관리비 상세 조회
router.get("/getDetailedMngFee", async (req, res, next) => {
  let { dongCode = "", hoCode = "", mngYear = "", mngMonth = "" } = req.query;
  try {
    const sql2 = "SELECT * FROM t_set_management_fee ORDER BY mng_fee_order;"; //order by반드시 넣어야 함
    const data2 = await pool.query(sql2);
    const resultList2 = data2[0];

    let mngFeeItem = [];
    let mngFeeAlias = [];
    let mngFee = [];
    for (i = 0; i < resultList2.length; i++) {
      mngFeeItem[i] = resultList2[i].mng_fee_item;
      mngFeeAlias[i] = resultList2[i].mng_fee_alias;
    }

    const sql = `SELECT ${mngFeeItem} FROM t_management_fee 
    WHERE mng_year = ? AND mng_month = ? AND dong_code = ? AND ho_code = ?`;

    const data = await pool.query(sql, [mngYear, mngMonth, dongCode, hoCode]);
    let resultList = data[0]; //
    // console.log(resultList[0]);

    for (i = 0; i < mngFeeItem.length; i++) {
      mngFee[i] = resultList[0][mngFeeItem[i]];
    }
    console.log("mngFee=>" + mngFee.length);
    console.log("mngFeeItem=>" + mngFeeItem.length);

    const totoalMngSql = `select total_mng as totalMng from t_management_fee
    where mng_year = ${mngYear} and mng_month = ${mngMonth}`;
    const totalMngData = await pool.query(totoalMngSql);
    let totalMngList = totalMngData[0];
    let totalMng = "";
    if (totalMngList.length > 0) {
      totalMng = totalMngList[0].totalMng;
    }
    console.log("totalMng: " + totalMng);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      mngYear,
      mngMonth,
      dongCode,
      hoCode,
      mngFeeItem: mngFeeAlias,
      mngFee,
      totalMng,
    };
    console.log(jsonResult);
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 관리비 삭제
router.delete("/deleteMngFeeList", async (req, res, next) => {
  let { serviceKey = "", dongCode = "", hoCode = "" } = req.body;
  console.log(serviceKey, dongCode.hoCode);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const sql = `DELETE FROM t_management_fee WHERE dong_code = ? AND ho_code = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [dongCode, hoCode]);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 관리비 등록

module.exports = router;

var express = require("express");
var router = express.Router();
const pool = require("../database/pool");
const xlsx = require("xlsx");
const fs = require("fs");
let { upload } = require("../common/fileUpload");

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
    console.log(resultList2);
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

    // const totoalMngSql = `select total_mng as totalMng from t_management_fee
    // where mng_year = ${mngYear} and mng_month = ${mngMonth}`;
    // const totalMngData = await pool.query(totoalMngSql);
    // let totalMngList = totalMngData[0];
    // let totalMng = "";
    // if (totalMngList.length > 0) {
    //   totalMng = totalMngList[0].totalMng;
    // }
    // console.log("totalMng: " + totalMng);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      mngYear,
      mngMonth,
      dongCode,
      hoCode,
      mngFeeItem: mngFeeAlias,
      mngFee,
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
router.post("/postMngFee", upload.single("xlsx"), async (req, res, next) => {
  let { mngYear = "", mngMonth = "", dongCode = "", hoCode = "" } = req.body;
  console.log(mngYear, mngMonth, dongCode, hoCode);
  const workbook = xlsx.readFile(`./public/xlsx/${req.file.filename}`); // 엑셀 파일 읽어오기
  const firstSheetName = workbook.SheetNames[0]; // 엑셀 파일의 첫번째 시트 이름 가져오기
  const firstSheet = workbook.Sheets[firstSheetName]; // 시트 이름을 사용해서 엑셀 파일의 첫번째 시트 가져오기
  const firstSheetJson = xlsx.utils.sheet_to_json(firstSheet); // utils.sheet_to_json 함수를 사용해서 첫번째 시트 내용을 json 데이터로 변환
  // console.log(Object.keys(firstSheetJson[0])[1]);
  let test = firstSheetJson[0];
  // 관리비 항목 설정 배열
  const arr2 = Array.from(Array(workbook.Strings.length - 1), () =>
    Array(3).fill(null)
  );

  for (i = 2; i < arr2.length; ++i) {
    for (j = 0; j < 3; ++j) {
      arr2[i][0] = "mng_fee_" + (i - 1);
      arr2[i][1] = workbook.Strings[i].t;
      arr2[i][2] = i - 1;
    }
  }
  let values = arrToObject(arr2);
  let excelArray = deleteRow(values, 1);
  excelArray = deleteRow(excelArray, 27);
  function deleteRow(arr, row) {
    arr = arr.slice(0); // make copy
    arr.splice(row - 1, 1);
    return arr;
  }
  //create JSON object from 2 dimensional Array
  function arrToObject(arr2) {
    //assuming header
    var keys = ["mng_fee_item", "mng_fee_alias", "mng_fee_order"];
    //vacate keys from main array
    var newArr = arr2.slice(1, arr2.length);
    var formatted = [],
      data = newArr,
      cols = keys,
      l = cols.length;
    for (var i = 0; i < data.length; i++) {
      var d = data[i],
        o = {};
      for (var j = 0; j < l; j++) o[cols[j]] = d[j];
      formatted.push(o);
    }
    return formatted;
  }

  // excelArray.forEach(async (t_management_fee) => {
  //   await pool.query(sql, t_management_fee); // 고객 정보 데이터를 한건씩 읽으면서 MySQL 데이터베이스에 insert 처리
  // });

  ///////////////// t_management_fee /////////////////

  // 항목 배열
  let mngFeeItem = [];
  // 관리비 요금 배열
  let mngFeeAlias = [];
  //  일반관리비
  console.log(excelArray[0].mng_fee_alias);
  for (i = 0; i < excelArray.length; ++i) {
    mngFeeItem[i] = test[excelArray[i].mng_fee_alias];
    mngFeeAlias[i] = excelArray[i].mng_fee_item;
  }
  console.log(mngFeeItem);
  console.log(mngFeeAlias);
  const mngFeeSQL = `INSERT INTO t_management_fee(mng_year, mng_month, ho_code, dong_code, ${mngFeeAlias}, insert_date)
                     VALUES (${mngYear}, ${mngMonth}, ${hoCode}, ${dongCode}, ${mngFeeItem}, now()) `;
  console.log(mngFeeSQL);
  const data = await pool.query(mngFeeSQL);
  res.send("ok");
});

module.exports = router;

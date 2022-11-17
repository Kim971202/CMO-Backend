var express = require("express");
var router = express.Router();
const pool = require("../database/pool");
const xlsx = require("xlsx");
const fs = require("fs");
let { upload, listDir } = require("../common/fileUpload");

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
  try {
    const sql = `DELETE FROM t_management_fee`;
    console.log("sql: " + sql);
    const data = await pool.query(sql);
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
  let { mngYear = "2022", mngMonth = "11" } = req.body;
  console.log(mngYear, mngMonth);

  const workbook = xlsx.readFile(`./public/xlsx/${await listDir()}`); // 엑셀 파일 읽어오기
  const firstSheetName = workbook.SheetNames[0]; // 엑셀 파일의 첫번째 시트 이름 가져오기
  const firstSheet = workbook.Sheets[firstSheetName]; // 시트 이름을 사용해서 엑셀 파일의 첫번째 시트 가져오기

  let firstSheetJson = xlsx.utils.sheet_to_json(firstSheet); // utils.sheet_to_json 함수를 사용해서 첫번째 시트 내용을 json 데이터로 변환
  // 엑셀 배열의 길이
  let excelArr = Object.keys(firstSheetJson);
  console.log(excelArr.length);
  // 각 row의 길이
  let excelInside = Object.keys(firstSheetJson[0]);
  // console.log(firstSheetJson[0].length);

  let count = 0;
  for (i = 0; i < excelInside.length; ++i) {
    if (excelInside[i].includes("EMPTY")) {
      ++count;
    }
  }
  console.log(count);
  const feeArray = Array.from(Array(excelArr.length), () =>
    Array(excelInside.length - count).fill(null)
  );
  for (i = 0; i < excelArr.length; ++i) {
    for (j = 0; j < excelInside.length; ++j) {
      feeArray[i][j] = firstSheetJson[j];
    }
  }

  // 관리비 항목 배열
  const mngItems = Array.from(Array(excelArr.length), () =>
    Array(excelInside.length - count).fill(null)
  );

  // mngItems
  for (i = 0; i < mngItems.length; ++i) {
    for (j = 0; j < excelInside.length - count; ++j) {
      if (j == 0) {
        mngItems[i][j] = "dong_code";
      } else if (j == 1) {
        mngItems[i][j] = "ho_code";
      } else {
        mngItems[i][j] = "mng_fee_" + (j - 1);
      }
    }
  }

  // 관리비 금액 배열
  const mngFee = Array.from(Array(excelArr.length), () =>
    Array(excelInside.length - count).fill(null)
  );

  // mngFee
  for (i = 0; i < excelArr.length; ++i) {
    for (j = 0; j < excelInside.length; ++j) {
      mngFee[i][j] = firstSheetJson[i][excelInside[j]];
    }
  }

  for (i = 0; i < excelArr.length; ++i) {
    mngFee[i].splice(21, 23);
    mngFee[i].splice(28, 1);
  }

  //console.log(mngFee);
  // console.log(mngItems);

  let jsonArray = arrayToJSONObject(mngFee);
  console.log(jsonArray);
  function arrayToJSONObject(arr) {
    //header
    for (i = 0; i < mngItems.length; ++i) {
      var keys = mngItems[i];
    }

    //vacate keys from main array
    var newArr = arr.slice(0, arr.length);
    console.log(newArr.length);
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
  const sql = `INSERT INTO t_management_fee SET ?`;

  jsonArray.forEach(async (t_management_fee) => {
    await pool.query(sql, t_management_fee);
  });

  const updateSQL = `UPDATE t_management_fee SET mng_year = ${mngYear}, mng_month = ${mngMonth} WHERE DATE_FORMAT(insert_date, '%Y') = ${mngYear} 
                                             AND DATE_FORMAT(insert_date, '%m') = ${mngMonth}`;
  console.log("updateSQL: " + updateSQL);
  const data = await pool.query(updateSQL);
  res.send("ok");
});

module.exports = router;

// const workbook = xlsx.readFile(`./public/xlsx/${await listDir()}`); // 엑셀 파일 읽어오기
// const firstSheetName = workbook.SheetNames[0]; // 엑셀 파일의 첫번째 시트 이름 가져오기
// const firstSheet = workbook.Sheets[firstSheetName]; // 시트 이름을 사용해서 엑셀 파일의 첫번째 시트 가져오기
// const firstSheetJson = xlsx.utils.sheet_to_json(firstSheet); // utils.sheet_to_json 함수를 사용해서 첫번째 시트 내용을 json 데이터로 변환
// // console.log(Object.keys(firstSheetJson[0])[1]);
// let test = firstSheetJson[1];
// // 관리비 항목 설정 배열
// const arr2 = Array.from(Array(workbook.Strings.length - 1), () =>
//   Array(3).fill(null)
// );

// for (i = 2; i < arr2.length; ++i) {
//   for (j = 0; j < 3; ++j) {
//     arr2[i][0] = "mng_fee_" + (i - 1);
//     arr2[i][1] = workbook.Strings[i].t;
//     arr2[i][2] = i - 1;
//   }
// }
// let values = arrToObject(arr2);
// let excelArray = deleteRow(values, 1);
// excelArray = deleteRow(excelArray, 27);
// function deleteRow(arr, row) {
//   arr = arr.slice(0); // make copy
//   arr.splice(row - 1, 1);
//   return arr;
// }
// //create JSON object from 2 dimensional Array
// function arrToObject(arr2) {
//   //assuming header
//   var keys = ["mng_fee_item", "mng_fee_alias", "mng_fee_order"];
//   //vacate keys from main array
//   var newArr = arr2.slice(1, arr2.length);
//   var formatted = [],
//     data = newArr,
//     cols = keys,
//     l = cols.length;
//   for (var i = 0; i < data.length; i++) {
//     var d = data[i],
//       o = {};
//     for (var j = 0; j < l; j++) o[cols[j]] = d[j];
//     formatted.push(o);
//   }
//   return formatted;
// }

// // DB에서 이미 관리비 설정 테이블 Data가 없을경우에만 입력
// const sql = `INSERT INTO t_set_management_fee SET ?`;
// const checkSQL = `SELECT mng_fee_item AS mngFeeItem FROM t_set_management_fee;`;
// const checkData = await pool.query(checkSQL);
// if (!checkData[0][0].mngFeeItem) {
//   console.log("Table is empty");
//   excelArray.forEach(async (mngFee) => {
//     await pool.query(sql, mngFee); // 고객 정보 데이터를 한건씩 읽으면서 MySQL 데이터베이스에 insert 처리
//   });
// } else {
//   console.log("Table is not empty");
// }

// ///////////////// t_management_fee /////////////////

// const arr3 = Array.from(Array(workbook.Strings.length - 1), () =>
//   Array(3).fill(null)
// );

// for (i = 2; i < arr3.length; ++i) {
//   for (j = 0; j < 3; ++j) {
//     arr3[i][0] = "mng_fee_" + (i - 1);
//     arr3[i][1] = workbook.Strings[i].t;
//     arr3[i][2] = i - 1;
//   }
// }

// // console.log(thisArray);
// // 항목 배열
// let mngFeeItem = [];
// // 관리비 요금 배열
// let mngFeeAlias = [];

// for (i = 0; i < excelArray.length; ++i) {
//   mngFeeItem[i] = test[excelArray[i].mng_fee_alias];
//   mngFeeAlias[i] = excelArray[i].mng_fee_item;
// }

// const dateInfo = mngFeeDate.split("-");
// const mngYear = dateInfo[0];
// const mngMonth = dateInfo[1];
// console.log(mngYear);
// console.log(mngMonth);

// const mngFeeSQL = `INSERT INTO t_management_fee(mng_year, mng_month, ho_code, dong_code, ${mngFeeAlias}, insert_date)
//                    VALUES (${mngYear}, ${mngMonth}, ${hoCode}, ${dongCode}, ${mngFeeItem}, now()) `;
// console.log(mngFeeSQL);
// const data = await pool.query(mngFeeSQL);
// res.send("ok");

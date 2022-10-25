var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 에너지 조회
router.get("/getEMS", async (req, res, next) => {
  let {
    serviceKey = "",
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    dongCode = "",
    hoCode = "",
  } = req.query;
  console.log(serviceKey, size, page, startDate, endDate, dongCode, hoCode);

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;

  try {
    let = defaultCondition = `LIKE '%'`;
    let = defaultDongCode = defaultCondition;
    let = defaultHoCode = defaultCondition;

    let defaultStartDate = "";
    let defaultEndDate = "";

    let dongCondition = "";
    let hoCondition = "";

    if (!startDate) defaultStartDate = "1900-01-01";
    if (!endDate) defaultEndDate = "3000-01-01";

    if (!!dongCode) {
      dongCondition = `= '${dongCode}'`;
      defaultDongCode = "";
    }

    if (!!hoCode) {
      hoCondition = `= '${hoCode}'`;
      defaultHoCode = "";
    }

    const sql2 = `SELECT COUNT(energy_dtime) AS cnt
                  FROM t_energy
                  WHERE (DATE(energy_dtime) >= '${defaultStartDate} ${startDate}' AND DATE(energy_dtime) <= '${defaultEndDate} ${endDate}')
                      AND (dong_code ${defaultDongCode} ${dongCondition} AND ho_code ${defaultHoCode} ${hoCondition})
                      `;
    console.log("sql2: " + sql2);
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

    const sql = `SELECT ROW_NUMBER() OVER(ORDER BY energy_dtime) AS No,  DATE_FORMAT(energy_dtime, '%m') AS month,
                              CONCAT(dong_code, '동 ', ho_code, ' 호') AS dongHo, 
                              elec_meter AS elecMeter, elec_usage AS elecUsage,
                              water_meter AS waterMeter, water_usage AS waterUsage,
                              gas_meter AS gasMeter, gas_usage AS gasUsage,
                              hot_water_meter AS hotWaterMeter, hot_water_usage AS hotWaterUsage,
                              heating_meter AS heatingMeter, heating_usage AS heatingUsage
                             
                       FROM t_energy
                       WHERE (DATE(energy_dtime) >= '${defaultStartDate} ${startDate}' AND DATE(energy_dtime) <= '${defaultEndDate} ${endDate}')
                              AND (dong_code ${defaultDongCode} ${dongCondition} AND ho_code ${defaultHoCode} ${hoCondition})
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

// 에너지 상세 조회
router.get("/getDetailedEMS", async (req, res, next) => {
  let {
    serviceKey = "",
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    dongCode = "",
    hoCode = "",
    energyType = "ALL",
  } = req.query;

  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    dongCode,
    hoCode,
    energyType
  );

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;

  try {
    let elecSQL = `elec_meter AS elecMeter, elec_usage AS elecUsage`;
    let waterSQL = `water_meter AS waterMeter, water_usage AS waterUsage`;
    let gasSQL = `gas_meter AS gasMeter, gas_usage AS gasUsage`;
    let hotWaterSQL = `hot_water_meter AS hotWaterMeter, hot_water_usage AS hotWaterUsage`;
    let heatingSQL = `heating_meter AS heatingMeter, heating_usage AS heatingUsage`;
    let condition = "";

    if (energyType == "elec") {
      waterSQL = "";
      hotWaterSQL = "";
      heatingSQL = "";
      gasSQL = "";
    } else if (energyType == "water") {
      elecSQL = "";
      hotWaterSQL = "";
      heatingSQL = "";
      gasSQL = "";
    } else if (energyType == "hotWater") {
      waterSQL = "";
      elecSQL = "";
      heatingSQL = "";
      gasSQL = "";
    } else if (energyType == "heating") {
      waterSQL = "";
      hotWaterSQL = "";
      elecSQL = "";
      gasSQL = "";
    } else if (energyType == "gas") {
      waterSQL = "";
      hotWaterSQL = "";
      elecSQL = "";
      heatingSQL = "";
    } else {
      condition = `,`;
      console.log("energyType : ALL");
    }

    const sql2 = `SELECT COUNT(*) AS cnt
                  FROM t_energy
                  WHERE (DATE(energy_dtime) >= ? AND DATE(energy_dtime) <= ?)
                        AND (dong_code = ? AND ho_code = ?)`;
    console.log("sql2: " + sql2);
    const data2 = await pool.query(sql2, [
      startDate,
      endDate,
      dongCode,
      hoCode,
    ]);

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

    const sql = `SELECT ROW_NUMBER() OVER(ORDER BY energy_dtime) AS No,  DATE_FORMAT(energy_dtime, '%Y-%m-%d') AS date,
                              ${elecSQL} ${condition} ${waterSQL} ${condition} ${hotWaterSQL} ${condition} ${heatingSQL} ${condition} ${gasSQL}
                       FROM t_energy
                       WHERE (DATE(energy_dtime) >= ? AND DATE(energy_dtime) <= ?)
                              AND (dong_code = ? AND ho_code = ?) 
                              LIMIT ?,?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [
      startDate,
      endDate,
      dongCode,
      hoCode,
      Number(start),
      Number(end),
    ]);
    let list = data[0];
    console.log(list);
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

// 에너지 관리 조회
router.get("/getEMSManage", async (req, res, next) => {
  let {
    currentYear = "",
    currentMonth = "",
    selectedYear = "", // 년도 선택
    selectedMonth = "", // 월 선택
    energyType = "", // 에너지 유형
    dongCode = "",
    hoCode = "",
  } = req.query;
  console.log(selectedYear, selectedMonth, energyType);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const tSQL = `SELECT DATE_FORMAT(now(), '%Y') AS currentYear, DATE_FORMAT(now(), '%m') AS currentMonth`;
    const yearMonth = await pool.query(tSQL);
    if (!selectedYear) currentYear = yearMonth[0][0].currentYear;
    if (!selectedMonth) currentMonth = yearMonth[0][0].currentMonth;

    let sql = "";

    sql =
      (selectedYear && selectedMonth) || (currentYear && currentMonth)
        ? (sql += "CALL spMonthEnergyUseCall (?,?,?,?,?)")
        : (sql += "CALL spYearEnergyUse (?, ?, ?, ?) ");

    console.log("sql=>" + sql);
    let data = "";
    data =
      selectedYear && selectedMonth
        ? (data = await pool.query(sql, [
            energyType,
            selectedYear,
            selectedMonth,
            dongCode,
            hoCode,
          ]))
        : (data = await pool.query(sql, [
            energyType,
            selectedYear,
            dongCode,
            hoCode,
          ]));

    let resultList = data[0][0];
    console.log(resultList);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      data: {
        resultList,
      },
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

/**
 * 프로그램내용 : 대쉬보드 API
 * 작성자 : 김동현
 * 최초작성일 : 2022년11월14일
 * 수정자 : 김동현
 * 최종수정일 : 2022년11월14일
 * 수정내용:
 */

var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 비상로그 현황
router.get("/emergencyLog", async (req, res, next) => {
  try {
    const sql = `SELECT dong_code AS dongCode, ho_code AS hoCode, CASE(WHEN emergency_type = )`;
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

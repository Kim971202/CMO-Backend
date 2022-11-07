var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

// 투표 목록 조회
router.get("/getVoteAgenda", async (req, res, next) => {
  let {
    serviceKey = "",
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    voteEndFlag = "",
  } = req.query;
  console.log(serviceKey, size, page, startDate, endDate, voteEndFlag);

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;

  try {
    let defaultValue = `LIKE '%'`;
    let defaultVoteEndFlag = defaultValue;

    let defaultStartDate = "";
    let defaultEndDate = "";

    let voteEndFlagCondition = "";

    if (!startDate) {
      defaultStartDate = "1900-01-01";
    }

    if (!endDate) {
      defaultEndDate = "3000-01-01";
    }

    if (!!voteEndFlag) {
      voteEndFlagCondition = `= '${voteEndFlag}'`;
      defaultVoteEndFlag = "";
    }

    const sql2 = `SELECT count(idx) as cnt
                  FROM t_vote_agenda 
                  WHERE (DATE(v_start_dtime) >= '${defaultStartDate} ${startDate}' AND DATE(v_start_dtime) <= '${defaultEndDate} ${endDate}') 
                  AND vote_end_flag ${defaultVoteEndFlag} ${voteEndFlagCondition}`;

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

    const sql = `SELECT idx AS idx, ROW_NUMBER() OVER(ORDER BY idx) AS no, vote_title AS voteTitle, DATE_FORMAT(v_start_dtime, '%Y-%m-%d %h:%s') AS vStartDTime, DATE_FORMAT(v_end_dtime, '%Y-%m-%d %h:%s') AS vEndDTime,
                        vote_rate AS voteRate, vote_end_flag AS vEndFlag, user_code AS userCode
                 FROM t_vote_agenda
                 WHERE (DATE(v_start_dtime) >= '${defaultStartDate} ${startDate}' AND DATE(v_start_dtime) <= '${defaultEndDate} ${endDate}') 
                        AND vote_end_flag ${defaultVoteEndFlag} ${voteEndFlagCondition}
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

// 투표 상세 조회
router.get("/getDetailedVoteAgenda", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.query;
  console.log(serviceKey, idx);

  try {
    const sql = `SELECT a.vote_title AS voteTitle, DATE_FORMAT(a.v_start_dtime, '%Y-%m-%d %h:%s') AS vStartDTime, DATE_FORMAT(a.v_end_dtime, '%Y-%m-%d %h:%s') AS vEndDTime,
                        b.item_no AS itemNo, b.item_content AS itemContent, a.vote_end_flag AS voteEndFlag
                 FROM t_vote_agenda a
                 INNER JOIN t_vote_items b
                 WHERE a.idx = b.idx AND a.idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
    let resultList = data[0];

    let voteTitle = resultList[0].voteTitle;
    let vStartDTime = resultList[0].vStartDTime;
    let vEndDTime = resultList[0].vEndDTime;
    let voteEndFlag = resultList[0].voteEndFlag;

    let voteItems = [];
    for (var i = 0; i < resultList.length; i++) {
      voteItems.push({
        itemNo: resultList[i].itemNo,
        itemContent: resultList[i].itemContent,
      });
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      voteTitle,
      vStartDTime,
      vEndDTime,
      voteItems,
      voteEndFlag,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 투표 등록
router.post("/postVoteAgenda", async (req, res, next) => {
  let {
    serviceKey = "",
    voteTitle = "",
    voteContent = "",
    startDate = "",
    endDate = "",
    itemContents = [],
  } = req.body;
  console.log(
    serviceKey,
    voteTitle,
    voteContent,
    startDate,
    endDate,
    itemContents
  );
  try {
    // 투표대상세대수 찾는 구문
    // let countSQL = `SELECT ho_code AS hoCode, (SELECT COUNT(ho_code) AS hCount FROM t_dongho WHERE dong_code = ?) AS hCount
    //                   FROM t_dongho WHERE dong_code = ?`;
    // console.log("countSQL: " + countSQL);
    // const countData = await pool.query(countSQL, [dongCode, dongCode]);
    // console.log(countData[0]);

    const sql = `INSERT INTO t_vote_agenda(vote_title, vote_desc, v_start_dtime, v_end_dtime, insert_date,
                                             user_code, vote_end_flag, subjects_num, participation_num,
                                             vote_rate)
                   VALUES('${voteTitle}', '${voteContent}', '${startDate}', '${endDate}', now(), '관리사무실',
                          'N', 0, 0, 0)`;
    console.log("sql: " + sql);
    const data = await pool.query(sql);

    // 제일 최근에 추가된 공지사항의 idx값을 불러온다
    let getIdxSQL = `SELECT idx as idx FROM t_vote_agenda ORDER BY idx DESC LIMIT 1`;
    const getIdx = await pool.query(getIdxSQL);
    console.log("getIdx: " + getIdx[0][0].idx);
    ////////////////////////////////////////

    const arr2 = Array.from(Array(itemContents.length), () =>
      Array(3).fill(null)
    );
    // item_no, idx, item_content, insert_date(now()) 순으로 입력
    for (i = 0; i < arr2.length; ++i) {
      for (j = 0; j < 3; ++j) {
        arr2[i][0] = i + 1;
        arr2[i][1] = getIdx[0][0].idx;
        arr2[i][2] = itemContents[i].text;
      }
    }

    let values = arr2;
    console.log(values);
    const itemsSQL = `INSERT INTO t_vote_items(item_no, idx, item_content)
                      VALUES ?`;
    console.log("itemsSQL: " + itemsSQL);
    const itemData = await pool.query(itemsSQL, [values], function (err) {
      if (err) throw err;
      console.log(err);
      pool.end();
    });

    console.log("itemData[0]: " + itemData[0]);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 투표 수정: 단, 이미 시작된 투표는 수정 불가능
router.put("/updateVoteAgenda", async (req, res, next) => {
  let {
    serviceKey = "",
    idx = 0,
    voteTitle = "",
    voteDesc = "",
    vStartDTime = "",
    vEndDTime = "",
    itemContents = [],
    itemNo = [],
  } = req.body;
  console.log(
    serviceKey,
    idx,
    voteTitle,
    voteDesc,
    vStartDTime,
    vEndDTime,
    itemContents,
    itemNo
  );
  try {
    // const sql = `SELECT DATE_FORMAT(v_start_dtime, '%Y-%m-%d %h') AS vsDtime FROM t_vote_agenda WHERE idx = ?`;
    // console.log("sql: " + sql);
    // const data = await pool.query(sql, [idx]);
    // const timeSQL = `SELECT DATE_FORMAT(now(), '%Y-%m-%d %h:%i:%s') AS currTime`;
    // const data2 = await pool.query(timeSQL);
    // let compareTime = data[0][0].vsDtime + ":00:00";
    // if (compareTime > data2[0][0].currTime) {
    //   return res.json({
    //     resultCode: "15",
    //     resultMSG: "진행중인 투표입니다.",
    //   });
    // }

    const originSQL = `SELECT vote_title AS voteTitle, vote_desc AS voteDesc, DATE_FORMAT(v_start_dtime, '%Y-%m-%d %h') AS vsDtime, 
                                DATE_FORMAT(v_end_dtime, '%Y-%m-%d %h') AS veDtime, b.item_content AS itemContents,
                                b.item_no AS itemNo
                         FROM t_vote_agenda a 
                         INNER JOIN t_vote_items b
                         WHERE a.idx = ? AND b.idx = ? AND b.insert_date = b.insert_date`;
    console.log("originSQL: " + originSQL);
    const data3 = await pool.query(originSQL, [idx, idx]);
    console.log(data3[0][1]);
    let defaultVoteTitle = data3[0][0].voteTitle;
    let defaultVoteDesc = data3[0][0].voteDesc;
    let defaultVSDtime = data3[0][0].vsDtime;
    let defaultVEDtime = data3[0][0].veDtime;

    if (!!voteTitle) {
      defaultVoteTitle = voteTitle;
    }
    if (!!voteDesc) {
      defaultVoteDesc = voteDesc;
    }
    if (!!vStartDTime) {
      defaultVSDtime = vStartDTime;
    }
    if (!!vEndDTime) {
      defaultVEDtime = vEndDTime;
    }

    const updateSQL = `UPDATE t_vote_agenda a
                         INNER JOIN t_vote_items b
                         ON a.idx = b.idx
                         SET a.vote_title = ?, a.vote_desc = ?, a.v_start_dtime = ?, a.v_end_dtime = ?, b.item_content = ?
                         WHERE a.idx = ? AND b.item_no = ?`;
    console.log("updateSQL: " + updateSQL);
    for (i = 0; i < itemContents.length; ++i) {
      const data4 = await pool.query(updateSQL, [
        defaultVoteTitle,
        defaultVoteDesc,
        defaultVSDtime,
        defaultVEDtime,
        itemContents[i],
        idx,
        itemNo[i],
      ]);
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 투표 삭제: 단, 이미 시작된 투표는 삭제 불가능
router.delete("/deleteVoteAgenda/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(serviceKey, idx);

  try {
    // const sql = `SELECT DATE_FORMAT(v_start_dtime, '%Y-%m-%d %h') AS vsDtime FROM t_vote_agenda WHERE idx = ?`;
    // console.log("sql: " + sql);
    // const data = await pool.query(sql, [idx]);
    // const timeSQL = `SELECT DATE_FORMAT(now(), '%Y-%m-%d %h:%i:%s') AS currTime`;
    // const data2 = await pool.query(timeSQL);
    // let compareTime = data[0][0].vsDtime + ":00:00";
    // if (compareTime > data2[0][0].currTime) {
    //   return res.json({
    //     resultCode: "15",
    //     resultMSG: "진행중인 투표입니다.",
    //   });
    // }

    const deleteItemSQL = `DELETE FROM t_vote_items WHERE idx = ?`;
    console.log("deleteItemSQL: " + deleteItemSQL);
    const data3 = await pool.query(deleteItemSQL, [idx]);

    const deleteVotersSQL = `DELETE FROM t_voters WHERE idx = ?`;
    console.log("deleteVotersSQL: " + deleteVotersSQL);
    const data4 = await pool.query(deleteVotersSQL, [idx]);

    const deleteAgendaSQL = `DELETE FROM t_vote_agenda WHERE idx = ?`;
    console.log("deleteAgendaSQL: " + deleteAgendaSQL);
    const data5 = await pool.query(deleteAgendaSQL, [idx]);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 오프라인 득표수 추가(투표 마감하기)
router.post("/postOffVote", async (req, res, next) => {
  let {
    serviceKey = "",
    idx = 0,
    voteNumberOff = [],
    voteItems = [],
  } = req.body;
  console.log(serviceKey, idx, voteNumberOff, voteItems);

  try {
    const arr2 = Array.from(Array(voteNumberOff.length), () =>
      Array(3).fill(null)
    );
    // votes_number_off, idx, item_no 순으로 배열에 입력 해야함
    for (i = 0; i < arr2.length; ++i) {
      for (j = 0; j < 3; ++j) {
        arr2[i][0] = voteNumberOff[i];
        arr2[i][1] = idx;
        arr2[i][2] = voteItems[i].itemNo;
      }
    }
    let values = arr2;
    console.log(values);

    const sql =
      "UPDATE t_vote_items SET votes_number_off = ? WHERE idx = ? AND item_no = ?;";

    console.log("sql: " + sql);
    var data = "";
    for (i = 0; i < arr2.length; ++i) {
      data = await pool.query(sql, [
        voteNumberOff[i],
        idx,
        voteItems[i].itemNo,
      ]);
    }
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

// 투표 마감 취소
router.post("/postCancelOffVote", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.body;
  console.log(serviceKey, idx);
  if ((await checkServiceKeyResult(serviceKey)) == false) {
    return res.json({
      resultCode: "30",
      resultMsg: "등록되지 않은 서비스키 입니다.",
    });
  }
  try {
    const sql = `UPDATE t_vote_items SET votes_number_off = 0 WHERE idx = ?`;
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

// 투표 종료 처리
router.post("/postEndVote/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(serviceKey, idx);
  try {
    const sql = `UPDATE t_vote_agenda SET vote_end_flag = 'Y', fin_end_dtime = now() WHERE idx = ?`;
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

// 투표 결과 조회
router.get("/getVoteResult", async (req, res, next) => {
  let { serviceKey = "", idx = 0 } = req.query;
  console.log(serviceKey, idx);

  try {
    const voterSQL = `SELECT CONCAT(b.dong_code, ' - ', b.ho_code) AS voters, b.vote_method AS voteMethod 
                        FROM t_vote_agenda a 
                        INNER JOIN t_voters b
                        WHERE a.idx = b.idx AND a.idx = ?;`;
    console.log("voterSQL: " + voterSQL);
    const vData = await pool.query(voterSQL, [idx]);
    let wpVoters = [];
    let mbVoters = [];
    for (i = 0; i < vData[0].length; ++i) {
      if (vData[0][i].voteMethod == "W") {
        wpVoters[i] = vData[0][i].voters;
      } else if (vData[0][i].voteMethod == "S") {
        mbVoters[i] = vData[0][i].voters;
      }
    }
    const results1 = wpVoters.filter((element) => {
      return element !== null;
    });
    const results2 = mbVoters.filter((element) => {
      return element !== null;
    });
    const sql = `SELECT a.vote_title AS voteTitle, vote_desc AS voteDesc,
                          DATE_FORMAT(a.v_start_dtime, '%Y%m%d%h%i%s') AS vStartDate, 
                          DATE_FORMAT(a.v_end_dtime, '%Y%m%d%h%i%s') AS vEndDate, 
                          a.vote_end_flag AS voteResult, a.subjects_num AS subjectsNum,
                          participation_num AS participationNum, CONCAT(ROUND((participation_num / subjects_num) * 100)) AS voteRate,
                          b.item_no AS itemNo, item_content AS itemContent,  
                          (b.votes_number + b.votes_number_off) AS votesNumber,
                          CONCAT(ROUND((100*(b.votes_number + b.votes_number_off))/participation_num, 2), '%') AS getVotesRate
                      FROM t_vote_agenda a INNER JOIN t_vote_items b
                      ON a.idx = b.idx
                      WHERE a.idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
    let resultList = data[0];

    resultList = data[0];
    if (resultList.length > 0) {
      voteTitle = resultList[0].voteTitle;
      voteDesc = resultList[0].voteDesc;
      vStartDate = resultList[0].vStartDate;
      vEndDate = resultList[0].vEndDate;
      subjectsNum = resultList[0].subjectsNum;
      participationNum = resultList[0].participationNum;
      voteRate = resultList[0].voteRate;
    }
    let voteItems = [];
    for (var i = 0; i < resultList.length; i++) {
      voteItems.push({
        itemNo: resultList[i].itemNo,
        itemContent: resultList[i].itemContent,
        votesNumber: resultList[i].votesNumber,
        getVotesRate: resultList[i].getVotesRate,
      });
    }
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      results1,
      results2,
      voteTitle,
      voteDesc,
      vStartDate,
      vEndDate,
      subjectsNum,
      participationNum,
      voteRate,
      voteItems,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

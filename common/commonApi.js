var express = require("express");
var router = express.Router();
const pool = require("../database/pool");
let {
  uploadSingleImage,
  deleteFile,
  checkUploadType,
} = require("./fileUpload");

router.get("/download", function (req, res) {
  let { fileName = "" } = req.query;
  console.log(fileName);
  const file = `C:/dev/Cloud/complex-webapp/backend/public/notice/${fileName}`;
  res.download(file);
});

router.post("/file", async (req, res, next) => {
  let { fileType = 0 } = req.query;
  console.log(fileType);
  await checkUploadType(fileType);
  uploadSingleImage(req, res, function (err) {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    // Everything went fine.
    file = req.file;
    console.log(file);
    res.status(200).send({
      filename: file.filename,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
      fieldname: file.fieldname,
    });
  });
});

router.delete("/deleteFile", async (req, res, next) => {
  let { idx = 0, fileName = "", fileType = 0, fd = "" } = req.query;
  console.log(idx, fileName, fileType, fd);
  /**
   * 파일 타입
   * 2: 공지
   * 3: 계약
   * 4: 관리비
   */
  await checkUploadType(fileType);
  // 서버에서 해당 파일 삭제
  await deleteFile(fileName);

  // DB에서 해당 파일 이름과 경로 삭제
  if (fileType == 2) {
    console.log("공지사항 파일");
    let sql = `UPDATE t_notice SET file_name = "", file_path = "" WHERE idx = ${idx}`;
    const data = await pool.query(sql);
    console.log("sql: " + sql);
  } else if (fileType == 3) {
    console.log("계약자료 파일");
    let sql = `UPDATE t_contract_document SET file_name = "", file_path = "" WHERE idx = ${idx}`;
    const data = await pool.query(sql);
    console.log("sql: " + sql);
  } else {
    console.log("router.delete(/deleteFile, async (req, res, next) ERROR");
  }
});

module.exports = router;

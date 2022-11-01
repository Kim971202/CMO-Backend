const multer = require("multer");
const fs = require("fs");
var express = require("express");
var router = express.Router();
var path = require("path");

/**
 * 이미지, 공지사항, 계약자료, 엑셀 파일 경로 분기
 * 이미지 : 1
 * 공지사항 : 2
 * 계약자료 : 3
 * 엑셀 : 4
 */

let myFilePath = "";
function checkUploadType(uploadType) {
  if (uploadType === 1) {
    myFilePath = "public/image/";
  } else if (uploadType === 2) {
    myFilePath = "public/notice/";
  } else if (uploadType === 3) {
    myFilePath = "public/contract/";
  } else if (uploadType === 4) {
    myFilePath = "public/excel/";
  }
}

function deleteFile(fileName) {
  console.log("파일 경로: " + myFilePath);
  fs.unlink(myFilePath + fileName, function (err) {
    if (err) {
      console.error(err);
    }
    console.log("File has been Deleted");
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, myFilePath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
const uploadSingleImage = upload.single("file");

checkUploadType(2);
let file = "";
router.post("/file", (req, res, next) => {
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

module.exports = {
  upload,
  file,
  checkUploadType,
  deleteFile,
};
module.exports = router;

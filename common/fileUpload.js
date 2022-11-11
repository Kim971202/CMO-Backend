const multer = require("multer");
const fs = require("fs");
const path = require("path");

/**
 * 이미지, 공지사항, 계약자료, 엑셀 파일 경로 분기
 * 이미지 : 1
 * 공지사항 : 2
 * 계약자료 : 3
 * 엑셀 : 4
 */

async function listDir() {
  try {
    let fileName = await fs.promises.readdir(
      "C:/dev/Cloud/complex-webapp/backend/public/xlsx"
    );
    return fileName[fileName.length - 1];
  } catch (err) {
    console.error("Error occurred while reading directory!", err);
  }
}

let myFilePath = "";
async function checkUploadType(uploadType) {
  if (uploadType == 1) {
    myFilePath = "public/image/";
  } else if (uploadType == 2) {
    myFilePath = "public/notice/";
  } else if (uploadType == 3) {
    myFilePath = "public/contract/";
  } else if (uploadType == 4) {
    myFilePath = "public/xlsx/";
  }
}
async function deleteFile(fileName) {
  console.log("파일 경로: " + myFilePath);
  await fs.promises.unlink(myFilePath + fileName, function (err) {
    if (err) {
      console.error(err);
      console.log("Failed to delete File");
    } else {
      console.log("File has been Deleted");
    }
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

module.exports = {
  upload,
  uploadSingleImage,
  checkUploadType,
  deleteFile,
  listDir,
};

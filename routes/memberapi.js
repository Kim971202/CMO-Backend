const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const config = require("../config.js");

let memberList = [
  { id: "testid1", password: "testpwd1", name: "홍길동", refreshToken: "" },
  { id: "testid2", password: "testpwd2", name: "김철수", refreshToken: "" },
  { id: "testid3", password: "testpwd3", name: "이영희", refreshToken: "" },
];

router.post("/login", async function (req, res, next) {
  console.log("REST API Post Method - Member Login And JWT Sign");
  const memberId = req.body.id;
  const memberPassword = req.body.password;
  var memberItem = memberList.find((object) => object.id == memberId);
  if (memberItem != null) {
    if (memberItem.password == memberPassword) {
      let accessToken = "";
      let errorMessageAT = "";

      // Access-Token
      try {
        accessToken = await new Promise((resolve, reject) => {
          jwt.sign(
            {
              memberId: memberItem.id,
              memberName: memberItem.name,
            },
            config.secret,
            {
              expiresIn: "60m", //1d -> 60m
            },
            (err, token) => {
              if (err) {
                reject(err);
              } else {
                resolve(token);
              }
            }
          );
        });
      } catch (err) {
        errorMessageAT = err;
      }
      console.log("Access-Token : " + accessToken);
      console.log("Access-Token Error : " + errorMessageAT);

      let refreshToken = "";
      let errorMessageRT = "";

      // Refresh-Token
      try {
        refreshToken = await new Promise((resolve, reject) => {
          jwt.sign(
            {
              memberId: memberItem.id,
            },
            config.secret,
            {
              expiresIn: "30d",
            },
            (err, token) => {
              if (err) {
                reject(err);
              } else {
                resolve(token);
              }
            }
          );
        });
      } catch (err) {
        errorMessageRT = err;
      }
      console.log("Refresh-Token : " + refreshToken);
      console.log("Refresh-Token Error : " + errorMessageRT);

      if (errorMessageAT == "" && errorMessageRT == "") {
        memberItem.refreshToken = refreshToken;
        res.json({
          success: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
        });
      } else {
        res
          .status(401)
          .json({ success: false, errormessage: "token sign fail" });
      }
    } else {
      res.status(401).json({
        success: false,
        errormessage: "id and password is not identical",
      });
    }
  } else {
    res.status(401).json({
      success: false,
      errormessage: "id and password is not identical",
    });
  }
});

router.post("/refresh", async function (req, res, next) {
  console.log("REST API Post Method - Member JWT Refresh");
  const memberId = req.body.id;
  const accessToken = req.body.accessToken;
  const refreshToken = req.body.refreshToken;
  var memberItem = memberList.find((object) => object.id == memberId);
  if (memberItem != null) {
    //
    let refreshPayload = "";
    let errorMessageRT = "";

    // Refresh-Token Verify(refreshToken이 유효한지 검증)
    try {
      refreshPayload = await new Promise((resolve, reject) => {
        jwt.verify(refreshToken, config.secret, (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        });
      });
    } catch (err) {
      errorMessageRT = err;
    }
    console.log("Refresh-Token Payload : ");
    console.log(refreshPayload);
    console.log("Refresh-Token Verify : " + errorMessageRT);

    //토큰 검증을 위해 만료된 Access-Token의 payload를 가져옴.
    //ignoreExpiration를 true로 설정하면 만료를 무시하고 payload를 디코딩하여 리턴
    let accessPayload = "";
    let errorMessageAT = "";

    // Access-Token Verify
    try {
      accessPayload = await new Promise((resolve, reject) => {
        jwt.verify(
          accessToken,
          config.secret,
          { ignoreExpiration: true },
          (err, decoded) => {
            if (err) {
              reject(err);
            } else {
              resolve(decoded);
            }
          }
        );
      });
    } catch (err) {
      errorMessageAT = err;
    }
    console.log("Access-Token Payload : ");
    console.log(accessPayload);
    console.log("Access-Token Verify : " + errorMessageAT);

    //사용자 아이디와 Access-Token의 payload에 저장된 사용자 아이디,
    //              Refresh-Token의 payload에 저장된 사용자 아이디가 동일한지 검증하고
    //사용자 객체에 저장된 refreshToken과 동일한지 검증한 후 Access-Token를 재발급
    //Refresh-Token과 Access-Token이 검증 단계에서 에러가 있으면 상태 코드를 401로 리턴
    if (errorMessageRT == "" && errorMessageAT == "") {
      if (
        memberId == accessPayload.memberId &&
        memberId == refreshPayload.memberId &&
        memberItem.refreshToken == refreshToken
      ) {
        let accessToken = "";
        errorMessageAT = "";

        // Access-Token
        try {
          accessToken = await new Promise((resolve, reject) => {
            jwt.sign(
              {
                memberId: memberItem.id,
                memberName: memberItem.name,
              },
              config.secret,
              {
                expiresIn: "60m",
              },
              (err, token) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(token);
                }
              }
            );
          });
        } catch (err) {
          errorMessageAT = err;
        }
        console.log("Access-Token : " + accessToken);
        console.log("Access-Token Error : " + errorMessageAT);

        if (errorMessageAT == "") {
          res.json({ success: true, accessToken: accessToken });
        } else {
          res
            .status(401)
            .json({ success: false, errormessage: "token sign fail" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, errormessage: "Token is not identical" });
      }
    } else if (errorMessageRT != "") {
      res.status(401).json({
        success: false,
        errormessage: "Refresh-Token has expired or invalid signature",
      });
    } else if (errorMessageAT != "") {
      res.status(401).json({
        success: false,
        errormessage: "Access-Token is invalid signature",
      });
    }
  } else {
    res
      .status(401)
      .json({ success: false, errormessage: "id is not identical" });
  }
});

module.exports = router;

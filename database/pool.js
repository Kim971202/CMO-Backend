const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  multipleStatements: true,
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "1234",
  database: "exceltest",
  connectionLimit: 10,
});

module.exports = pool;

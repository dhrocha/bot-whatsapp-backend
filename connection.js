const mysql = require("mysql2/promise");

// with connection pool
module.exports = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "test_whatsapp",
  port: 8889,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

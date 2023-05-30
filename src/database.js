// connecting to db
const mysql = require('mysql');
const env = require('dotenv');
require("colors");
env.config();
let connection = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
    port: process.env.DBPORT
});


module.exports = {connection};
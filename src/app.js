const express = require("express");
require("colors");
const app = express();
const morgan = require("morgan");
const path = require("path");
const favicon = require("express-favicon");
const session = require("cookie-session");
const fileUpload = require("express-fileupload");
const { createServer } = require("http");
const {configureSocket,router} = require('./routes/index');
//const apriority = require("./apriori");
const server = createServer(app);
configureSocket(server);
var bodyParser = require("body-parser");

//TODOS connecting to db
console.log('Connecting....'.yellow);
app.set("port", process.env.PORT || 3000);
//TODOS import routes
const indexRoutes = router;
app.set("views", path.join(__dirname, "views"));
app.use(favicon(path.join(__dirname, 'public/images/logo.png')));
app.use(express.static("public"));
app.use("/", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

//TODOS middlewares
app.use(fileUpload());
app.use(express.json());
app.use(morgan("dev"));
app.use(session({
  cookie: {
    secure: true,
    maxAge: 60000
  },
  secret: 'secret',
  saveUninitialized: true,
  resave: false
}));

app.use(bodyParser.urlencoded({ extended: true }));

//TODOS routes
app.use("/", indexRoutes);

//TODOS starting the server
server.listen(3000, () => {
  console.log(`Server on PORT:${app.get("port")}`.green);
});



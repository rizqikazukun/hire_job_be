var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var Sentry = require("@sentry/node");
var Tracing = require("@sentry/tracing");
var fileUpload = require("express-fileupload");
var compression = require("compression");
require("dotenv").config();

var app = express();
var indexRouter = require("./routes/index");

app.use(cors({
  origin: process.env.FE_URL,
}));

// Compress all HTTP responses
app.use(
  compression({
    // filter: Decide if the answer should be compressed or not,
    // depending on the 'shouldCompress' function above
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        // Will not compress responses, if this header is present
        return false;
      }
      // Resort to standard compression
      return compression.filter(req, res);
    },
    // threshold: It is the byte threshold for the response
    // body size before considering compression, the default is 1 kB
    threshold: 0,
  })
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// use middleware for grant access upload
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Index route
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res) {
  res.status(200).json({
    status: true,
    messages: "Api running well",
  });
});

// catch error in sentry
if (process.env.SENTRY_DSN) {
  // Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // or pull from params
    // dsn: params.SENTRY_DSN,
    environment: "development",
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    // or pull from params
    // tracesSampleRate: parseFloat(params.SENTRY_TRACES_SAMPLE_RATE),
  });

  // RequestHandler creates a separate execution context using domains, so that every
  // transaction/span/breadcrumb is attached to its own Hub instance
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
}

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// init server
app.listen(process.env.PORT || 3000, () =>
  console.log(`server already run on port ${process.env.PORT || 3000}`)
);

module.exports = app;

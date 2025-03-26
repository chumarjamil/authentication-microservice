require("dotenv").config();
const express = require("express");
const app = express();
const userRouter = require("./api/users/user.router");

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
  dsn: "https://faba75440ed645d7aec2bb96f90bfaeb@o1028373.ingest.sentry.io/4504563941507072",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const transaction = Sentry.startTransaction({
  op: "test",
  name: "My First Test Transaction",
});

setTimeout(() => {
  try {
    foo();
  } catch (e) {
    Sentry.captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);

app.use(express.json());

app.use("/api/user", userRouter);

// Health test endpoint for AWS
app.use("/", (req, res) => {
  res.status(200).send("All Good!");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("server up and running on PORT :", port);
});

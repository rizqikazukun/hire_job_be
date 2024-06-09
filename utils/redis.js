// require("dotenv").config();
const Redis = require("ioredis");

const redis = new Redis({
  username: process.env.REDIS_USER,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASS,
  port: process.env.REDIS_PORT,
  autoResubscribe: false,
  maxRetriesPerRequest: 5,
  tls: true,
  enableTLSForSentinelMode: false
});

module.exports = redis;

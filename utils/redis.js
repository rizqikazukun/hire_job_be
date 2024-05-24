require("dotenv").config();
const Redis = require("ioredis");

let redis;

redis = new Redis({
  username: process.env.REDIS_USER, 
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASS, 
  port: process.env.REDIS_PORT, 
  autoResubscribe: false,
  maxRetriesPerRequest: 5,
});

module.exports = redis;

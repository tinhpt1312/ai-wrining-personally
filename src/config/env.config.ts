import { config } from 'dotenv';

config();

export const ENV = {
  APP_PORT: process.env.APP_PORT ?? 3000,

  DATABASE: {
    HOST: process.env.DB_HOST,
    PORT: Number(process.env.DB_PORT),
    USERNAME: process.env.DB_USERNAME,
    PASSWORD: process.env.DB_PASSWORD,
    DATABASE: process.env.DB_DATABASE,
  },

  COOKIE: {
    ACCESS_TOKEN_TIME: process.env.COOKIE_ACCESS_TOKEN_EXPIRATION_TIME,
    ACCESS_TOKEN_NAME: process.env.COOKIE_ACCESS_TOKEN_NAME,
  },

  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES: process.env.JWT_EXPIRATION_TIME,
    COOKIE_NAME: process.env.JWT_COOKIE_NAME,
  },

  ONEROUTER: {
    API_KEY: process.env.ONEROUTER_API_KEY,
    MODEL: process.env.ONEROUTER_MODEL,
    TEMPERATURE: Number(process.env.ONEROUTER_TEMPERATURE),
    MAX_TOKENS: Number(process.env.ONEROUTER_MAX_TOKENS),
    DAILY_TOKEN_LIMIT: Number(process.env.DAILY_TOKEN_LIMIT),
    TOKEN_BUFFER_PERCENT: Number(process.env.TOKEN_BUFFER_PERCENT),
  },

  OPENAI: {
    API_KEY: process.env.ONEROUTER_API_KEY,
    MODEL: process.env.ONEROUTER_MODEL,
    TEMPERATURE: Number(process.env.ONEROUTER_TEMPERATURE),
    MAX_TOKENS: Number(process.env.ONEROUTER_MAX_TOKENS),
  },
};

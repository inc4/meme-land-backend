import dotenv from 'dotenv';
dotenv.config();


const env = process.env;

const config = {};

// server
config.server = {
  port: env.SERVER_PORT,
  url: env.SERVER_URL
};

config.CORS = {
  defaultCorsOptions: {
    origin: (() => {
      const rawOrigins = env.CORS_ALLOWED_ORIGINS;
      if (!rawOrigins) return true;
      const originsList = rawOrigins.split(' ');
      return originsList.map((origin) => {
        const originUrl = new URL(origin);
        return new RegExp(`${originUrl.protocol}//([A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?\\.)?${originUrl.hostname}`);
      });
    })(),
    methods: env.CORS_ALLOWED_METHODS.split(' '),
    exposedHeaders: env.CORS_EXPOSED_HEADERS.split(' '),
    allowedHeaders: env.CORS_ALLOWED_HEADERS.split(' '),
  },

};

// logger
config.logger = {
  transports: {
    Console: {
      level: env.LOGGER_TRANSPORT_CONSOLE_LEVEL,
    },
  },
  hostName: env.LOGGER_HOST_NAME,
  serviceName: env.LOGGER_SERVICE_NAME,
};

// mongo
config.mongo = {
  url: env.MONGODB_URL,
  options: {
    autoIndex: true,
  },
};
if (env.MONGODB_SSL_ENABLE) {
  config.mongo.options.ssl = true;
}
if (env.MONGODB_USER && env.MONGODB_PASS) {
  config.mongo.options.user = env.MONGODB_USER;
  config.mongo.options.pass = env.MONGODB_PASS;
}

config.change_campaign_status_interval = 24 * 60 * 60 * 1000; // 24 hours


export default config;

/**
 * @class
 * @description A class for logging application lifecycle.
 */
export class WinstonLoggerAdapter {
  /**
   * @private
   * @static
   * @description A logger client.
   */
  #loggerClient;

  /**
   * @private
   * @static
   * @description A logger settings.
   */
  #config;

  /**
   * @private
   * @static
   * @description A winston logger client instance.
   */
  #loggerInstance;

  /**
   * @private
   * @static
   * @description A logger client transports.
   */
  #transports;

  /**
   * @description logger transports settings
   * @typedef {Object} LoggerTransportSettings
   * @property {Object} LoggerTransportSettings.Console logger Console transport settings
   * @property {string} LoggerTransportSettings.Console.level max level of Console logging.
   *  Accepted values : 'debug', 'info', 'warn', 'error'
   *
   * @property {Object} LoggerTransportSettings.File logger File transport settings
   * @property {string} LoggerTransportSettings.File.level max level of File logging.
   *  Accepted values : 'debug', 'info', 'warn', 'error'
   * @property {string} LoggerTransportSettings.File.filename log file name
   *
   * @property {Object} LoggerTransportSettings.Http logger Http transport settings
   * @property {string} LoggerTransportSettings.Http.level max level of Http logging.
   *  Accepted values : 'debug', 'info', 'warn', 'error'
   */

  /**
   * @constructor
   * @public
   * @description create WinstonLoggerAdapter instance
   * @param {Object} loggerClient winstone logger client
   * @param {Object} config logger settings
   * @param {LoggerTransportSettings} config.transports logger transports settings {@link LoggerTransportSettings}
   */
  constructor(loggerClient, config) {
    this.#loggerClient = loggerClient;
    this.#config = config;
    this.#loggerInstance = null;
    this.#transports = {};
    this.#init();
  }

  /**
   * @public
   * @description set logging max level
   * @param {string} level max level of logging. Accepted values: 'debug', 'info', 'warn', 'error'
   * @param {string} transport default transport name. Accepted values: 'Console', 'File', 'Http'
   */
  setLevel(level, transport) {
    if (this.#loggerInstance.levels[level] === undefined) {
      return;
    }
    if (!Object.keys(this.#transports).includes(transport)) {
      return;
    }
    this.#transports[transport].level = level;
  }

  /**
   * @public
   * @description wrap all method in class for debug output. Output info: method name, input args and default logger info.
   * @param {Object} classInstance an instance of any ES6 class
   */
  debugWrapper(classInstance) {
    const fields = Reflect.ownKeys(classInstance.constructor.prototype);
    const className = classInstance.constructor.name;
    fields.forEach((field) => {
      const originalMethod = classInstance[field];
      if (typeof originalMethod === 'function') {
        classInstance[field] = (...args) => {
          this.#loggerInstance.debug(`>>>> ${className}:${field}(${args})`);
          return originalMethod.apply(classInstance, args);
        };
      }
    });
  }

  /**
   * @public
   * @description log error level message
   * @param  {...any} args the same params that use winston method 'logger.error(...args)'
   */
  error(...args) {
    this.#loggerInstance.error(...args);
  }

  /**
   * @public
   * @description log warning level message
   * @param  {...any} args the same params that use winston method 'logger.warn(...args)'
   */
  warn(...args) {
    this.#loggerInstance.warn(...args);
  }

  /**
   * @public
   * @description log info level message
   * @param  {...any} args the same params that use winston method 'logger.info(...args)'
   */
  info(...args) {
    this.#loggerInstance.info(...args);
  }

  /**
   * @public
   * @description log debug level message
   * @param  {...any} args the same params that use winston method 'logger.debug(...args)'
   */
  debug(...args) {
    this.#loggerInstance.debug(...args);
  }

  /**
   * @description after call this method process will wait until all data has been flushed (i.e. all your logs have been written)
   */
  end() {
    this.#loggerInstance.end();
  }

  /**
   * @public
   * @description compose request options object
   * @param {string} id
   * @param {string} ip
   * @return {Object}
   */
  composeRequestOpts(id, ip) {
    return {
      requestId: id,
      requestIp: ip,
    };
  }


  /**
   * @private
   * @description create winston logger instance
   */
  #init = () => {
    if (this.#config.transports.Console) {
      this.#transports.Console = this.#composeConsoleTransport(this.#config.transports.Console);
    }

    if (this.#config.transports.File) {
      this.#transports.File = this.#composeFileTransport(this.#config.transports.File);
    }

    if (this.#config.transports.Http) {
      this.#transports.Http = this.#composeHttpTransport(this.#config.transports.Http);
    }

    this.#loggerInstance = this.#loggerClient.createLogger({
      transports: Object.keys(this.#transports).map((transport) => this.#transports[transport]),
      exitOnError: false,
    });
  };

  /**
   * @private
   * @description compose console transport for winston logger
   * @param {Object} settings logger settings
   * @param {string} settings.level console transport min level
   * @return {Object} winston transport object
   */
  #composeConsoleTransport = (settings) => {
    const format = this.#loggerClient.format;
    return new this.#loggerClient.transports.Console({
      level: settings.level,
      format: format.combine(
        format(this.#format)({
          host: this.#config.hostName,
          service: this.#config.serviceName,
        }),
        format.colorize(),
        format.timestamp(),
        format.align(),
        format.simple(),
      ),
      // handleExceptions: true,
      // handleRejections: true,
    });
  };

  /**
   * @private
   * @description compose file transport for winston logger
   * @param {Object} settings logger settings
   * @param {string} settings.level file transport min level
   * @param {string} settings.filename file transport file name
   * @return {Object} winston transport object
   */
  #composeFileTransport = (settings) => {
    const format = this.#loggerClient.format;
    return new this.#loggerClient.transports.File({
      level: settings.level,
      filename: settings.filename,
      format: format.combine(
        format(this.#format)({
          host: this.#config.hostName,
          service: this.#config.serviceName,
        }),
        format.timestamp(),
        format.json(),
      ),
      // FIXME: rotate log files
      // maxsize: 5242880, // 5MB
      // maxFiles: 5,
      // handleExceptions: true,
      // handleRejections: true,
    });
  };

  /**
   * @private
   * @description compose http transport for winston logger
   * @param {Object} settings logger settings
   * @param {string} settings.level http transport min level
   * @return {Object} winston transport object
   */
  #composeHttpTransport = (settings) => {
    const format = this.#loggerClient.format;
    return new this.#loggerClient.transports.Http({
      level: settings.level,
      format: format.combine(
        format(this.#format)({
          host: this.#config.hostName,
          service: this.#config.serviceName,
        }),
        format.timestamp(),
        format.json(),
      ),
      // handleExceptions: true,
      // handleRejections: true,
    });
  };

  /**
   * @private
   * @description winston logger custom format predicate
   * @param {Object} info log object metadata
   * @param {Object} opts log object optional data
   * @return {Object} log object extended metadata
   */
  #format = (info, opts) => {
    info.host = opts.host;
    info.service = opts.service;
    return info;
  };
}

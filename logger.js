const winston = require('winston');
const { format, transports } = winston;
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  });

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat,
    ),
    transports: [
        new transports.File({ filename: './logs/error.log', level: 'error' }),
        new transports.File({ filename: './logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            timestamp(),
            myFormat,
            format.colorize({ all: true }),
        )
     }));
}

process.on('uncaughtException', function (err) {
    console.log('err',err)
  logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging with MetaData
  // process.exit(1); // exit with failure
});

process.on('unhandledRejection', (err, promise) => {
  logger.error('uncaughtException', { message : err.message, stack : err.stack }); // logging })
});

module.exports = logger;
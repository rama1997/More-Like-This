const fs = require("fs");
const path = require("path");
const { ENABLE_LOGGING } = require("../config");

// Define log directory
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Function to format and write logs asynchronously
 * @param {string} file - File to output log messages into
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {object} data - Optional data to log
 */
function writeLog(file, level, message, data = null) {
	if (!ENABLE_LOGGING) return;

	const timestamp = new Date().toISOString();
	const logEntry = {
		timestamp,
		level,
		message,
		...(data ? { data } : {}),
	};

	// Convert log entry to a formatted string
	const logLine = JSON.stringify(logEntry) + "\n";

	// Append log to the correct file
	fs.appendFile(path.join(logsDir, file), logLine, (err) => {
		if (err) return;
	});
}

// Logger object
const logger = {
	info: (message, data) => writeLog("app.log", "INFO", message, data),
	warn: (message, data) => writeLog("app.log", "WARN", message, data),
	debug: (message, data) => writeLog("app.log", "DEBUG", message, data),
	error: (message, data) => writeLog("error.log", "ERROR", message, data),

	emptyCatalog: (message, data = {}) => {
		writeLog("emptyCatalog.log", "EMPTY_CATALOG", message, data);
	},

	cache: (message, data = {}) => {
		writeLog("cache.log", "CACHE", message, data);
	},
};

module.exports = logger;

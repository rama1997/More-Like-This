const fs = require("fs");
const path = require("path");

// Load User Config
function getUserConfig() {
	const userConfigFilePath = path.join(__dirname, "userConfig.json");
	let userConfig = {};
	if (fs.existsSync(userConfigFilePath)) {
		userConfig = JSON.parse(fs.readFileSync(userConfigFilePath, "utf-8"));
	}
	return userConfig;
}

module.exports = {
	getUserConfig,
};

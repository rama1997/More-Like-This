const fs = require("fs");
const path = require("path");

// Load User Config
function getUserConfig() {
	try {
		const userConfigFilePath = path.join(__dirname, "..", "config", "userConfig.json");
		if (fs.existsSync(userConfigFilePath)) {
			const content = JSON.parse(fs.readFileSync(userConfigFilePath, "utf-8"));
			return content;
		} else {
			return {};
		}
	} catch (error) {
		return {};
	}
}

module.exports = {
	getUserConfig,
};

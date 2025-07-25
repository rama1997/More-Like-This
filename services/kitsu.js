const fetch = require("node-fetch");
const KITSU_API_BASE_URL = "https://kitsu.io/api/edge";
const { withTimeout } = require("../utils/timeout");
const logger = require("../utils/logger");

async function convertKitsuId(id) {
	try {
		const url = `${KITSU_API_BASE_URL}/anime/${id.split(":")[1]}/`;

		const response = await withTimeout(fetch(url), 5000, "Kitsu API search timed out");
		const json = await response.json();

		const rawTitle = json?.data?.attributes?.titles?.en || json?.data?.attributes?.titles?.en_jp || null;

		if (!rawTitle) {
			return null;
		}

		const match = rawTitle.match(/^(.*?)\s+Season\s+\d+/i);
		const title = match ? match[1].trim() : rawTitle.trim();

		if (!title) {
			return null;
		}

		const year = json?.data?.attributes?.startDate.split("-")[0] || null;

		// Kitsu contains many types of media beyond just tv and movies. Might be inconsistent with media type from other APIs
		let type;
		let kitsuType = json?.data?.attributes?.subtype;
		if (kitsuType === "TV" || kitsuType == "ONA" || kitsuType == "OVA") {
			type = "series";
		} else {
			type = "movie";
		}

		return { title, year, type };
	} catch (error) {
		logger.error(error.message, null);
		return null;
	}
}

module.exports = {
	convertKitsuId,
};

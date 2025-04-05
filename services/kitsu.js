const fetch = require("node-fetch");
const KITSU_API_BASE_URL = "https://kitsu.io/api/edge";

async function convertKitsuId(id) {
	try {
		const url = `${KITSU_API_BASE_URL}/anime/${id.split(":")[1]}/`;

		const response = await fetch(url);
		const json = await response.json();

		const title = json?.data?.attributes?.titles?.en || json?.data?.attributes?.titles?.en_jp || "";
		const year = json?.data?.attributes?.startDate.split("-")[0] || "";

		// Kitsu contains a subtype called "specials", but they are considered as movies in most other platforms
		const type = json?.data?.attributes?.subtype === "TV" ? "series" : "movie";

		return { title, year, type };
	} catch (error) {
		return "";
	}
}

module.exports = {
	convertKitsuId,
};

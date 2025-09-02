async function streamHandler(origin, type, id, userConfig) {
	console.log(id);

	// Parse searchKey for proper ids
	let searchKey;
	if (id.startsWith("tt")) {
		searchKey = id.split(":")[0];
	} else if (id.startsWith("kitsu")) {
		searchKey = id.split(":").slice(0, 2).join(":");
	}

	const streamOrder = userConfig.streamOrder;
	const enabledStreamButtons = userConfig.enabledStreamButtons;

	let stream = [];

	for (let button of streamOrder) {
		if (button === "detail" && enabledStreamButtons.detail) {
			const detailButton = {
				name: "More Like This",
				description: `Go to detail page`,
				externalUrl: (origin?.includes("web.stremio.com") ? "https://web.stremio.com/#" : "stremio://") + `/detail/${type}/mlt-meta-${id}`,
			};

			stream.push(detailButton);
		} else if (button === "app" && enabledStreamButtons.app) {
			const appSearchButton = {
				name: "More Like This",
				description: `Search recommendations in Stremio App`,
				externalUrl: `stremio:///search?search=${searchKey}`,
			};

			stream.push(appSearchButton);
		} else if (button === "web" && enabledStreamButtons.web) {
			const webSearchButton = {
				name: "More Like This",
				description: `Search recommendations in Stremio Web`,
				externalUrl: `https://web.stremio.com/#/search?search=${searchKey}`,
			};

			stream.push(webSearchButton);
		} else if (button === "recs" && enabledStreamButtons.recs) {
			const recsButton = {
				name: "More Like This",
				description: `Get similar recommendations`,
				externalUrl: (origin?.includes("web.stremio.com") ? "https://web.stremio.com/#" : "stremio://") + `/detail/${type}/mlt-rec-${id}`,
			};

			stream.push(recsButton);
		}
	}

	return Promise.resolve({
		streams: stream,
		cacheMaxAge: 0,
	});
}

module.exports = {
	streamHandler,
};

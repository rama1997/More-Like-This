async function streamHandler(origin, type, metaId, userConfig, metadataSource) {
	// Parse for proper ids to search
	let searchId = metaId.startsWith("mlt") ? metaId.split("-").slice(2).join("-") : metaId;

	// Remove season/episode info if exists
	if (searchId.startsWith("tt")) {
		searchId = searchId.split(":")[0];
	} else if (searchId.startsWith("kitsu") || searchId.startsWith("tmdb") || searchId.startsWith("trakt")) {
		searchId = searchId.split(":").slice(0, 2).join(":");
	}

	const streamOrder = userConfig.streamOrder;
	const enabledStreamButtons = userConfig.enabledStreamButtons;

	let stream = [];

	for (let button of streamOrder) {
		if (button === "detail" && enabledStreamButtons.detail) {
			let detailURL;
			if (searchId.startsWith("tt")) {
				if (metadataSource.source === "cinemeta") {
					detailURL = `/detail/${type}/${searchId}`;
				} else {
					detailURL = `/detail/${type}/mlt-meta-${searchId}`;
				}
			} else {
				detailURL = `/detail/${type}/${metaId.split(":").slice(0, 2).join(":")}`;
			}

			const detailButton = {
				name: "More Like This",
				description: `Go to detail page`,
				externalUrl: (origin?.includes("web.stremio.com") ? "https://web.stremio.com/#" : "stremio://") + detailURL,
			};

			stream.push(detailButton);
		} else if (button === "app" && enabledStreamButtons.app) {
			const appSearchButton = {
				name: "More Like This",
				description: `Search recommendations in Stremio App`,
				externalUrl: `stremio:///search?search=${searchId}`,
			};

			stream.push(appSearchButton);
		} else if (button === "web" && enabledStreamButtons.web) {
			const webSearchButton = {
				name: "More Like This",
				description: `Search recommendations in Stremio Web`,
				externalUrl: `https://web.stremio.com/#/search?search=${searchId}`,
			};

			stream.push(webSearchButton);
		} else if (button === "recs" && enabledStreamButtons.recs) {
			const recsButton = {
				name: "More Like This",
				description: `Get similar recommendations`,
				externalUrl: (origin?.includes("web.stremio.com") ? "https://web.stremio.com/#" : "stremio://") + `/detail/${type}/mlt-rec-${searchId}`,
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

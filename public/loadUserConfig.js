document.addEventListener("DOMContentLoaded", () => {
	if (window.userConfig) {
		const config = window.userConfig;

		// Populate API key inputs
		if (config.apiKeys) {
			const tmdbInput = document.getElementById("tmdbApiKey");
			const traktInput = document.getElementById("traktApiKey");
			const geminiInput = document.getElementById("geminiApiKey");
			const tastediveInput = document.getElementById("tastediveApiKey");
			const rpdbInput = document.getElementById("rpdbApiKey");
			const watchmodeInput = document.getElementById("watchmodeApiKey");
			const simklInput = document.getElementById("simklApiKey");

			if (tmdbInput) tmdbInput.value = config.apiKeys.tmdb?.key || "";
			if (traktInput) traktInput.value = config.apiKeys.trakt?.key || "";
			if (geminiInput) geminiInput.value = config.apiKeys.gemini?.key || "";
			if (tastediveInput) tastediveInput.value = config.apiKeys.tastedive?.key || "";
			if (rpdbInput) rpdbInput.value = config.apiKeys.rpdb?.key || "";
			if (watchmodeInput) watchmodeInput.value = config.apiKeys.watchmode?.key || "";
			if (simklInput) simklInput.value = config.apiKeys.simkl?.key || "";
		}

		const includeTmdbCollectionCheckbox = document.getElementById("includeTmdbCollection");
		if (includeTmdbCollection) {
			if (config.includeTmdbCollection) {
				includeTmdbCollectionCheckbox.checked = true;
			}
		}

		// Combine Catalog
		const combineCatalogCheckbox = document.getElementById("combineCatalogs");
		if (combineCatalogCheckbox) {
			if (config.combineCatalogs) {
				combineCatalogCheckbox.checked = true;
			}
		}

		// Catalog Order
		const catalogOrder = document.querySelector(".catalog-order");
		const catalogOrderInput = document.getElementById("catalogOrder");
		if (catalogOrderInput && config.catalogOrder) {
			const order = config.catalogOrder;
			const itemsMap = {};

			// Map current items by their name
			const currentItems = [...catalogOrder.querySelectorAll(".catalog-item")];
			currentItems.forEach((item) => {
				const name = item.dataset.value;
				if (name) itemsMap[name] = item;
			});

			// Reorder DOM elements based on saved order
			order.forEach((name) => {
				const item = itemsMap[name];
				if (item) catalogOrder.appendChild(item);
			});

			catalogOrderInput.value = config.catalogOrder.join(",");
		}

		// Optional Settings
		const metadataSourceSelect = document.getElementById("metadataSource");
		if (metadataSourceSelect && config.metadataSource) {
			metadataSourceSelect.value = config.metadataSource;
		}

		const languageSelect = document.getElementById("language");
		if (languageSelect && config.language) {
			languageSelect.value = config.language;
		}

		const keepEnglishPostersCheckbox = document.getElementById("keepEnglishPoster");
		if (keepEnglishPostersCheckbox) {
			if (config.keepEnglishPosters) {
				keepEnglishPostersCheckbox.checked = true;
			} else {
				keepEnglishPostersCheckbox.checked = false;
			}
		}

		// Stream Order
		const streamOrder = document.querySelector(".stream-order");
		const streamOrderInput = document.getElementById("streamOrder");
		if (streamOrderInput && config.streamOrder) {
			const order = config.streamOrder;
			const itemsMap = {};

			// Map current items by their name
			const currentItems = [...streamOrder.querySelectorAll(".stream-item")];
			currentItems.forEach((item) => {
				const name = item.dataset.value;
				if (name) itemsMap[name] = item;
			});

			// Reorder DOM elements based on saved order
			order.forEach((name) => {
				const item = itemsMap[name];
				if (item) streamOrder.appendChild(item);
			});

			streamOrderInput.value = config.streamOrder.join(",");
		}

		// Stream Button Enabled
		if (config.enabledStreamButtons) {
			const detailCheckbox = document.getElementById("streamDetailEnabled");
			const appCheckbox = document.getElementById("streamAppEnabled");
			const webCheckbox = document.getElementById("streamWebEnabled");
			const recsCheckbox = document.getElementById("streamRecEnabled");

			if (detailCheckbox) {
				detailCheckbox.checked = !!config.enabledStreamButtons.detail;
			}
			if (appCheckbox) {
				appCheckbox.checked = !!config.enabledStreamButtons.app;
			}
			if (webCheckbox) {
				webCheckbox.checked = !!config.enabledStreamButtons.web;
			}
			if (recsCheckbox) {
				recsCheckbox.checked = !!config.enabledStreamButtons.recs;
			}
		}

		const enableTitleSearchingCheckbox = document.getElementById("enableTitleSearching");
		if (enableTitleSearchingCheckbox) {
			if (config.enableTitleSearching) {
				enableTitleSearchingCheckbox.checked = true;
			} else {
				enableTitleSearchingCheckbox.checked = false;
			}
		}
	}
});

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

			if (tmdbInput) tmdbInput.value = config.apiKeys.tmdb?.key || "";
			if (traktInput) traktInput.value = config.apiKeys.trakt?.key || "";
			if (geminiInput) geminiInput.value = config.apiKeys.gemini?.key || "";
			if (tastediveInput) tastediveInput.value = config.apiKeys.tastedive?.key || "";
			if (rpdbInput) rpdbInput.value = config.apiKeys.rpdb?.key || "";
			if (watchmodeInput) watchmodeInput.value = config.apiKeys.watchmode?.key || "";

			const simklCheckbox = document.getElementById("simkl");
			if (simklCheckbox && config.apiKeys.simkl?.valid) {
				simklCheckbox.checked = true;
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
				const name = item.querySelector(".catalog-name")?.textContent;
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

		const streamButtonPlatform = document.getElementById("streamButtonPlatform");
		if (streamButtonPlatform && config.streamButtonPlatform) {
			streamButtonPlatform.value = config.streamButtonPlatform;
		}

		const includeTmdbCollectionCheckbox = document.getElementById("includeTmdbCollection");
		if (includeTmdbCollection) {
			if (config.includeTmdbCollection) {
				includeTmdbCollectionCheckbox.checked = true;
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

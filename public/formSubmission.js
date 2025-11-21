// Set behavior of the installation buttons
document.addEventListener("DOMContentLoaded", () => {
	const forCopyInput = document.getElementById("forCopy");
	const installBtn = document.getElementById("installBtn");
	const copyManifestBtn = document.getElementById("copyManifestBtn");

	installBtn.addEventListener("click", function () {
		forCopyInput.value = "false";
	});

	copyManifestBtn.addEventListener("click", async function (e) {
		e.preventDefault(); // stop form submission
		forCopyInput.value = "true";

		const form = document.querySelector("form");
		const formData = new FormData(form);

		// Convert to plain object
		const plainData = {};
		formData.forEach((value, key) => {
			plainData[key] = value;
		});

		try {
			const response = await fetch("/saveConfig", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(plainData),
			});

			if (!response.ok) throw new Error("Failed to save config");

			const data = await response.json();
			if (data.manifestUrl) {
				// Copy to clipboard
				await navigator.clipboard.writeText(data.manifestUrl);

				// Show manifest URL box
				const manifestBox = document.getElementById("manifestUrlBox");
				const manifestInput = document.getElementById("manifestUrlDisplay");
				manifestInput.value = data.manifestUrl;
				manifestBox.classList.remove("hidden");

				// Open manifest page in new tab
				window.open(data.manifestUrl, "_blank");
			}
		} catch (err) {
			console.error(err);
			alert("Error copying manifest URL. Please try again.");
		}
	});
});

// Make sure all inputed API Keys are validated first before submiting form
document.querySelector("form").addEventListener("submit", function (e) {
	const sources = ["tmdb", "trakt", "gemini", "tastedive", "watchmode", "simkl", "rpdb"];
	let allValid = true;

	for (const source of sources) {
		const input = document.getElementById(`${source}ApiKey`);
		const apiKey = input?.value.trim();
		const isValid = input?.getAttribute("data-valid") === "true";

		if (apiKey && !isValid) {
			allValid = false;

			const status = document.getElementById(`${source}-verify-status`);
			if (status) {
				status.textContent = "Please verify this key before continuing.";
				status.classList.add("error");
			}
		}
	}

	if (!allValid) {
		e.preventDefault(); // Block form submission
		alert("Please verify all entered API keys before continuing.");
	}
});

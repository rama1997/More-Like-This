// Set behavior of the installation buttons
document.addEventListener("DOMContentLoaded", () => {
	const forCopyInput = document.getElementById("forCopy");
	const installBtn = document.getElementById("installBtn");
	const copyManifestBtn = document.getElementById("copyManifestBtn");

	installBtn.addEventListener("click", function () {
		forCopyInput.value = "false";
	});

	copyManifestBtn.addEventListener("click", function () {
		forCopyInput.value = "true";
	});
});

// Make sure all inputed API Keys are validated first before submiting form
document.querySelector("form").addEventListener("submit", function (e) {
	const sources = ["tmdb", "trakt", "gemini", "tastedive", "watchmode", "rpdb"];
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

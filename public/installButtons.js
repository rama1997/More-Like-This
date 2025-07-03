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

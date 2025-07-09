async function verifyApiKey(source) {
	const input = document.getElementById(`${source}ApiKey`);
	const button = document.querySelector(`#${source}ApiKey ~ .verify-btn`);
	const status = document.getElementById(`${source}-verify-status`);

	const apiKey = input.value.trim();

	// Reset states
	status.textContent = "";
	button.classList.remove("success", "error");
	status.classList.remove("success", "error");

	// Basic validation
	if (!apiKey) {
		status.textContent = "Please enter a key.";
		return;
	}

	// Indicate verifying
	button.classList.add("verifying");
	button.disabled = true;
	button.textContent = "Verifying...";

	try {
		const res = await fetch("/verifyKey", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ source, key: apiKey }),
		});

		const data = await res.json();

		if (data.valid) {
			button.classList.add("success");
			status.classList.add("success");
			status.textContent = "Valid key!";
		} else {
			status.classList.add("error");
			status.textContent = data.error || "Invalid key.";
		}
	} catch (err) {
		status.textContent = "Server error during validation.";
	} finally {
		button.disabled = false;
		button.classList.remove("verifying");
		button.textContent = "Verify Key";
	}
}

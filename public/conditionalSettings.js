document.addEventListener("DOMContentLoaded", function () {
	const conditionalSections = document.querySelectorAll("[data-conditional]");

	function updateVisibility(triggerId) {
		const triggerEl = document.getElementById(triggerId);
		const triggerValue = triggerEl.type === "checkbox" ? (triggerEl.checked ? "true" : "false") : triggerEl.value;

		conditionalSections.forEach((section) => {
			if (section.getAttribute("data-conditional") !== triggerId) return;

			const showIfValue = section.getAttribute("data-show-if");

			if (triggerValue === showIfValue) {
				section.classList.remove("hidden");
				// Force reflow to ensure animation plays
				void section.offsetWidth;
				section.classList.add("visible");
			} else {
				section.classList.remove("visible");
				// Wait for animation transition to finish before fully hiding
				setTimeout(() => {
					section.classList.add("hidden");
				}, 300); // match the CSS transition duration
			}
		});
	}

	function setupConditionalLogic() {
		const triggers = new Set();
		conditionalSections.forEach((section) => {
			const triggerId = section.getAttribute("data-conditional");
			triggers.add(triggerId);
		});

		triggers.forEach((triggerId) => {
			const triggerEl = document.getElementById(triggerId);
			if (!triggerEl) return;

			const eventType = triggerEl.tagName === "SELECT" || triggerEl.tagName === "INPUT" ? "change" : "input";
			triggerEl.addEventListener(eventType, () => updateVisibility(triggerId));

			updateVisibility(triggerId); // Initial state on load
		});
	}

	setupConditionalLogic();
});

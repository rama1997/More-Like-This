document.addEventListener("DOMContentLoaded", function () {
	const conditionalSections = document.querySelectorAll("[data-conditional]");

	function updateVisibility() {
		conditionalSections.forEach((section) => {
			const triggerIds = section
				.getAttribute("data-conditional")
				.split(",")
				.map((s) => s.trim());
			const showIfValues = section
				.getAttribute("data-show-if")
				.split(",")
				.map((s) => s.trim());

			let shouldShow = true;

			triggerIds.forEach((triggerId, index) => {
				const triggerEl = document.getElementById(triggerId);
				if (!triggerEl) {
					shouldShow = false;
					return;
				}

				const triggerValue = triggerEl.type === "checkbox" ? (triggerEl.checked ? "true" : "false") : triggerEl.value.trim();

				const showIfValue = showIfValues[index] || ""; // align conditions

				const isNotEmptyCondition = showIfValue === "not-empty";
				const isNegated = showIfValue.startsWith("not-");

				let conditionMet = false;

				if (isNotEmptyCondition) {
					conditionMet = triggerValue !== "";
				} else if (isNegated) {
					const notValue = showIfValue.slice(4);
					conditionMet = triggerValue !== notValue;
				} else {
					conditionMet = triggerValue === showIfValue;
				}

				if (!conditionMet) {
					shouldShow = false; // Any condition not met, hide section
				}
			});

			if (shouldShow) {
				section.classList.remove("hidden");
				void section.offsetWidth;
				section.classList.add("visible");
			} else {
				section.classList.remove("visible");
				setTimeout(() => {
					section.classList.add("hidden");
				}, 300);
			}
		});
	}

	function setupConditionalLogic() {
		const triggers = new Set();
		conditionalSections.forEach((section) => {
			section
				.getAttribute("data-conditional")
				.split(",")
				.map((s) => s.trim())
				.forEach((id) => triggers.add(id));
		});

		triggers.forEach((triggerId) => {
			const triggerEl = document.getElementById(triggerId);
			if (!triggerEl) return;

			const eventType = triggerEl.tagName === "SELECT" || triggerEl.tagName === "INPUT" ? "change" : "input";
			triggerEl.addEventListener(eventType, updateVisibility);
		});

		updateVisibility(); // Initial state
	}

	setupConditionalLogic();
});

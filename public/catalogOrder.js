document.addEventListener("DOMContentLoaded", () => {
	function setupOrderDragAndDrop(containerSelector, inputId) {
		const container = document.querySelector(containerSelector);
		const input = document.getElementById(inputId);

		if (!container || !input) return;

		function updateInput() {
			const items = [...container.querySelectorAll(".catalog-item, .stream-item")];
			const order = items.map((item) => item.dataset.value).join(",");
			input.value = order;
		}

		function findDropTarget(e) {
			const draggableItems = Array.from(container.querySelectorAll(".catalog-item, .stream-item:not(.dragging)"));

			if (draggableItems.length <= 1) return null;

			const lastItem = draggableItems[draggableItems.length - 1];
			const lastItemRect = lastItem.getBoundingClientRect();

			if (e.clientY >= lastItemRect.bottom) return null;

			return draggableItems.find((item) => {
				const rect = item.getBoundingClientRect();
				const verticalMidpoint = rect.top + rect.height / 2;
				return e.clientY < verticalMidpoint;
			});
		}

		function setupDragAndDrop() {
			const items = container.querySelectorAll(".catalog-item, .stream-item");

			items.forEach((item) => {
				item.setAttribute("draggable", "true");

				item.addEventListener("dragstart", (e) => {
					e.dataTransfer.setData("text/plain", item.id);
					item.classList.add("dragging");
				});

				item.addEventListener("dragend", () => {
					item.classList.remove("dragging");
					updateInput();
				});
			});

			container.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
			});

			container.addEventListener("drop", (e) => {
				e.preventDefault();

				const draggedItemId = e.dataTransfer.getData("text/plain");
				const draggedItem = document.getElementById(draggedItemId);
				const dropTarget = findDropTarget(e);

				if (dropTarget) {
					container.insertBefore(draggedItem, dropTarget);
				} else {
					container.appendChild(draggedItem);
				}
			});
		}

		setupDragAndDrop();
		updateInput(); // initialize hidden input once
	}

	setupOrderDragAndDrop(".catalog-order", "catalogOrder");
	setupOrderDragAndDrop(".stream-order", "streamOrder");
});

document.addEventListener("DOMContentLoaded", () => {
	const catalogOrder = document.querySelector(".catalog-order");
	const catalogOrderInput = document.getElementById("catalogOrder");

	function updateCatalogOrderInput() {
		const items = [...catalogOrder.querySelectorAll(".catalog-name")];
		const order = items.map((item) => item.textContent).join(",");
		catalogOrderInput.value = order;
	}

	function findDropTarget(e) {
		// Get all draggable items, excluding the currently dragged item
		const draggableItems = Array.from(catalogOrder.querySelectorAll(".catalog-item:not(.dragging)"));

		// If no items or only one item, return null
		if (draggableItems.length <= 1) return null;

		// Check if mouse is beyond the bottom of the last item
		const lastItem = draggableItems[draggableItems.length - 1];
		const lastItemRect = lastItem.getBoundingClientRect();

		if (e.clientY >= lastItemRect.bottom) {
			return null; // Indicate to append at the end
		}

		// Find the first item who's midpoint is below the mouse position
		const dropTarget = draggableItems.find((item) => {
			const rect = item.getBoundingClientRect();
			const verticalMidpoint = rect.top + rect.height / 2;

			// Check if mouse is above the midpoint of an item
			return e.clientY < verticalMidpoint;
		});

		return dropTarget;
	}

	// Drag and drop setup
	function setupDragAndDrop() {
		const catalogItems = catalogOrder.querySelectorAll(".catalog-item");

		catalogItems.forEach((item) => {
			item.setAttribute("draggable", "true");

			item.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData("text/plain", item.id);
				item.classList.add("dragging");
			});

			item.addEventListener("dragend", () => {
				item.classList.remove("dragging");
				updateCatalogOrderInput();
			});
		});

		catalogOrder.addEventListener("dragover", (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
		});

		catalogOrder.addEventListener("drop", (e) => {
			e.preventDefault();

			const draggedItemId = e.dataTransfer.getData("text/plain");
			const draggedItem = document.getElementById(draggedItemId);

			const dropTarget = findDropTarget(e);

			if (dropTarget) {
				// Insert before the target element
				catalogOrder.insertBefore(draggedItem, dropTarget);
			} else {
				// If no specific drop target, append to the end
				catalogOrder.appendChild(draggedItem);
			}
		});
	}

	// Initialize drag and drop
	setupDragAndDrop();
});

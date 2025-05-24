async function parseSearchKey(searchKey) {
	// Check if searchKey contains a year flag in the format 'y:YYYY'
	const yearMatch = searchKey.match(/y:(\d{4})/i);
	let searchYear = null;

	if (yearMatch && yearMatch[1]) {
		searchYear = yearMatch[1];
		// Remove the 'y:YYYY' part from searchKey
		searchKey = searchKey.replace(/y:\d{4}/, "").trim();
	}

	// Check for media type flag (t:movie or t:series)
	const typeMatch = searchKey.match(/t:(movie|series)/i);
	let searchType = null;

	if (typeMatch && typeMatch[1]) {
		searchType = typeMatch[1].toLowerCase(); // Normalize to lowercase
		// Remove the 't:movie' or 't:series' part from searchKey
		searchKey = searchKey.replace(/t:(movie|series)/i, "").trim();
	}

	// Return all extracted values
	return { searchKey, searchYear, searchType };
}

module.exports = {
	parseSearchKey,
};

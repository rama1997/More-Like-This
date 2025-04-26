async function withTimeout(promise, ms, errorMessage = "Request timed out") {
	return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))]);
}

module.exports = { withTimeout };

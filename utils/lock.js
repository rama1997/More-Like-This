// Lock map to prevent race conditions
const locks = new Map();

async function withLock(key, fn) {
	if (!key) return;

	// If there's already a pending lock, just return its promise
	if (locks.has(key)) {
		return locks.get(key);
	}

	// Create a new lock that wraps fn()
	const lockPromise = (async () => {
		try {
			return await fn(); // Run the fn
		} finally {
			locks.delete(key); // release lock
		}
	})();

	// Store the promise in the map
	locks.set(key, lockPromise);

	return lockPromise;
}

module.exports = {
	withLock,
};

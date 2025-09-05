// per-request timeouts
async function withTimeout(promise, ms, errorMessage = "Request timed out") {
	return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))]);
}

async function collectUntilTimeout(tasks, timeoutMs) {
	const results = [];

	const wrappedTasks = tasks.map((task, i) =>
		task
			.then((res) => {
				results[i] = res;
			})
			.catch(() => {
				results[i] = null;
			}),
	);

	// run all tasks in parallel
	const all = Promise.allSettled(wrappedTasks);

	// wait for either everything to finish OR timeout
	await Promise.race([all, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);

	// return only completed results
	return results.filter((r) => r != null);
}

async function collectInChunksUntilTimeout(tasks, chunkSize, timeoutMs) {
	const results = [];
	let index = 0;
	const start = Date.now();

	while (index < tasks.length && Date.now() - start < timeoutMs) {
		// slice out the next chunk
		const chunk = tasks.slice(index, index + chunkSize);

		// run this chunk in parallel
		const settled = await Promise.allSettled(chunk);

		// store results
		settled.forEach((res, i) => {
			const realIndex = index + i;
			results[realIndex] = res.status === "fulfilled" ? res.value : null;
		});

		index += chunkSize;
	}

	// return only finished results
	return results.filter((r) => r != null);
}

module.exports = {
	withTimeout,
	collectUntilTimeout,
	collectInChunksUntilTimeout,
};

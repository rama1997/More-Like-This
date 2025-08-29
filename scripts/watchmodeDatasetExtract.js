const fs = require("fs");
const csv = require("csv-parser");

const output = fs.createWriteStream("watchmode_title_id_map.json");
output.write("[");

let isFirst = true;

fs.createReadStream("watchmode_title_id_map.csv")
	.pipe(csv())
	.on("data", (row) => {
		const trimmed = {
			watchmodeID: row["Watchmode ID"],
			imdbID: row["IMDB ID"],
			tmdbID: row["TMDB ID"],
			type: row["TMDB Type"],
		};

		if (!isFirst) output.write(",");
		output.write(JSON.stringify(trimmed));
		isFirst = false;
	})
	.on("end", () => {
		output.write("]");
		output.end();
	});

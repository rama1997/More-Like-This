const rawIdList = require("../data/watchmode_title_id_map.json");

const idMapByWatchmode = {};
const idMapByImdb = {};
const idMapByTmdbMovie = {};
const idMapByTmdbSeries = {};

for (const row of rawIdList) {
	idMapByWatchmode[row.watchmodeID] = { imdbId: row.imdbID, tmdbId: row.tmdbID, type: row.type };
	idMapByImdb[row.imdbID] = { watchmodeId: row.watchmodeID, tmdbId: row.tmdbID, type: row.type };

	if (row.type === "movie") {
		idMapByTmdbMovie[row.tmdbID] = { watchmodeId: row.watchmodeID, imdbId: row.imdbID, type: row.type };
	} else if (row.type === "tv") {
		idMapByTmdbSeries[row.tmdbID] = { watchmodeId: row.watchmodeID, imdbId: row.imdbID, type: row.type };
	}
}

module.exports = {
	idMapByWatchmode,
	idMapByImdb,
	idMapByTmdbMovie,
	idMapByTmdbSeries,
};

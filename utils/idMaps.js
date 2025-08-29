const rawIdList = require("../data/watchmode_title_id_map.json");

const idMapByWatchmode = {};
const idMapByImdb = {};
const idMapByTmdb = {};

for (const row of rawIdList) {
	idMapByWatchmode[row.watchmodeID] = { imdbId: row.imdbID, tmdbId: row.tmdbID, type: row.type };
	idMapByImdb[row.imdbID] = { watchmodeId: row.watchmodeID, tmdbId: row.tmdbID, type: row.type };
	idMapByTmdb[row.tmdbID] = { watchmodeId: row.watchmodeID, imdbId: row.imdbID, type: row.type };
}

module.exports = {
	idMapByWatchmode,
	idMapByImdb,
	idMapByTmdb,
};

<p align="center">
  <img src="https://i.imgur.com/DHKJ7dT.png" alt="More Like This Logo" width="150" />
</p>

# More Like This

**More Like This** is a Stremio addon that fetches similar movie and TV show recommendations from multiple sources, all in one place.

<p align="center">
  <img src="https://i.imgur.com/X2B8Yc8.jpeg" alt="example1" width="700" />
</p>

<p align="center">
  <img src="https://i.imgur.com/KBBGfvi.jpeg" alt="example2" width="700" />
</p>

# Features

- Pulls recommendations from four different sources:
  - **TMDB** (Including TMDB Collections)
  - **Trakt**
  - **Simkl**
  - **Gemini AI**
  - **Tastedive**
- Find recommendations by searching for:
  - **IMDb ID**
  - **Kitsu ID**
  - **Movie/TV Show Title**
- Supports **RPDB** posters

# Installation

Install the addon directly from:  
➡️ [https://bbab4a35b833-more-like-this.baby-beamup.club/configure](https://bbab4a35b833-more-like-this.baby-beamup.club/configure)

You’ll need API keys for the sources you wish to use. For example, if you want only TMDB recommendations, you only need a TMDB API key.
Links to obtain free API keys are available on the addon’s configuration page.

# Configuration

- **Combine Into One Catalog**:  
  By default, each recommendation source appears as its own catalog.
  Enable this option to merge all recommendations into a single catalog. Combined catalogs will display the most frequent recommendations first.
  (Note: Combined catalogs may load more slowly.)

- **Catalog Order**:  
  Drag and drop to reorder how catalogs are displayed.

- **Metadata Source**:  
  By default, the addon uses Cinemeta (Stremio’s main addon) for movie and show metadata.
  Enable this setting to use TMDB as the metadata source instead. (Requires a TMDB API key.)
  Tip: TMDB is generally more reliable than Cinemeta.

- **Stream Button Platform**:  
  This addon adds two stream buttons for each movie/show, one for searching recommendations in the Stremio app and one for the Stremio Web App. Choose which button you'd like to display.

- **Include TMDB Collections in Recommendation**:  
  TMDB groups related movies (like sequels and film series) into 'collections.' These movies are not always included in TMDB’s default recommendations.
  Enable this setting to add collection movies to the start of the TMDB recommendation list.
  Tip: This is useful if you want all directly related movies shown, but it may clutter the catalog for films with many sequels or large franchises."

- **Title-Based Searching**:  
  Enable this option to search by movie/show titles on top of IMDb IDs.
  (Note: Title-based searching is less accurate than using exact IDs.)

# Usage

For any movie or TV show, click the stream button provided by the addon. It will automatically search in Stremio using the item's ID.
You can also manually search an ID via Stremio’s search bar yourself.

If title-based search is enabled, you can also search by entering the title. For the best results, use the exact title and include:

- `y:` followed by the release year

- `t:` followed by the type (e.g., movie or series)

Examples:

- `Inception y:2010 t:movie`
- `Breaking Bad y:2008 t:series`

After searching, recommendations will appear in the addon’s catalogs.

# Tips

Here are some tips to get the best results:

- Use TMDB over Cinemeta for more reliable metadata. (Requires a TMDB API key.)
- Use the Stremio Addon Manager to move this addon to the top of the addon list. This ensures the catalog and stream button appear first.
  Note: Stremio recommends keeping Cinemeta at the top, so adjust with caution.
- When manually searching by title, be precise and include both the year and type flags as shown above.

# Known Issues/Limitation

This addon is still a work in progress. While it works well in many scenarios, some limitations exist:

- Not supported on Android or Smart TVs.
- Not supported on Stremio 5
- Kitsu ID searches may be inaccurate, especially for niche or very specific titles.
- New releases, unreleased titles, and obscure international content may yield strange or no results.
- Not compatible with other Stremio addons that generate custom catalogs and IDs. This addon is optimized for IMDb IDs, as used by Cinemeta.
- As of April 2025, TasteDive’s API returns inaccurate results due to API changes. It now returns recommendations that includes another unrelated media titles.

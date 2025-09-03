<p align="center">
  <img src="https://i.imgur.com/DHKJ7dT.png" alt="More Like This Logo" width="150" />
</p>

<h1 align="center">More Like This</h1>

<div align="center">

![Status](https://img.shields.io/badge/status-active-brightgreen?logo=github)
![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/rama1997/More-Like-This?logo=github)
![GitHub Repo stars](https://img.shields.io/github/stars/rama1997/More-Like-This?style=flat&logo=github)
![Docker Pulls](https://img.shields.io/docker/pulls/raymadev/more-like-this-stremio-addon?logo=docker)
![License](https://img.shields.io/github/license/rama1997/More-Like-This)

</div>

**More Like This** is a Stremio addon that fetches similar movie and TV show recommendations from multiple sources, all in one place.

<p align="center">
  <img src="https://i.imgur.com/BW9xWHU.jpeg" alt="example1" width="700" />
</p>

<p align="center">
  <img src="https://i.imgur.com/KBBGfvi.jpeg" alt="example2" width="700" />
</p>

<p align="center">
  <img src="https://i.imgur.com/ELGUm9v.png" alt="example2" width="700" />
</p>

# Features

- Pulls recommendations from several different sources:
  - **TMDB** (Including TMDB Collections)
  - **Trakt**
  - **Simkl**
  - **Watchmode**
  - **Gemini AI**
  - **Tastedive**
- Find recommendations by searching for:
  - **IMDb ID**
  - **Kitsu ID**
  - **TMDB ID**
  - **Trakt ID**
  - **Movie/TV Show Title**
- Supports **RPDB** posters
- Multi Language Support

# Installation

Install the addon directly from:  
➡️ [https://bbab4a35b833-more-like-this.baby-beamup.club/configure](https://bbab4a35b833-more-like-this.baby-beamup.club/configure)

You’ll need API keys for the sources you wish to use. For example, if you want only TMDB recommendations, you only need a TMDB API key.
Links to obtain free API keys are available on the addon’s configuration page.

## Docker

You can use a prebuilt images from Docker Hub:

```bash
docker pull raymadev/more-like-this-stremio-addon
```

Or clone this repo:

```bash
git clone https://github.com/rama1997/More-Like-This.git
```

### Docker CLI

1. Build Docker Image

```bash
docker build -t more-like-this .
```

2. Run Docker Container

```bash
docker run -p 8080:3000 more-like-this
```

Can adjust addon via a `.env` file. See below for environment variables.

```bash
docker run -p 8080:3000 --env-file .env more-like-this
```

3. Access the addon's configure page at `localhost:8080`.

### Docker Compose

1. Run following command

```bash
docker compose up -d
```

2. Can adjust addon via a `.env` file. See below for environment variables.

## Running Locally From Source

1. Clone the project repository and set it as the current directory

```bash
git clone https://github.com/rama1997/More-Like-This.git
```

```bash
cd More-Like-This
```

2. Create your local environment config by copying the environment example file:

```bash
cp .env.example .env
```

3. Open `.env` and set desired variables. See below for environment variables.

4. Install project dependencies

```bash
npm install
```

5. Run project

```bash
npm start
```

6. Access the addon's configure page at `localhost:PORT`.

## Environment Variables

| Variable          | Description                                 | Default           |
| ----------------- | ------------------------------------------- | ----------------- |
| ENABLE_LOGGING    | Enable logging for dev                      | `false`           |
| PORT              | Desired port that addon listens on          | `8080`            |
| CACHE_TTL         | Cache TTL (seconds)                         | `259200` (3 Days) |
| CACHE_MAX_SIZE    | Max size of cache                           | `3000`            |
| GEMINI_MAX_RESULT | Max number of Gemini AI returns per catalog | `20`              |
| REDIS_URL         | Redis URL                                   |
| REDIS_HOST        | Redis host                                  |
| REDIS_PORT        | Redis port                                  |
| REDIS_DB          | Redis database index                        |

# Configuration

- **Include TMDB Collections in Recommendation**:  
  TMDB groups related movies (like sequels and film series) into 'collections.' These movies are not always included in TMDB’s default recommendations.
  Enable this setting to add collection movies to the start of the TMDB recommendation list.
  Tip: This is useful if you want all directly related movies shown, but it may clutter the catalog for films with many sequels or large franchises."

- **Combine Into One Catalog**:  
  By default, each recommendation source appears as its own catalog.
  Enable this option to merge all recommendations into a single catalog. Combined catalogs will display the most frequent recommendations first.
  (Note: Combined catalogs may load more slowly.)

- **Catalog Order**:  
  Drag and drop to reorder how catalogs are displayed.

- **Enable Manual Title Searching**:  
  Enable this option to search by movie/show titles on top of IMDb IDs.
  (Note: Title-based searching is less accurate than using exact IDs.)

- **Metadata Source**:  
  By default, the addon uses Cinemeta (Stremio’s main addon) for movie and show metadata.
  Enable this setting to use TMDB as the metadata source instead. (Requires a TMDB API key.)
  Tip: TMDB is generally more reliable than Cinemeta.

- **Language**:  
  Select the language used for posters, metadata, and search queries. Only available when using TMDB as the metadata source.

- **Keep English Poster**:  
  Preserve the original English poster artwork even when metadata is set to a non-English language.

- **Stream Button**:  
  Drag and drop to reorder stream buttons, or disable specific ones from appearing.

  Available buttons:

  - Go to Detail Page – Opens the item’s detail page in Stremio.
  - Search on App – Search for recommendations inside the Stremio app.
  - Search on Web – Search for recommendations inside the Stremio web.
  - Show recommendations – Generates and displays recommendations as streams in Stremio

# Usage

For any movie or TV show, use the stream buttons provided by the addon to quickly access recommendations.

## Getting Recs From Search Bar

Click the **Search in App** or **Search in Web** stream button to automatically search Stremio using the item’s ID.
You can also enter an ID manually in Stremio’s search bar.

If title-based search is enabled, you can also search by entering the title. For the best results, use the exact title and include:

- `y:` followed by the release year

- `t:` followed by the type (e.g., movie or series)

Examples:

- `Inception y:2010 t:movie`
- `Breaking Bad y:2008 t:series`

You can also search using non IMDB ids from various sources.

Examples:

- `tmdb:1726`
- `kitsu:12`

## Getting Recs as Streams

Click the **Show Recommendations** stream button to display recommendations directly as streams on the current page in Stremio.
A combined catalog of all enabled sources will be shown.

Limitations:

- Stremio’s UI always reflects the original movie/series info and does not update per recommendation. As a workaround, recommendation details are added to the Summary section.
- For TV series, you cannot directly select episodes from the recommendation list. Instead, the addon provides an optional stream button that takes you to the series’ detail page.
- This method will generally be much slower because metadata must be generated for every recommendation. Performance decreases as more sources are enabled.

## Tips

Here are some tips to get the best results:

- Use the Stremio Addon Manager to move this addon to the top of the addon list. This ensures the catalog and stream button appear first.
  Note: Stremio recommends keeping Cinemeta at the top, so adjust with caution.
- When manually searching by title, be precise and include both the year and type flags as shown above.

## Known Issues/Limitation

This addon is still a work in progress. While it works well in many scenarios, some limitations exist:

- Stream button not supported on Smart TVs or Stremio 5 Beta. Manually searching should still yield recommendations catalogs.
- TMDB metadata may not show up properly with the current stable Android app, but does work with the new beta version on Android
- New releases, unreleased titles, and obscure international content may yield strange or no results.
- Works best with default Stremio catalogs. Not compatible with other Stremio addons that generate custom catalogs and IDs.

# Security

- User Data Encryption: AES-256 GCM encryption + PBKDF2
- API Keys: API keys are never stored

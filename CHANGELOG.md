# Changelog

## [0.11.3](https://github.com/rama1997/More-Like-This/compare/v0.11.2...v0.11.3) (2025-12-07)


### Bug Fixes

* correct manifest url for copy ([2c2d436](https://github.com/rama1997/More-Like-This/commit/2c2d43685f51aa56563c090ee0e55a9ba23a49d4))

## [0.11.2](https://github.com/rama1997/More-Like-This/compare/v0.11.1...v0.11.2) (2025-11-29)


### Bug Fixes

* manfiest url box appears even when coping to clipboard fails ([1ab915e](https://github.com/rama1997/More-Like-This/commit/1ab915e977dcfe7971822196251837de8152cd34))

## [0.11.1](https://github.com/rama1997/More-Like-This/compare/v0.11.0...v0.11.1) (2025-11-22)


### Bug Fixes

* bump manifest to v0.11.1 ([a82dc56](https://github.com/rama1997/More-Like-This/commit/a82dc5630eb01b787fca1c229db3fd6a6af6f70e))

## [0.11.0](https://github.com/rama1997/More-Like-This/compare/v0.10.0...v0.11.0) (2025-11-22)


### Features

* add support for user-provided API key after Simkl API changes ([5e0e77a](https://github.com/rama1997/More-Like-This/commit/5e0e77a25b9ddb9fb432c54f6150a5c1ac35931e))
* include TMDB ratings in metadata ([972fca1](https://github.com/rama1997/More-Like-This/commit/972fca123ed42222149d7a280ccee7853f616ca3))


### Bug Fixes

* add apiKey check to guard clause ([113b065](https://github.com/rama1997/More-Like-This/commit/113b06584832fa184a3e9c757f22a6ff1b4b7407))
* set recs shown from stream button to 20 ([d650b95](https://github.com/rama1997/More-Like-This/commit/d650b951c096d5c1664e752c64f2078c337ef1dc))
* validate API keys when using Copy Manifest button ([2d5a1c5](https://github.com/rama1997/More-Like-This/commit/2d5a1c5b1eac0d89c6bb47412ab0a3b18c9bfa04))

## [0.10.0](https://github.com/rama1997/More-Like-This/compare/v0.9.0...v0.10.0) (2025-10-22)


### Features

* add base metadata to meta previews for future use ([1b900dc](https://github.com/rama1997/More-Like-This/commit/1b900dc9c26bc50c91e62fec250c298957e80f6a))

## [0.9.0](https://github.com/rama1997/More-Like-This/compare/v0.8.5...v0.9.0) (2025-10-17)


### Features

* display manifest URL below copy button for manual copying ([294a7c4](https://github.com/rama1997/More-Like-This/commit/294a7c45fa1db446c4f1dac3da16187590c2a9b3))

## [0.8.5](https://github.com/rama1997/More-Like-This/compare/v0.8.4...v0.8.5) (2025-10-09)


### Bug Fixes

* correct yml name for docker release workflow ([2fc99f8](https://github.com/rama1997/More-Like-This/commit/2fc99f88306926aa16c1118ab20ebefc607bfb52))

## [0.8.4](https://github.com/rama1997/More-Like-This/compare/v0.8.3...v0.8.4) (2025-10-09)


### Bug Fixes

* change release-please version to v3 ([2da9af8](https://github.com/rama1997/More-Like-This/commit/2da9af842181a2324edc1eed117e1d3e14f79718))
* release workflow triggers now uses gh cli ([63887f5](https://github.com/rama1997/More-Like-This/commit/63887f51f4362681af460d994945cef6f2ad4307))

## [0.8.3](https://github.com/rama1997/More-Like-This/compare/v0.8.2...v0.8.3) (2025-10-09)


### Bug Fixes

* fix workflow trigger ([a0dccd7](https://github.com/rama1997/More-Like-This/commit/a0dccd7f896962b2f40ea209c951c9a1bccbc5d8))

## [0.8.2](https://github.com/rama1997/More-Like-This/compare/v0.8.1...v0.8.2) (2025-10-09)


### Bug Fixes

* auto-run Docker workflow after release-please ([93e97d1](https://github.com/rama1997/More-Like-This/commit/93e97d1ea5b4caf63495c1c962684c6a0d345e53))
* update peter-evans/repository-dispatch@v4 ([f70c3f8](https://github.com/rama1997/More-Like-This/commit/f70c3f84e5b1b91afecbee6aa5f2f1bdef639e19))

## [0.8.1](https://github.com/rama1997/More-Like-This/compare/v0.8.0...v0.8.1) (2025-10-09)


### Bug Fixes

* trigger Docker release on tag push ([f00bc85](https://github.com/rama1997/More-Like-This/commit/f00bc858f4fc342d65ab6f5d9bde156ff4678561))

## [0.8.0](https://github.com/rama1997/More-Like-This/compare/v0.7.7...v0.8.0) (2025-10-06)


### Features

* add release-please files ([8936bec](https://github.com/rama1997/More-Like-This/commit/8936bec1aee502a95cc8804acd4eb6c38c42a496))
* improve logic for titleToImdb based on metadata source ([12c7b22](https://github.com/rama1997/More-Like-This/commit/12c7b2297b0bee5747f2e35d79ec60a3196899c7))
* include the poster as background for meta previews ([74ba739](https://github.com/rama1997/More-Like-This/commit/74ba73980982192ce11a4e6174bd046bdfd75322))
* use gemini model `gemini-2.5-flash-lite` ([ca79750](https://github.com/rama1997/More-Like-This/commit/ca797505e7a1711bb84e56b6aa110c4c59b67e54))


### Bug Fixes

* correct initial version in release-please ([247862c](https://github.com/rama1997/More-Like-This/commit/247862c3c3d67b6a163ae83ec7dcf6d1b9451e13))
* properly uses tmdb as a source for title to imdb Id conversion ([6d00c6e](https://github.com/rama1997/More-Like-This/commit/6d00c6e4479335d4af543e66edbae63aa820f6d1))
* remove action from release-please permission ([99924dd](https://github.com/rama1997/More-Like-This/commit/99924ddd6d3df87b5b84ce2e9b050fa94e497f7a))
* update permission for release-please ([00a33dc](https://github.com/rama1997/More-Like-This/commit/00a33dcf6a64782ae703834b61233bb22ba8d8b6))

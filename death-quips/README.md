# Death Quips

A [Geode](https://geode-sdk.org) mod for Geometry Dash 2.2081. Every time you die, a short remark
pops up at the top of the screen, picked to match how far you got. See [about.md](about.md) for the
full feature list and settings.

## Install

1. Install [Geode](https://geode-sdk.org/install) for Geometry Dash 2.2081.
2. Download `vbntyu46.death-quips.geode` from the **Build Output** artifact of the latest
   [Build Death Quips](https://github.com/vbntyu46/first_repo/actions/workflows/death-quips.yml) run.
3. Put the file in Geode's mods folder and restart the game:
   - Windows: `geode/mods` inside the Geometry Dash folder
   - Android: `Android/media/com.geode.launcher/game/geode/mods`

## Build

Set up the [Geode SDK and CLI](https://docs.geode-sdk.org/getting-started/), then run this in this folder:

```sh
geode build
```

## Layout

- `mod.json` — mod metadata and settings.
- `src/main.cpp` — the `PlayLayer` hooks and the on-screen label.
- `src/Quips.cpp` — the built-in lines and the logic that picks one.

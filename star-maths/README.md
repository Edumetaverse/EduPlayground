# Star Maths

A maths game in the style of Star Fox. Answer gates fly through space towards your ship. Fly through the right one. Wrong answers cost fuel, right answers give a little back.

## Playing

### Online (GitHub Pages)

Once GitHub Pages is switched on for the repo, the game is at https://edumetaverse.github.io/EduPlayground/

### On your own computer

Serve the folder with any static web server and open it in a browser:

```
cd star-maths
python3 -m http.server 8000
```

Then visit http://localhost:8000. Use a web server rather than double clicking `index.html`, because browsers restrict some features for pages opened straight from disk.

It needs a browser with WebGL 2 (current Chrome, Edge, Firefox or Safari).

### Controls

| Action | Keyboard | Mouse or touch |
| --- | --- | --- |
| Fly | Arrow keys or WASD | Move the mouse (or drag) |
| Barrel roll | Space | Click or tap |
| Pause | P or Esc | Pause button |
| Sound | M | Speaker button |
| Full screen | F | Full screen button |

Rolling through the right gate earns bonus points.

On the home screen use left and right to pick a subject, up and down to pick a level, and Enter to start.

### Subjects

Addition, subtraction, multiplication, division, mixed operations (including order of operations) and missing numbers. Each subject has its own stage: Azure Sector, Frost Sector, Asteroid Belt, Crimson Canyon, Neon Nebula and Sunset Ridge.

### Levels

| Level | Speed | Wrong answer | Right answer |
| --- | --- | --- | --- |
| 1 Cadet | slowest | lose 15 fuel | gain 6 |
| 2 Pilot | | lose 18 | gain 5 |
| 3 Ace | | lose 22 | gain 5 |
| 4 Captain | | lose 25 | gain 4 |
| 5 Legend | fastest | lose 28 | gain 4 |

Numbers get bigger and the questions trickier as the level goes up. A mission is 20 gates. Fly through none of the gates and it counts as a wrong answer. Run out of fuel and the mission ends. The gates also speed up a little as the mission goes on.

### Wingmen

Three wingmen (Spark, Nova and Orbit) fly in beside you to give advice, then boost away. After a wrong answer they talk you through a way to work it out. They also cheer on streaks and warn you when fuel is low.

## Graphics quality

The game starts at full quality and steps down by itself if the frame rate drops. You can also choose a level with a URL parameter:

* `?q=2` full quality (default): bloom, shadows, anti aliasing and colour grading
* `?q=1` medium: no shadows, no anti aliasing, reduced resolution
* `?q=0` low: no post processing

## Code layout

| File | Purpose |
| --- | --- |
| `js/questions.js` | Question generation, answer choices and the maths hints. No DOM. |
| `js/scene.js` | All 3D rendering, built on the PlayCanvas engine. Reads a plain view object each frame. |
| `js/game.js` | Game rules, controls, heads up display and the wingman calls. |
| `js/audio.js` | Synthesised sound effects and music (WebAudio, no files). |
| `css/` | Styles, plus the embedded pixel font. |
| `lib/playcanvas.min.js` | The PlayCanvas engine, built from https://github.com/Edumetaverse/playcanvasengine |

## Rebuilding the engine

```
git clone https://github.com/Edumetaverse/playcanvasengine
cd playcanvasengine
npm ci --ignore-scripts
npm run build:min:umd
cp build/playcanvas.min.js ../EduPlayground/star-maths/lib/
```

## Credits

* PlayCanvas engine, MIT licence, Copyright PlayCanvas Ltd.
* Press Start 2P font by CodeMan38, SIL Open Font License 1.1.

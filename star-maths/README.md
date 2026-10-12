# Star Maths

A maths game in the style of Star Fox. Answer gates fly towards your spaceship. Fly through the right one. Wrong answers cost fuel, right answers give a little back. Answer all 20 questions, then dock with the mothership to win.

## Playing

### Online (GitHub Pages)

Once GitHub Pages is switched on for the repo, the game is at https://edumetaverse.github.io/EduPlayground/

### On your own computer

Serve the folder with any static web server and open it in a browser:

```
cd star-maths
python3 -m http.server 8000
```

Then visit http://localhost:8000. A web server is the most reliable way to run it.

It needs a browser with WebGL 2 (current Chrome, Edge, Firefox or Safari).

### Controls

| Action | Keyboard | Mouse or touch |
| --- | --- | --- |
| Fly | Arrow keys or WASD | Move the mouse (or drag) |
| Fire a missile | Space | Left click or tap |
| Roll left | Z | Right click on the left half of the screen |
| Roll right | C | Right click on the right half of the screen |
| Pause | P or Esc | Pause button |
| Sound | M | Speaker button |
| Full screen | F | Full screen button |

Fire a missile and it homes in on whatever is closest to your line of fire. Aim at an answer gate and the missile answers for you. A right answer by missile is worth 60% of the points of flying through it, and a wrong one costs just the same fuel. If a meteor is coming at you, the missile goes for that first and blasts it for 25 points. Rolling also slides you sideways, which is handy for dodging.

On the home screen use left and right to pick a subject, up and down to pick a level, and Enter to start.

### Subjects

Addition, subtraction, multiplication, division, mixed operations (including order of operations) and missing numbers. Each subject has its own stage with its own terrain: Azure Sector (hills, rivers and glass towers), Frost Sector (snowfields, frozen lakes and ice crystals), Asteroid Belt (cratered rocks in deep space), Crimson Canyon (lava rivers, basalt and obsidian spires), Neon Nebula (a glowing grid world) and Sunset Ridge (dunes, mesas and amethyst crystals).

### Levels

| Level | Starting speed | Right answer |
| --- | --- | --- |
| 1 Cadet | slowest | gain 6 fuel |
| 2 Pilot | | gain 5 |
| 3 Ace | | gain 5 |
| 4 Captain | | gain 4 |
| 5 Legend | fastest | gain 4 |

Numbers get bigger and the questions trickier as the level goes up. Every wrong or missed answer drains a third of the tank at any level. Every right answer speeds the ship up by 6% of its starting speed, up to nearly double, so the last gates come much quicker than the first.

### A mission

1. Answer 20 questions. Each question is three gates. Fly through the right one. Flying through none of them counts as a wrong answer.
2. Watch out for hazards. From the fourth question on, a meteorite may streak across your path, or on ground stages a tower may topple across the lanes. Steer around them. A hit costs 15 fuel but does not count as a wrong answer.
3. Run out of fuel and the mission ends.
4. Answer all 20 and the docking sequence begins. Your wingmen escort you to the mothership, the bay doors open and you fly in. Dock safely to win and collect a 500 point bonus.

### Wingmen

Three wingmen (Spark, Nova and Orbit, each with their own spaceship) fly in beside you to give advice, then boost away. After a wrong answer they talk you through a way to work it out. They also cheer on streaks and warn you when fuel is low.

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

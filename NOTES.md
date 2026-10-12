# Notes

## Star Maths: 3D approach

Let https://github.com/Edumetaverse/playcanvasengine do the heavy 3D lifting.

Star Maths keeps the Star Fox style game format (a rail shooter where three answer gates fly towards the ship and the pilot flies through the right one), but the graphics are modern rather than retro: physically based metallic craft, bloom, shadows, fog and a painted sky. All of that comes from the PlayCanvas engine fork. This repo only holds the game.

### PlayCanvas engine handles
- Scene, camera and lighting
- Polished metallic materials (chrome, clear coat paint) lit by an environment generated from the sky
- The player's spaceship and the wingmen's ships, built in code from smooth lofted hulls, swept wings and plasma engines
- Meshes for the terrain, gates, scenery, hazards and the docking hangar
- Fog, shadows, bloom, tone mapping, vignette and anti aliasing (CameraFrame)
- Rendering to the canvas

### This repo handles
- Question generation for each subject and level, with 3 answer choices
- Fuel rules: wrong answer costs fuel, correct answer adds a little back
- Arcade home screen for picking subject and level
- Keyboard and mouse controls, mapped to the ship position
- HUD, scoring, high scores and the results screen
- Wingmen who fly in beside the player, give advice, then boost away
- Sound and music

### Gameplay summary
- 20 questions per mission, three gates each. The ship speeds up 6% after every right answer; a wrong or missed answer costs a third of the fuel tank.
- Hazards (meteorites, and falling towers on ground stages) appear from the fourth question. A hit costs fuel but is not a wrong answer.
- After question 20 a docking sequence flies the ship into a mothership hangar, escorted by the three wingmen, then the win screen shows.

### Assets
There are no model files. Every ship, building, rock and hangar is built in code with the engine's geometry tools, so the whole game is about 3 MB.

### Structure
The game logic is kept separate from rendering. `star-maths/js/scene.js` is the only file that talks to PlayCanvas. It reads a plain view object (ship position, gate positions, speed) each frame.

### Engine build
`star-maths/lib/playcanvas.min.js` is built from the fork (v2.24.0 beta). See `star-maths/README.md` for how to rebuild it.

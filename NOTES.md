# Notes

## Star Maths: 3D approach

Let https://github.com/Edumetaverse/playcanvasengine do the heavy 3D lifting.

Star Maths keeps the Star Fox style game format (a rail shooter where three answer gates fly towards the ship and the pilot flies through the right one), but the graphics are modern rather than retro: physically based metallic craft, bloom, shadows, fog and a painted sky. All of that comes from the PlayCanvas engine fork. This repo only holds the game.

### PlayCanvas engine handles
- Scene, camera and lighting
- Polished metallic materials (chrome, clear coat paint) lit by an environment generated from the sky
- Meshes for the ships, gates and scenery
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

### Structure
The game logic is kept separate from rendering. `star-maths/js/scene.js` is the only file that talks to PlayCanvas. It reads a plain view object (ship position, gate positions, speed) each frame.

### Engine build
`star-maths/lib/playcanvas.min.js` is built from the fork (v2.24.0 beta). See `star-maths/README.md` for how to rebuild it.

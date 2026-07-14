# Small-enemy sprite sheets

The eight small enemies use one horizontal sheet each:

- Canvas: 125 x 20 pixels
- Frames: six 20 x 20 frames
- Guides: five opaque black 1px columns
- Frame starts: x = 0, 21, 42, 63, 84, 105

Frame order:

| Index | Purpose |
| --- | --- |
| 0-1 | Idle |
| 1-2-3-2 | Walk loop |
| 4 | Cast / hurt |
| 5 | Downed |

Paint only inside each 20 x 20 frame. Keep the black guide columns at x = 20, 41, 62, 83, and 104. Run `npm run assets:enemy-guides` to add missing guides or repaint those guide columns without changing any frame pixels.

Boss sheets remain 34 x 34 frames without guide columns for now.

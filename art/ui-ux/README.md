# UI icons and reactive room props

These 21 illustrations were generated individually with the built-in image generation tool. The original bedroom illustration established the warm lamp/cool window lighting, worn materials and ink/gouache direction. No generated image contains names, prices or specifications; those remain accessible HTML text.

`prompts.json` records the exact prompt for each image. `originals/` retains all 21 original transparent PNG files. Runtime artwork is encoded as alpha WebP in `src/assets/icons/` and `src/assets/props/`.

The 15 icons have a maximum dimension of 320px and total 319,112 bytes. The six props have a maximum dimension of 384px and total 164,656 bytes. Encoding resizes the original images proportionally without cropping or redrawing them. Portrait and landscape artwork keeps its original aspect ratio.

Icons were inspected at both 96px and the intended 48px minimum display size. Props were inspected at 160px and 64px on the game's cream background. Each final image has a transparent background, with no labels or external dependencies.

Cooling and SlopClaw placement, visibility, shadows and loading fallback are controlled by the room manifest and renderer. The icon manifest uses existing model and GPU content IDs. Artwork does not change game balance or saves.

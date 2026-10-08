# Reactive bedroom artwork

The PNG files in `originals/` are the unmodified generated artwork. `prompts.json` records the prompts and reference images used. The source WebP derivatives live in `src/assets/reactive/`.

Stages 3–5 remove the baked-in portable cooling equipment so purchased cooling layers are cumulative without duplicating the illustration. The six window variants keep each stage's camera and lighting. The renderer clips each variant to its window area; it never replaces the entire room when the window upgrade is purchased.

Layer anchors, perspective bounds, occlusion order and accessible descriptions are defined in `src/room-art.ts`. The generated transparent props and model/hardware badges are documented in `art/ui-ux/`. Purchase transitions live in `src/room.ts`; imported saves and prestige apply the correct equipment immediately.

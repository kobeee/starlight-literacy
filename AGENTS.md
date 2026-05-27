# Starlight Literacy Agent Guide

Use Chinese when reporting to the user.

## Recognition Video Production

For HyperFrames recognition videos, do not start by editing a single
composition. Use the agent workflow in `tools/recognition-video/` first.

Required reading:

- `tools/recognition-video/AGENTS.md`
- `tools/recognition-video/README.md`
- `knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md`
- `knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md`

HyperFrames is the final assembly/render layer. Upstream work must produce
briefs, asset plans, sprite manifests, validated transparent frames, and audio
plans before official rendering or H5 wiring.

Every official recognition video must end with a silent stroke-order demo
inside a single mizige (识字态→写字态 via CSS variables). The brief must
declare `teachingContract.strokeOrderTail`; the spoken body and the silent
tail together stay within 12s. See `tools/recognition-video/AGENTS.md` for the
full Stroke-Order Tail Contract, H5 Wiring Contract, and HyperFrames Runtime
Notes (including the 7.4s `MiniTimeline` shim trap).

Useful commands:

```bash
npm run video:create-example-sprite
npm run video:check-sprite-example
node tools/recognition-video/scripts/validate-sprite-assets.mjs <manifest.json>
```

Do not mark a recognition video official until HyperFrames validation, media
metadata checks, baked audio checks, and H5 guardrails pass.

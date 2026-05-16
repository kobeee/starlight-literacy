# Recognition Video Audio Sync Plan Prompt

Use this before HyperFrames assembly for every new Starlight recognition video.

## Inputs

- Target character, pinyin, unit id.
- Teaching brief path.
- Asset plan path.
- Narration script.
- Product surface: P03 recognition page unless explicitly changed.
- Reference duration evidence, preferably Hongen-style single-character cards.

## Required Decisions

1. Pick a child-facing voice and rate.
   - Default direction: warm Mandarin teacher voice.
   - Edge TTS range: keep `rate` between `-15%` and `0%`; use around `-10%`
     for multi-cue clips unless the script is unusually short.
2. Generate or mark a scratch narration.
   - Prefer subtitle/VTT timing from the TTS provider.
   - If no subtitle file exists, manually mark cue times and record that in
     `syncRules`.
3. Set total duration.
   - P03 short clips normally stay in 3-8 seconds.
   - Multi-cue clips should usually be 6-8 seconds.
   - Compare against Hongen-style reference clips, then explain why the P03
     version is shorter or longer.
4. Map audio cues to visuals.
   - `visualStart` must not begin late relative to `audioStart`.
   - `visualEnd` must cover the spoken cue.
   - The final cue must hold through the end of the clip.
5. Reserve quiet final review time.
   - Leave at least 0.45 seconds after the last spoken cue.
   - Prefer around 0.65-1.0 seconds for new or visually dense characters.

## Output

Write `tools/recognition-video/audio-plans/<char-id>.audio-plan.json`:

```json
{
  "schemaVersion": "recognition-video-audio-plan/v1",
  "characterId": "<char-id>",
  "script": "<narration script>",
  "voice": {
    "provider": "edge-tts",
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": "-10%",
    "pitch": "+0Hz",
    "rationale": "..."
  },
  "durationBenchmark": {
    "sourceModel": "hongen-character-card/v1",
    "referenceProduct": "洪恩识字汉字卡",
    "referenceDurationSeconds": { "min": 18, "max": 23, "example": 19 },
    "referenceEvidence": "...",
    "starlightTargetSeconds": 7.2,
    "starlightDecision": "..."
  },
  "targetDurationSeconds": 7.2,
  "rawTtsAudioDurationSeconds": 6.55,
  "bakedAudioDurationSeconds": 7.25,
  "quietAfterLastCueSeconds": 0.7,
  "cues": [
    {
      "id": "meaning",
      "shotId": "meaning-action",
      "text": "...",
      "audioStart": 0.1,
      "audioEnd": 1.8,
      "visualStart": 0,
      "visualEnd": 2
    }
  ],
  "syncRules": [
    "Every visual window covers its spoken cue.",
    "The final cue holds through the end of the clip.",
    "The last spoken cue leaves quiet glyph review time."
  ],
  "outputs": {
    "audio": "tools/recognition-video/builds/<char-id>/assets/audio/<char-id>-narration.mp3",
    "rawAudio": "tools/recognition-video/builds/<char-id>/assets/audio/<char-id>-narration-raw.mp3",
    "subtitles": "tools/recognition-video/builds/<char-id>/assets/audio/<char-id>-narration.vtt"
  }
}
```

## Validation

Run:

```bash
node tools/recognition-video/scripts/validate-audio-sync-plan.mjs \
  tools/recognition-video/briefs/<char-id>.brief.json \
  tools/recognition-video/asset-plans/<char-id>.asset-plan.json \
  tools/recognition-video/audio-plans/<char-id>.audio-plan.json
```

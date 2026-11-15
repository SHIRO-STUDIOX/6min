# Synthetic test asset — DEMO_ONLY

synthetic.mp4 is an original 10-second FFmpeg testsrc2 color pattern generated for this repository, without audio, learner footage or third-party course material. Dedicated to CC0-1.0. It demonstrates playback only and is not a six-minute German lesson. Captions describe the silent test pattern.

Reproduce: `ffmpeg -nostdin -f lavfi -i testsrc2=size=320x180:rate=15:duration=10 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart synthetic.mp4`

#!/usr/bin/env python3
"""Generate deterministic original 8-bit art and chiptune WAV assets."""

import math
import random
import struct
import wave
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
random.seed(82417)

COLORS = {
    "ink": "#100d18",
    "void": "#25163a",
    "plum": "#4b2864",
    "bone": "#f2e6c9",
    "star": "#63d9ff",
    "star2": "#c9f6ff",
    "ember": "#ff6b3d",
    "ember2": "#ffc05c",
    "verdant": "#74d36f",
    "verdant2": "#c8ef86",
    "thunder": "#ffd34e",
    "thunder2": "#fff3a3",
    "curse": "#b46cff",
    "shadow": "#09070e",
}


def ensure_dirs():
    for path in (
        "assets/sprites",
        "assets/effects",
        "assets/tiles",
        "assets/ui",
        "assets/audio/music",
        "assets/audio/sfx",
    ):
        (ROOT / path).mkdir(parents=True, exist_ok=True)


def px(draw, x, y, w, h, color):
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=color)


def wizard_frame(draw, ox, key, frame):
    palettes = {
        "star": (COLORS["star"], COLORS["star2"], "#3a75a5"),
        "ember": (COLORS["ember"], COLORS["ember2"], "#8f2d2b"),
        "verdant": (COLORS["verdant"], COLORS["verdant2"], "#285d47"),
        "thunder": (COLORS["thunder"], COLORS["thunder2"], "#82602a"),
    }
    main, light, dark = palettes[key]
    bob = 1 if frame in (1, 3) else 0
    down = frame == 5
    if down:
        px(draw, ox + 3, 14, 11, 3, dark)
        px(draw, ox + 5, 12, 8, 3, main)
        px(draw, ox + 12, 11, 3, 2, light)
        return
    y = 3 + bob
    px(draw, ox + 5, y + 5, 7, 7, main)
    px(draw, ox + 4, y + 10, 9, 6, dark)
    px(draw, ox + 6, y + 9, 5, 5, main)
    px(draw, ox + 6, y + 6, 1, 1, COLORS["ink"])
    px(draw, ox + 10, y + 6, 1, 1, COLORS["ink"])
    px(draw, ox + 3, y + 4, 11, 2, dark)
    px(draw, ox + 6, y, 5, 5, light)
    if key == "star":
        px(draw, ox + 8, y - 2, 1, 2, light)
        px(draw, ox + 6, y + 1, 5, 1, COLORS["star"])
    elif key == "ember":
        px(draw, ox + 10, y - 2, 2, 3, COLORS["ember"])
        px(draw, ox + 6, y + 2, 5, 1, COLORS["ember2"])
    elif key == "verdant":
        px(draw, ox + 4, y, 3, 2, COLORS["verdant2"])
        px(draw, ox + 10, y - 1, 3, 2, COLORS["verdant"])
    else:
        px(draw, ox + 8, y - 2, 2, 3, COLORS["thunder2"])
        px(draw, ox + 5, y + 2, 7, 1, COLORS["thunder"])
    foot_shift = 1 if frame == 2 else -1 if frame == 3 else 0
    px(draw, ox + 5 + foot_shift, y + 16, 3, 2, COLORS["shadow"])
    px(draw, ox + 10 - foot_shift, y + 16, 3, 2, COLORS["shadow"])
    if frame == 4:
        px(draw, ox + 1, y + 7, 3, 3, light)
        px(draw, ox + 14, y + 6, 2, 4, light)


def enemy_frame(draw, ox, key, frame):
    configs = {
        "imp": ("#9b4bd6", "#e0a5ff", 16, 18),
        "wolf": ("#6f4c8f", "#d3a8ed", 18, 16),
        "guard": ("#6c6683", "#c8c1d8", 20, 20),
        "ghost": ("#8051a8", "#e5c9ff", 18, 20),
        "archer": ("#bd5b79", "#ffd3a3", 18, 20),
        "priest": ("#d3a83c", "#fff0a0", 18, 20),
        "mirror": ("#5e8fa6", "#d7f7ff", 20, 20),
        "spore": ("#5eaa67", "#d9ef8f", 18, 18),
    }
    main, light, width, height = configs[key]
    down = frame == 5
    if down:
        px(draw, ox + 3, 14, width - 5, 3, main)
        px(draw, ox + 7, 12, width - 11, 2, light)
        return
    bob = 1 if frame in (1, 3) else 0
    if key == "wolf":
        px(draw, ox + 2, 8 + bob, 14, 7, main)
        px(draw, ox + 12, 5 + bob, 5, 6, light)
        px(draw, ox + 14, 6 + bob, 1, 1, COLORS["ink"])
        px(draw, ox + 3, 14 + bob, 3, 2, COLORS["shadow"])
        px(draw, ox + 12, 14 + bob, 3, 2, COLORS["shadow"])
    elif key == "ghost":
        px(draw, ox + 4, 4 + bob, 10, 11, main)
        px(draw, ox + 6, 2 + bob, 6, 4, light)
        px(draw, ox + 6, 7 + bob, 2, 2, COLORS["ink"])
        px(draw, ox + 11, 7 + bob, 2, 2, COLORS["ink"])
        for i in range(3):
            px(draw, ox + 4 + i * 4, 15 + bob + i % 2, 3, 3, main)
    elif key == "spore":
        px(draw, ox + 4, 5 + bob, 11, 7, main)
        px(draw, ox + 6, 3 + bob, 7, 3, light)
        px(draw, ox + 8, 12 + bob, 3, 5, "#285d47")
        px(draw, ox + 6, 8 + bob, 1, 1, COLORS["ink"])
        px(draw, ox + 12, 8 + bob, 1, 1, COLORS["ink"])
    else:
        body_x = 2 if key in ("guard", "mirror") else 4
        body_w = 16 if key in ("guard", "mirror") else 11
        px(draw, ox + body_x, 6 + bob, body_w, 10, main)
        px(draw, ox + body_x + 2, 4 + bob, body_w - 4, 5, light)
        px(draw, ox + body_x + 3, 8 + bob, 2, 2, COLORS["ink"])
        px(draw, ox + body_x + body_w - 5, 8 + bob, 2, 2, COLORS["ink"])
        if key == "guard":
            px(draw, ox, 6 + bob, 4, 11, light)
        elif key == "archer":
            draw.arc((ox + 11, 3 + bob, ox + 20, 17 + bob), 90, 270, fill=light, width=1)
        elif key == "priest":
            px(draw, ox + 8, 1 + bob, 2, 4, COLORS["thunder2"])
        elif key == "mirror":
            px(draw, ox + 5, 7 + bob, 9, 7, "#a7e4ef")
    if frame == 4:
        px(draw, ox + 1, 2 + bob, 2, 2, COLORS["bone"])
        px(draw, ox + width - 3, 4 + bob, 2, 2, COLORS["bone"])


def boss_frame(draw, ox, key, frame):
    configs = {
        "lich": ("#7a45a8", "#d7b2ff", "#ffcf6a"),
        "thorn": ("#3f7f55", "#a7df75", "#ff8c6a"),
        "mirrorboss": ("#477f95", "#c8f5ff", "#ffd66f"),
    }
    main, light, core = configs[key]
    if frame == 5:
        for i in range(5):
            px(draw, ox + 4 + i * 5, 20 + i % 2, 4, 3, main)
        px(draw, ox + 14, 16, 5, 5, core)
        return
    bob = 1 if frame in (1, 3) else 0
    if key == "thorn":
        px(draw, ox + 7, 8 + bob, 20, 18, main)
        px(draw, ox + 11, 4 + bob, 12, 9, light)
        for x in (5, 26):
            px(draw, ox + x, 5 + bob, 2, 22, main)
        px(draw, ox + 14, 14 + bob, 6, 6, core)
    elif key == "mirrorboss":
        px(draw, ox + 6, 5 + bob, 22, 23, main)
        px(draw, ox + 10, 8 + bob, 14, 15, "#8fd3df")
        px(draw, ox + 14, 12 + bob, 6, 7, core)
        px(draw, ox + 3, 10 + bob, 4, 14, light)
        px(draw, ox + 27, 10 + bob, 4, 14, light)
    else:
        px(draw, ox + 7, 7 + bob, 20, 21, main)
        px(draw, ox + 11, 3 + bob, 12, 8, light)
        px(draw, ox + 14, 13 + bob, 6, 7, core)
        px(draw, ox + 4, 8 + bob, 4, 15, light)
        px(draw, ox + 26, 8 + bob, 4, 15, light)
    if frame == 4:
        px(draw, ox + 1, 3 + bob, 4, 4, COLORS["bone"])
        px(draw, ox + 29, 5 + bob, 3, 5, COLORS["bone"])


def make_sheets():
    for key in ("star", "ember", "verdant", "thunder"):
        image = Image.new("RGBA", (16 * 6, 20), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for frame in range(6):
            wizard_frame(draw, frame * 16, key, frame)
        image.save(ROOT / f"assets/sprites/{key}.png")
    for key in ("imp", "wolf", "guard", "ghost", "archer", "priest", "mirror", "spore"):
        image = Image.new("RGBA", (20 * 6, 20), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for frame in range(6):
            enemy_frame(draw, frame * 20, key, frame)
        image.save(ROOT / f"assets/sprites/{key}.png")
    for key in ("lich", "thorn", "mirrorboss"):
        image = Image.new("RGBA", (34 * 6, 34), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for frame in range(6):
            boss_frame(draw, frame * 34, key, frame)
        image.save(ROOT / f"assets/sprites/{key}.png")


def make_effects():
    effect_palettes = {
        "star-shot": (COLORS["star"], COLORS["star2"]),
        "ember-shot": (COLORS["ember"], COLORS["ember2"]),
        "seed-shot": (COLORS["verdant"], COLORS["verdant2"]),
        "thunder-shot": (COLORS["thunder"], COLORS["thunder2"]),
        "burst": ("#ffef9b", COLORS["bone"]),
        "curse": (COLORS["curse"], "#e5c9ff"),
        "shield": (COLORS["star"], COLORS["bone"]),
        "warning": ("#ff4f70", "#ffc0a8"),
    }
    for name, (main, light) in effect_palettes.items():
        image = Image.new("RGBA", (12 * 6, 12), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for frame in range(6):
            ox = frame * 12
            radius = 1 + frame
            draw.rectangle((ox + 6 - radius, 6 - radius, ox + 6 + radius, 6 + radius), outline=main)
            px(draw, ox + 5, 5, 3, 3, light)
            if frame > 2:
                px(draw, ox + 1, 6, 2, 1, main)
                px(draw, ox + 9, 3, 2, 1, light)
        image.save(ROOT / f"assets/effects/{name}.png")


def make_tiles_and_title():
    tiles = Image.new("RGBA", (64, 16), COLORS["ink"])
    draw = ImageDraw.Draw(tiles)
    tile_colors = [("#1b1528", "#2c2140"), ("#21172e", "#3a2549"), ("#17252b", "#28444a"), ("#2c1d1a", "#493126")]
    for index, (base, line) in enumerate(tile_colors):
        ox = index * 16
        px(draw, ox, 0, 16, 16, base)
        for y in (0, 8, 15):
            px(draw, ox, y, 16, 1, line)
        for x in range(0, 16, 8):
            px(draw, ox + x + (4 if y == 8 else 0), 0, 1, 16, line)
    tiles.save(ROOT / "assets/tiles/library.png")

    title = Image.new("RGB", (320, 180), COLORS["ink"])
    draw = ImageDraw.Draw(title)
    px(draw, 0, 0, 320, 180, COLORS["ink"])
    px(draw, 0, 132, 320, 48, "#17121f")
    for x in range(10, 310, 28):
        px(draw, x, 24, 18, 88, "#21172e")
        px(draw, x + 3, 29, 3, 74, "#4b2864")
        px(draw, x + 9, 31, 2, 70, "#6f3b72")
        px(draw, x + 14, 27, 2, 76, "#342143")
    px(draw, 122, 22, 76, 92, "#09070e")
    px(draw, 130, 30, 60, 76, "#25163a")
    for i in range(26):
        x = 136 + random.randrange(48)
        y = 36 + random.randrange(58)
        color = COLORS["star"] if i % 3 == 0 else COLORS["bone"]
        px(draw, x, y, 1, 1, color)
    points = [(54, 142), (109, 130), (160, 144), (212, 129), (268, 142)]
    draw.line(points, fill=COLORS["star"], width=1)
    draw.line([(54, 144), (109, 132), (160, 146), (212, 131), (268, 144)], fill=COLORS["ember"], width=1)
    for x, key in ((62, "star"), (113, "verdant"), (210, "thunder"), (262, "ember")):
        palette = COLORS[key]
        px(draw, x - 4, 127, 9, 11, palette)
        px(draw, x - 2, 121, 5, 7, COLORS["bone"])
        px(draw, x - 5, 137, 3, 5, COLORS["shadow"])
        px(draw, x + 3, 137, 3, 5, COLORS["shadow"])
    title.save(ROOT / "assets/ui/title-art.png")


def note_frequency(note):
    return 440.0 * (2 ** ((note - 69) / 12))


def osc(kind, phase):
    if kind == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    if kind == "triangle":
        return 2.0 / math.pi * math.asin(math.sin(phase))
    return math.sin(phase)


def write_wav(path, samples, rate=11025):
    peak = max(1.0, max(abs(value) for value in samples))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        for value in samples:
            clipped = max(-1.0, min(1.0, value / peak))
            output.writeframesraw(struct.pack("<h", int(clipped * 28000)))


def make_music(name, chords, lead, tempo=126):
    rate = 11025
    beat = 60 / tempo
    total_beats = 32
    total = int(total_beats * beat * rate)
    samples = [0.0] * total
    for i in range(total):
        t = i / rate
        beat_index = int(t / beat)
        chord = chords[(beat_index // 4) % len(chords)]
        bass = chord - 24
        lead_note = lead[beat_index % len(lead)]
        bass_phase = 2 * math.pi * note_frequency(bass) * t
        lead_phase = 2 * math.pi * note_frequency(lead_note) * t
        arp_note = chord + (0, 4, 7, 11)[int(t / (beat / 4)) % 4]
        arp_phase = 2 * math.pi * note_frequency(arp_note) * t
        pulse = max(0.0, 1.0 - (t % (beat / 2)) / (beat / 2))
        samples[i] = 0.25 * osc("triangle", bass_phase) + 0.16 * osc("square", lead_phase) + 0.12 * osc("square", arp_phase) * pulse
    fade = int(rate * 0.08)
    for i in range(fade):
        samples[i] *= i / fade
        samples[-1 - i] *= i / fade
    write_wav(ROOT / f"assets/audio/music/{name}.wav", samples, rate)


def make_sfx(name, start_freq, end_freq, duration, kind="square", noise=0.0):
    rate = 11025
    count = int(duration * rate)
    samples = []
    phase = 0.0
    for i in range(count):
        progress = i / max(1, count - 1)
        freq = start_freq + (end_freq - start_freq) * progress
        phase += 2 * math.pi * freq / rate
        envelope = (1 - progress) ** 1.7
        value = osc(kind, phase) * envelope
        if noise:
            value += (random.random() * 2 - 1) * noise * envelope
        samples.append(value)
    write_wav(ROOT / f"assets/audio/sfx/{name}.wav", samples, rate)


def make_audio():
    make_music("library", [48, 53, 45, 50], [72, 74, 76, 79, 76, 74, 71, 69], 112)
    make_music("battle", [45, 48, 52, 50], [69, 72, 76, 74, 81, 79, 76, 72], 138)
    specs = {
        "ui-select": (520, 760, 0.08, "square", 0.0),
        "star-cast": (680, 1080, 0.18, "triangle", 0.0),
        "ember-cast": (220, 90, 0.22, "square", 0.18),
        "verdant-cast": (360, 620, 0.24, "triangle", 0.04),
        "thunder-cast": (980, 180, 0.20, "square", 0.2),
        "hit": (180, 70, 0.10, "square", 0.22),
        "hurt": (130, 55, 0.24, "square", 0.12),
        "bond": (440, 1320, 0.48, "triangle", 0.02),
        "shield-break": (780, 120, 0.34, "square", 0.25),
        "revive": (260, 820, 0.62, "triangle", 0.0),
        "boss-warning": (170, 110, 0.55, "square", 0.08),
        "victory": (520, 1040, 0.82, "triangle", 0.0),
    }
    for name, args in specs.items():
        make_sfx(name, *args)


def main():
    ensure_dirs()
    make_sheets()
    make_effects()
    make_tiles_and_title()
    make_audio()
    print("Generated Arcane Bond assets.")


if __name__ == "__main__":
    main()

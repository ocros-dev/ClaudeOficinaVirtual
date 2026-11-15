"""Genera assets/oficina.ico (pixel art 16×16 escalado) sin dependencias externas."""
import struct
import zlib
from pathlib import Path

ART = [
    "................",
    "..oooooooooooo..",
    "..obbbbbbbbbbo..",
    "..obgggbbbbbbo..",
    "..obbbbggggbbo..",
    "..obgggggbbbbo..",
    "..obbbbbbbbbbo..",
    "..oooooooooooo..",
    "......oooo......",
    "....ohhhhhho....",
    "....ohsssso.....",
    "....osesseso....",
    "...occcccccco...",
    ".wwwwwwwwwwwwww.",
    ".dddddddddddddd.",
    "..dd........dd..",
]
PAL = {"o": (27, 20, 38), "b": (20, 28, 52), "g": (95, 208, 104), "h": (59, 42, 32), "s": (241, 199, 163),
       "e": (27, 20, 38), "c": (217, 119, 87), "w": (204, 149, 90), "d": (122, 80, 40)}


def png(size: int) -> bytes:
    scale = size // 16
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            k = ART[y // scale][x // scale]
            row += bytes([*PAL[k], 255]) if k in PAL else b"\0\0\0\0"
        rows.append(bytes(row))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


def main() -> None:
    sizes = [16, 32, 48, 64, 128, 256]
    images = [png(s) for s in sizes]
    out = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    for s, data in zip(sizes, images):
        out += struct.pack("<BBBBHHII", s % 256, s % 256, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    dest = Path(__file__).resolve().parent.parent / "assets" / "oficina.ico"
    dest.parent.mkdir(exist_ok=True)
    dest.write_bytes(out + b"".join(images))
    print("Icono creado en", dest)


if __name__ == "__main__":
    main()

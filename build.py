"""Empaqueta la oficina como un ejecutable de Windows: dist/OficinaVirtual.exe

Uso:  python build.py      (instala PyInstaller si falta)
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    subprocess.check_call([sys.executable, str(ROOT / "tools" / "make_icon.py")])
    subprocess.check_call([
        sys.executable, "-m", "PyInstaller", str(ROOT / "app.py"),
        "--name", "OficinaVirtual", "--onefile", "--windowed", "--noconfirm",
        "--icon", str(ROOT / "assets" / "oficina.ico"),
        "--add-data", f"{ROOT / 'public'};public",
        "--distpath", str(ROOT / "dist"), "--workpath", str(ROOT / "build"), "--specpath", str(ROOT / "build"),
    ])
    print("\nListo:", ROOT / "dist" / "OficinaVirtual.exe")


if __name__ == "__main__":
    main()

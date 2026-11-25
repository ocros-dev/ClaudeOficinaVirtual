#!/usr/bin/env python3
"""Reglas de arquitectura de la arena v1.2 (docs/arena-v12-arquitectura.md, sección 7).

Solo biblioteca estándar. Recorre public/js/arena/**.js y termina con código 1 si alguna regla falla.
Uso: python tools/check_arena.py
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(RAIZ, "public", "js")
ARENA = os.path.join(JS, "arena")

IMPORT_RE = re.compile(
    r"""(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)""")
PURE = {"raster.js", "ramps.js", "outline.js", "rig.js", "poses.js"}
FORBIDDEN_PURE = ["document", "window", "getContext", "Image("]
OLD = {"arena.js", "heroes.js", "bosses.js", "camp.js"}
errores = []


def rel(p):
    return os.path.relpath(p, ARENA).replace("\\", "/")


def sin_comentarios(src):
    """Quita comentarios // y /* */ (aproximado, suficiente para estas reglas)."""
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(^|[^:'\"])//[^\n]*", r"\1", src)


def imports(src):
    out = []
    for m in IMPORT_RE.finditer(src):
        out.append(m.group(1) or m.group(2))
    return out


def resolver(archivo, spec):
    if not spec.startswith("."):
        return None
    p = os.path.normpath(os.path.join(os.path.dirname(archivo), spec))
    return p


def fallo(regla, archivo, msg):
    errores.append(f"[regla {regla}] {rel(archivo)}: {msg}")


def main():
    if not os.path.isdir(ARENA):
        print("No existe public/js/arena")
        return 1
    archivos = []
    for base, _, fs in os.walk(ARENA):
        for f in fs:
            if f.endswith(".js"):
                archivos.append(os.path.join(base, f))
    for a in sorted(archivos):
        r = rel(a)
        nombre = os.path.basename(a)
        with open(a, encoding="utf-8") as fh:
            bruto = fh.read()
        codigo = sin_comentarios(bruto)
        deps = [(s, resolver(a, s)) for s in imports(codigo)]
        deps = [(s, p) for s, p in deps if p]

        # 1. rules.js no importa combat/, render/ ni art/
        if r == "rules.js":
            for s, p in deps:
                q = rel(p)
                if q.startswith(("combat/", "render/", "art/")):
                    fallo(1, a, f"importa {s}")

        # 2. el arte de razas, reyes y enemigos solo importa de kit16
        if r.startswith(("art/races/", "art/kings/", "art/enemies/")) and nombre != "index.js":
            for s, p in deps:
                if not rel(p).startswith("art/kit16/"):
                    fallo(2, a, f"importa {s} (solo se permite ../kit16/*)")

        # 3. kit16 puro: sin navegador
        if r.startswith("art/kit16/") and nombre in PURE:
            for palabra in FORBIDDEN_PURE:
                if palabra in codigo:
                    fallo(3, a, f"usa «{palabra}» (debe ser puro, sin DOM)")

        # 4. el arte es determinista
        if r.startswith("art/") and "Math.random" in codigo:
            fallo(4, a, "usa Math.random (usa ctx.rng)")

        # 5. movimientos y ataques firma: solo funciones de paso
        if r.startswith(("combat/moves/", "combat/kings/")) and nombre not in ("index.js", "generic.js"):
            for s, p in deps:
                if rel(p) not in ("combat/actions.js", "render/vfx.js"):
                    fallo(5, a, f"importa {s} (solo ../actions.js y ../../render/vfx.js)")
            if re.search(r"\.[xyz]\s*=[^=]", codigo):
                fallo(5, a, "asigna .x/.y/.z (usa funciones de paso)")

        # 6. combat usa el arte solo a través de art/registry.js
        if r.startswith("combat/"):
            for s, p in deps:
                if rel(p).startswith(("art/races/", "art/kings/", "art/enemies/")):
                    fallo(6, a, f"importa {s} directamente (usa art/registry.js)")

        # 7. nadie nuevo importa los módulos antiguos
        for s, p in deps:
            if os.path.dirname(p) == JS and os.path.basename(p) in OLD:
                fallo(7, a, f"importa el módulo antiguo {s}")

        # 8. contrato mínimo de un archivo de raza
        if r.startswith("art/races/") and nombre != "index.js":
            for clave in ("id", "kit", "ready", "materials", "ramps", "classes"):
                if not re.search(r"(^|[\s,{])" + clave + r"\s*[:(,}]", codigo):
                    fallo(8, a, f"no exporta «{clave}»")

        # 9. art/** no depende de combat/, render/, rules.js ni camp/
        if r.startswith("art/"):
            for s, p in deps:
                q = rel(p)
                if q.startswith(("combat/", "render/", "camp/")) or q == "rules.js":
                    fallo(9, a, f"importa {s}")

    # 10. el registro de arte ya no depende del adaptador provisional legacy-enemies.js
    reg = os.path.join(ARENA, "art", "registry.js")
    if os.path.exists(reg):
        with open(reg, encoding="utf-8") as fh:
            if "legacy-enemies" in sin_comentarios(fh.read()):
                fallo(10, reg, "usa legacy-enemies.js (los reyes y enemigos ya tienen arte propio)")

    if errores:
        print("check_arena: FALLA\n" + "\n".join(errores))
        return 1
    print(f"check_arena: OK ({len(archivos)} archivos revisados)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

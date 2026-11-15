"""Oficina Virtual — aplicación de escritorio.

Arranca el servidor local y abre la oficina en una ventana nativa (pywebview).

Uso:
    python app.py                    abre la oficina
    python app.py --port 3020        usa otro puerto
    python app.py --install-hooks    conecta Claude Code con la oficina y sale
    python app.py --uninstall-hooks  quita esa conexión y sale

Con el ejecutable: OficinaVirtual.exe [mismas opciones]
"""
import argparse
import json
import os
import sys
import urllib.request


def already_running(url: str) -> bool:
    """¿Hay ya una oficina escuchando en el puerto? (por ejemplo, otra ventana abierta)"""
    try:
        with urllib.request.urlopen(url + "api/hooks", timeout=1) as r:
            return "installed" in json.load(r)
    except Exception:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Oficina virtual 16 bits para Claude Code")
    parser.add_argument("--port", type=int, default=int(os.environ.get("OFFICE_PORT", 3017)))
    parser.add_argument("--install-hooks", action="store_true", help="conecta Claude Code con la oficina y sale")
    parser.add_argument("--uninstall-hooks", action="store_true", help="quita la conexión con Claude Code y sale")
    args = parser.parse_args()

    from oficina import hooks
    if args.install_hooks or args.uninstall_hooks:
        st = hooks.install(args.port) if args.install_hooks else hooks.uninstall(args.port)
        print(("Conectada" if st["installed"] else "Desconectada") + f" ({st['settings']})")
        return

    import webview
    from oficina import server

    url = f"http://127.0.0.1:{args.port}/"
    try:
        server.start(args.port)
    except OSError:
        if not already_running(url):
            webview.create_window("Oficina Virtual", html=(
                "<body style='font-family:sans-serif;background:#14121c;color:#e8e2f5;padding:24px'>"
                f"<h2>No se pudo abrir la oficina</h2><p>El puerto {args.port} está ocupado por otro programa. "
                "Ciérralo o abre la oficina con <code>--port</code> y otro número; después pulsa "
                "«⚙ Claude Code → Conectar» para que los hooks usen ese puerto.</p></body>"), width=600, height=280)
            webview.start()
            sys.exit(1)

    webview.create_window(
        "Oficina Virtual", url,
        width=1440, height=960, min_size=(900, 600),
        background_color="#14121c", text_select=False,
    )
    webview.start(private_mode=False)   # private_mode=False: recuerda las preferencias de sonido


if __name__ == "__main__":
    main()

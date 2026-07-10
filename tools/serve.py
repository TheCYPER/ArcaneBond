#!/usr/bin/env python3
import argparse
import http.server
import socket
import socketserver
import threading
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class LocalGameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def choose_port():
    for port in range(4173, 4184):
        with socket.socket() as probe:
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("4173-4183 端口都被占用，请关闭一个本地服务后重试。")


def main():
    parser = argparse.ArgumentParser(description="启动《双生秘法》本地服务器")
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()
    port = choose_port()
    with socketserver.TCPServer(("127.0.0.1", port), LocalGameHandler) as server:
        url = f"http://127.0.0.1:{port}/"
        print(f"双生秘法已启动：{url}", flush=True)
        if not args.no_open:
            threading.Timer(0.35, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n游戏服务已停止。")


if __name__ == "__main__":
    main()

#!/bin/zsh
cd "${0:A:h}"
if command -v python3 >/dev/null 2>&1; then
  exec python3 tools/serve.py
fi
echo "没有找到 Python 3，无法启动本地游戏。"
echo "请在终端中运行：python3 tools/serve.py"
read -r "?按回车关闭窗口。"

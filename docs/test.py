#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import base64

def build_html(input_file, output_file="test.html"):
    head = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>文件下载测试</title>
</head>
<body>

<p style="font-size: 20px;">文件下载测试</p>
<p style="font-size: 12px;">选择以下乱码，并拖拽到记事本</p>
<p style="font-size: 12px;">*从这里开始拖拽（手动删除）*</p>

<style>
pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 1px;
  line-height: 0.1;
  font-family: Consolas, "Courier New", monospace;
}
</style>

<pre><code>
"""

    tail = """
</code></pre>

<p style="font-size: 12px;">*到这里结束拖拽（手动删除）*</p>
<p style="font-size: 12px;">解码指令：powershell -Command "$b=[Convert]::FromBase64String((Get-Content in.b64 -Raw).Trim()); [IO.File]::WriteAllBytes('out.bin',$b)"</p>

</body>
</html>
"""

    with open(input_file, "rb") as f:
        raw_data = f.read()
    
    # 将文件内容转换为 Base64
    base64_data = base64.b64encode(raw_data).decode('ascii')

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(head)
        f.write(base64_data)
        f.write(tail)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("用法: python wrap_html.py <任意文件>")
        sys.exit(1)

    build_html(sys.argv[1])
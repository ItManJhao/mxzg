"""检查当前 README 与 docs 的相对 Markdown 文件链接；外部网址和代码示例不发起网络请求。"""
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def check():
    """检查文件目标存在性，保留标题锚点给 Markdown 渲染器处理。"""
    files = [ROOT / 'README.md'] + list((ROOT / 'docs').rglob('*.md'))
    failures = []
    for file in files:
        text = file.read_text(encoding='utf-8-sig')
        text = re.sub(r'```[\s\S]*?```', '', text)
        for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)', text):
            target = match.group(1).strip('<>').split('#')[0]
            if not target or re.match(r'^[a-zA-Z][\w+.-]*:', target):
                continue
            target = unquote(target)
            if not (file.parent / target).exists():
                failures.append(f'{file.relative_to(ROOT)} -> {target}')
    if failures:
        raise SystemExit('\n'.join(failures))
    print(f'文档文件链接通过：{len(files)} 份 README/指南/验证记录')


if __name__ == '__main__':
    check()

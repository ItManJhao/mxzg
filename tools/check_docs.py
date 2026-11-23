"""检查仓库指南的本地文件链接与 Markdown 标题锚点，供统一 docs 专项使用。"""
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote
from bundle_paths import resolve_asset_path

ROOT = Path(__file__).resolve().parents[1]


@lru_cache(maxsize=None)
def markdown(path):
    """读取文档正文，跳过项目指南用来展示命令和伪链接的围栏代码块。"""
    return re.sub(r'```[\s\S]*?```', '', path.read_text(encoding='utf-8-sig'))


@lru_cache(maxsize=None)
def heading_ids(path):
    """生成仓库中各级 Markdown 标题的链接 ID，同名标题依出现顺序追加编号。"""
    anchors = set()
    for title in re.findall(r'^ {0,3}#{1,6}[ \t]+(.+)$', markdown(path), re.MULTILINE):
        # 标题中的行内链接只贡献可见文字；中英文和数字保留，排版标点略去。
        title = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', title)
        base = ''.join(char for char in title.strip().lower()
                       if char in ' _-' or unicodedata.category(char)[0] in 'LMN').replace(' ', '-')
        anchor = base
        index = 0
        while anchor in anchors:
            index += 1
            anchor = f'{base}-{index}'
        anchors.add(anchor)
    return anchors


def check():
    """校验指南的本地目标及其章节，移动或改名后仍失效的引用逐条报告。"""
    files = [ROOT / 'README.md', ROOT / 'AGENTS.md', *(ROOT / 'docs').rglob('*.md')]
    failures = []
    for file in files:
        for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)', markdown(file)):
            target, _, fragment = match.group(1).strip('<>').partition('#')
            if re.match(r'^[a-zA-Z][\w+.-]*:', target):
                continue
            target = unquote(target)
            candidate = (file.parent / target).resolve() if target else file
            if not candidate.exists() and file.is_relative_to(ROOT / 'docs/validation'):
                # 历史记录不改原路径；仅按真实Bundle声明解析移动后的同一文件，缺失仍报错。
                candidate = resolve_asset_path(candidate)
            if not candidate.exists():
                failures.append(f'{file.relative_to(ROOT)} -> {target}')
            elif fragment and candidate.suffix == '.md' and unquote(fragment) not in heading_ids(candidate):
                failures.append(f'{file.relative_to(ROOT)} -> {target}#{fragment}')
    if failures:
        raise SystemExit('\n'.join(failures))
    print(f'文档文件及章节链接通过：{len(files)} 份约定、指南与验证记录')


if __name__ == '__main__':
    check()

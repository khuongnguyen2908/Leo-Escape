"""
Tìm lớp kế thừa (class X extends Y) mà Y nằm trong một vòng import với X.
Creator nạp file theo vòng thì Y chưa có lúc X được định nghĩa → "Missing class", mất component (mất cả nút ⚙ của DemoLevelBuilder).
tsc không báo lỗi này. Chạy:  python tools/kiem_tra_import_vong.py
"""
import collections
import sys
import os
import re

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scripts')
files = {}
for d, _, fs in os.walk(ROOT):
    for f in fs:
        if f.endswith('.ts'):
            p = os.path.normpath(os.path.join(d, f))
            files[p] = open(p, encoding='utf-8').read()


def resolve(src, spec):
    if not spec.startswith('.'):
        return None
    p = os.path.normpath(os.path.join(os.path.dirname(src), spec)) + '.ts'
    return p if p in files else None


graph = collections.defaultdict(set)
named = {}
for p, s in files.items():
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", s):
        t = resolve(p, m.group(2))
        if t:
            graph[p].add(t)
            for n in m.group(1).split(','):
                n = n.strip().split(' as ')[-1].strip()
                if n:
                    named[(p, n)] = t


def path(a, b):
    """Đường import từ a tới b (để in ra vòng)."""
    prev = {a: None}
    q = collections.deque([a])
    while q:
        x = q.popleft()
        if x == b:
            out = []
            while x is not None:
                out.append(os.path.basename(x))
                x = prev[x]
            return out[::-1]
        for y in graph[x]:
            if y not in prev:
                prev[y] = x
                q.append(y)
    return None


bad = 0
for p, s in files.items():
    for m in re.finditer(r"class\s+\w+\s+extends\s+(\w+)", s):
        base = m.group(1)
        t = named.get((p, base))
        if t:
            loop = path(t, p)
            if loop:
                bad += 1
                print(f'LỖI: {os.path.basename(p)} kế thừa {base} nhưng có vòng: ' + ' → '.join(loop))
print('Không có vòng import nguy hiểm.' if bad == 0 else f'{bad} chỗ cần cắt vòng.')

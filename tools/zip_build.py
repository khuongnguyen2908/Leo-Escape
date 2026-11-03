import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(src):
        for f in files:
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, src).replace(os.sep, '/'))
names = zipfile.ZipFile(dst).namelist()
print(len(names), 'files; backslash entries:', sum(chr(92) in n for n in names))
print('top level:', [n for n in names if '/' not in n])

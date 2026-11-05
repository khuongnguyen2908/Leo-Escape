"""
Cắt bộ khói pixel (art-nguon/SmokeFX), bộ vệt chém (art-nguon/SlashFX) và bộ gồng (art-nguon/ChargeFX), mỗi file PNG là một dải nhiều ô,
thành ảnh FX_<tên>_<số>.png trong assets/resources/art/fx để DustPuff dùng. Mọi khung của một bộ cắt cùng một khung chữ nhật để hình không bị giật.

  python tools/cat_khoi.py          # chỉ đo, không ghi file
  python tools/cat_khoi.py --ghi    # cắt và ghi ảnh + .meta tối giản (sprite-frame)

Neo:
  chan  : đáy ảnh = mặt đất (hàng thấp nhất có khói), giữa ảnh theo chiều ngang = chỗ khói bắt đầu (khung đầu)
  giua  : giữa ảnh = giữa vòng khói
  o     : giữa ảnh = giữa ô (vệt chém: mèo đứng giữa ô, quay mặt sang phải)
"""
import glob, os, re, sys, uuid
from PIL import Image

SMOKE = 'art-nguon/SmokeFX/SmokeFX Lite SpriteSheet {}.png'
SLASH = 'art-nguon/SlashFX/SlashFX {} sheet.png'
DST = 'assets/resources/art/fx'
# [tên bộ, file dải gốc, bề ngang một ô, neo]
JOBS = [
    ('FX_run_', SMOKE.format('1A-2'), 64, 'chan'),       # chạy: bụi nâu tung về phía sau
    ('FX_skid_', SMOKE.format('1A-6'), 64, 'chan'),      # dừng lại / quay đầu: đám bụi tròn ở mũi chân
    ('FX_takeoff_', SMOKE.format('4A-2'), 252, 'giua'),  # nhảy lên / đáp đất thường: vòng bụi nhỏ
    ('FX_land_', SMOKE.format('4A-1'), 252, 'giua'),     # đáp đất mạnh: vòng bụi lớn
    ('FX_airjump_', SMOKE.format('3A-5'), 64, 'giua'),   # nhảy lần 2 trên không: vòng nổ trắng
    # Vệt chém của Leo (SlashFx, LeoSkills, SwordWave)
    ('FX_cut1_', SLASH.format('SimpleSmall Combo3'), 128, 'o'),  # combo nhát 1: vòng qua đầu
    ('FX_cut2_', SLASH.format('SimpleSmall Combo1'), 128, 'o'),  # combo nhát 2 + chém hất: quét từ dưới lên
    ('FX_cut3_', SLASH.format('SimpleCombo3'), 128, 'o'),        # combo nhát 3: quét ngang rộng
    ('FX_spin_', SLASH.format('SimpleCombo1'), 128, 'o'),        # combo nhát 4: chém xoay 360°
    ('FX_finish_', SLASH.format('Combo1'), 128, 'o'),            # combo nhát 5: kết liễu
    ('FX_airspin_', SLASH.format('SimpleCombo2'), 128, 'o'),     # J trên không: chém xoay nhỏ
    ('FX_sweep_', SLASH.format('Combo3'), 128, 'o'),             # S + J: quét sát đất
    ('FX_wave_', SLASH.format('Combo2'), 128, 'o'),              # giữ J rồi thả: sóng kiếm
    # Gồng sóng kiếm (ChargeFx): dải 8 ô 96×96, chấm → vòng → ngôi sao → vòng toả ra
    ('FX_charge_', 'art-nguon/ChargeFX/Hitspark FX Batch1 Star5 sheet.png', 96, 'o'),
]
PAD = 2


def cells(im, cw):
    w, h = im.size
    out = []
    for i in range(w // cw):
        c = im.crop((i * cw, 0, (i + 1) * cw, h))
        bb = c.split()[-1].getbbox()
        if bb:
            out.append((i, c, bb))
    return out


def main(write):
    for name, src, cw, anchor in JOBS:
        strip = os.path.basename(src).replace('SmokeFX Lite SpriteSheet ', '').replace('SlashFX ', '').replace(' sheet', '')[:-4]
        im = Image.open(src).convert('RGBA')
        cs = cells(im, cw)
        h = im.size[1]
        edge = [i for i, _, bb in cs if bb[0] == 0 or bb[2] == cw or bb[1] == 0 or bb[3] == h]
        x0 = min(bb[0] for _, _, bb in cs); x1 = max(bb[2] for _, _, bb in cs)
        y0 = min(bb[1] for _, _, bb in cs); y1 = max(bb[3] for _, _, bb in cs)
        if anchor == 'chan':
            first = cs[0][2]
            cx = (first[0] + first[2]) / 2
            bottom = y1
            top = y0
        elif anchor == 'o':
            cx = cw / 2
            cy = h / 2
            half_h = max(cy - y0, y1 - cy)
            top, bottom = cy - half_h, cy + half_h
        else:
            cx = (x0 + x1) / 2
            cy = (y0 + y1) / 2
            half_h = max(cy - y0, y1 - cy)
            top, bottom = cy - half_h, cy + half_h
        half_w = max(cx - x0, x1 - cx) + PAD
        box = (round(cx - half_w), round(top - PAD), round(cx + half_w), round(bottom + (PAD if anchor != 'chan' else 0)))
        print(f'{name:12} {strip:18} {len(cs):2} khung  o {cw}x{h}  cham mep: {edge or "khong"}  cat {box} -> {box[2]-box[0]}x{box[3]-box[1]}')
        if not write:
            continue
        for k, (_, c, _) in enumerate(cs, 1):
            fr = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
            fr.alpha_composite(c.crop((max(box[0], 0), max(box[1], 0), min(box[2], cw), min(box[3], h))),
                               (max(-box[0], 0), max(-box[1], 0)))
            path = os.path.join(DST, f'{name}{k}.png')
            fr.save(path)
            meta = path + '.meta'
            if not os.path.exists(meta):
                with open(meta, 'w', encoding='utf-8', newline='\n') as f:
                    f.write('{\n  "ver": "1.0.27",\n  "importer": "image",\n  "imported": false,\n'
                            f'  "uuid": "{uuid.uuid4()}",\n  "files": [],\n  "subMetas": {{}},\n'
                            '  "userData": {\n    "type": "sprite-frame",\n    "hasAlpha": true,\n    "fixAlphaTransparencyArtifacts": false\n  }\n}\n')
        # Bộ mới ít khung hơn bộ cũ: xoá các khung thừa (DustPuff đếm theo số trong tên nên khung thừa vẫn bị chạy)
        for f in glob.glob(os.path.join(DST, f'{name}*.png')):
            m = re.search(re.escape(name) + r'(\d+)\.png$', f)
            if m and int(m.group(1)) > len(cs):
                os.remove(f)
                if os.path.exists(f + '.meta'):
                    os.remove(f + '.meta')
                print('  xoa khung thua', os.path.basename(f))


if __name__ == '__main__':
    main('--ghi' in sys.argv)

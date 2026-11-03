"""Âm thanh tạm cho Phố Mèo, tổng hợp bằng code (không cần thư viện ngoài)."""
import math, random, struct, sys, wave

SR = 22050
random.seed(7)

def note(n):  # tên nốt -> tần số, ví dụ 'C5'
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    semi = names[n[0]] + (1 if '#' in n else 0)
    octave = int(n[-1])
    return 440.0 * 2 ** ((semi + 12 * (octave + 1) - 69) / 12)

def osc(kind, phase):
    p = phase % 1.0
    if kind == 'sine': return math.sin(2 * math.pi * p)
    if kind == 'square': return 1.0 if p < 0.5 else -1.0
    if kind == 'tri': return 4 * abs(p - 0.5) - 1
    if kind == 'saw': return 2 * p - 1
    raise ValueError(kind)

def tone(dur, f0, f1=None, kind='square', vol=0.5, attack=0.005, decay=None, vib=0.0):
    f1 = f0 if f1 is None else f1
    n = int(dur * SR); out = []; ph = 0.0
    for i in range(n):
        t = i / n
        f = f0 * (f1 / f0) ** t
        if vib: f *= 1 + vib * math.sin(2 * math.pi * 30 * i / SR)
        ph += f / SR
        env = min(1, i / (attack * SR + 1)) * ((1 - t) ** (decay if decay else 1.5))
        out.append(osc(kind, ph) * env * vol)
    return out

def noise(dur, vol=0.5, lp0=0.5, lp1=None, hp=0.0, decay=1.5, attack=0.003, rise=False):
    """Tiếng xì lọc: lp là hệ số lọc thông thấp 0..1 (nhỏ = trầm), quét từ lp0 tới lp1."""
    lp1 = lp0 if lp1 is None else lp1
    n = int(dur * SR); out = []; y = 0.0; prev = 0.0
    for i in range(n):
        t = i / n
        a = lp0 + (lp1 - lp0) * t
        y += a * (random.uniform(-1, 1) - y)
        s = y - hp * prev; prev = y
        env = min(1, i / (attack * SR + 1))
        env *= math.sin(math.pi * t) if rise else (1 - t) ** decay
        out.append(s * env * vol)
    return out

def mix(*tracks, offsets=None):
    offsets = offsets or [0] * len(tracks)
    n = max(int(o * SR) + len(t) for t, o in zip(tracks, offsets))
    out = [0.0] * n
    for t, o in zip(tracks, offsets):
        s = int(o * SR)
        for i, v in enumerate(t): out[s + i] += v
    return out

def seq(notes, step, kind='square', vol=0.35, decay=2.0):
    return mix(*[tone(step * 1.6, note(n), kind=kind, vol=vol, decay=decay) for n in notes],
               offsets=[i * step for i in range(len(notes))])

def save(path, data, peak=0.9):
    m = max(1e-6, max(abs(v) for v in data))
    k = peak / m if m > peak else 1.0
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * k)) * 32767)) for v in data))

out = sys.argv[1]
S = {
    'jump': tone(0.16, 280, 720, 'square', 0.28, decay=1.2),
    'land': mix(noise(0.09, 0.7, 0.08, 0.03, decay=2.5), tone(0.08, 110, 60, 'sine', 0.6)),
    'drop': tone(0.14, 520, 220, 'tri', 0.4),
    'slash1': noise(0.13, 0.8, 0.15, 0.6, hp=0.6, rise=True),
    'slash2': noise(0.13, 0.8, 0.6, 0.18, hp=0.6, rise=True),
    'slash3': mix(noise(0.2, 0.9, 0.1, 0.7, hp=0.5, rise=True), tone(0.2, 900, 300, 'saw', 0.08)),
    'hit': mix(noise(0.08, 0.9, 0.5, 0.1, decay=3), tone(0.14, 180, 70, 'sine', 0.8, decay=2.5), tone(0.03, 1800, 900, 'square', 0.15)),
    'dash': mix(noise(0.32, 0.8, 0.05, 0.75, hp=0.4, rise=True), tone(0.3, 300, 1200, 'saw', 0.06, decay=0.8)),
    'skill_ready': mix(tone(0.25, note('E6'), kind='sine', vol=0.35, decay=2), tone(0.3, note('B6'), kind='sine', vol=0.35, decay=2), offsets=[0, 0.08]),
    'hurt': tone(0.28, 520, 180, 'square', 0.3, decay=1.0, vib=0.08),
    'enemy_die': mix(noise(0.06, 0.6, 0.6, decay=3), tone(0.3, 700, 120, 'square', 0.25, decay=1.2)),
    'coin': mix(tone(0.07, note('B5'), kind='square', vol=0.25, decay=0.5), tone(0.25, note('E6'), kind='square', vol=0.25, decay=1.5), offsets=[0, 0.07]),
    'heal': seq(['C5', 'E5', 'G5', 'C6'], 0.07, 'tri', 0.45),
    'checkpoint': seq(['G5', 'C6', 'E6'], 0.09, 'square', 0.22),
    'win': mix(seq(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.13, 'square', 0.22, 1.2), seq(['C4', 'G4', 'C5'], 0.26, 'tri', 0.35, 1.0)),
    'lose': seq(['G4', 'E4', 'C4', 'G3'], 0.18, 'tri', 0.45, 1.0),
}
for name, data in S.items():
    save(f'{out}/{name}.wav', data)

# Nhạc nền: 120 bpm, 8 ô nhịp (16 giây), lặp liền mạch. Ngũ cung trưởng cho vui tươi.
beat = 0.5
bars = [('C', ['C3', 'G3']), ('A', ['A2', 'E3']), ('F', ['F2', 'C3']), ('G', ['G2', 'D3'])] * 2
chords = {'C': ['C4', 'E4', 'G4'], 'A': ['A3', 'C4', 'E4'], 'F': ['F3', 'A3', 'C4'], 'G': ['G3', 'B3', 'D4']}
melody = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5',
          'E5', 'C5', 'A4', 'C5', 'D5', 'E5', 'D5', '-',
          'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'G5',
          'D5', 'E5', 'D5', 'B4', 'G4', 'A4', 'B4', '-',
          'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'G5',
          'A5', 'G5', 'E5', 'C5', 'D5', 'E5', 'C5', '-',
          'C5', 'E5', 'G5', 'E5', 'F5', 'E5', 'D5', 'C5',
          'D5', 'B4', 'G4', 'B4', 'D5', 'E5', 'D5', '-']
total = len(bars) * 4 * beat
parts, offs = [], []
for b, (ch, bass) in enumerate(bars):
    t0 = b * 4 * beat
    for k in range(4):
        parts.append(tone(beat * 0.9, note(bass[k % 2]), kind='tri', vol=0.45, decay=1.0)); offs.append(t0 + k * beat)
        parts.append(noise(0.05, 0.12 if k % 2 else 0.2, 0.9, hp=0.95, decay=4)); offs.append(t0 + k * beat + beat / 2)
    for k in (1, 3):
        for n in chords[ch]:
            parts.append(tone(beat * 0.6, note(n), kind='square', vol=0.045, decay=1.5)); offs.append(t0 + k * beat)
for i, n in enumerate(melody):
    if n != '-':
        parts.append(tone(beat * 0.48, note(n), kind='tri', vol=0.32, decay=0.9)); offs.append(i * beat / 2)
music = mix(*parts, offsets=offs)
n = int(total * SR)
music = (music + [0.0] * n)[:n]  # cắt đúng 16 giây để lặp khít
save(f'{out}/bgm.wav', music, peak=0.7)
print('ok', len(S) + 1, 'files')

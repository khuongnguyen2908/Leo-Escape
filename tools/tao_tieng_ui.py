"""Tạo các tiếng giao diện tạm (tổng hợp bằng sóng) cho Leo Escape: assets/resources/sounds/ui_*.wav"""
import sys
import wave
import numpy as np

SR = 22050
OUT = sys.argv[1]
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, attack=0.005, release=None, curve=3.0):
    """Đường âm lượng: lên nhanh rồi tắt dần (mũ curve)."""
    x = np.linspace(0, 1, n)
    a = max(1, int(SR * attack))
    e = (1 - x) ** curve
    e[:a] *= np.linspace(0, 1, a)
    return e


def tone(freqs, sec, wave_type='sine', curve=3.0, attack=0.004):
    """Âm có cao độ trượt theo freqs (list các mốc), tắt dần."""
    tt = t(sec)
    f = np.interp(tt, np.linspace(0, sec, len(freqs)), freqs)
    phase = 2 * np.pi * np.cumsum(f) / SR
    if wave_type == 'sine':
        s = np.sin(phase)
    elif wave_type == 'square':
        s = np.sign(np.sin(phase)) * 0.5
    else:  # tam giác
        s = 2 / np.pi * np.arcsin(np.sin(phase))
    return s * env(len(tt), attack=attack, curve=curve)


def noise(sec, lo, hi, curve=2.0, attack=0.01, sweep=None):
    """Tiếng xì / vút: nhiễu lọc thông dải, sweep = (tần số đầu, tần số cuối) cho tâm dải."""
    n = int(SR * sec)
    w = rng.standard_normal(n)
    spec = np.fft.rfft(w)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    s = np.fft.irfft(spec, n)
    if sweep:
        # Lọc thông dải trượt: chia khúc, mỗi khúc giữ dải quanh tâm
        out = np.zeros(n)
        chunks = 24
        for i in range(chunks):
            a, b = i * n // chunks, (i + 1) * n // chunks
            c = sweep[0] + (sweep[1] - sweep[0]) * i / (chunks - 1)
            seg = rng.standard_normal(b - a)
            sp = np.fft.rfft(seg)
            fq = np.fft.rfftfreq(b - a, 1 / SR)
            sp[(fq < c * 0.6) | (fq > c * 1.6)] = 0
            out[a:b] = np.fft.irfft(sp, b - a)
        s = out
    s /= max(1e-6, np.abs(s).max())
    return s * env(n, attack=attack, curve=curve)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def save(name, s, gain=0.8):
    s = s / max(1e-6, np.abs(s).max()) * gain
    data = (s * 32767).astype(np.int16)
    with wave.open(f'{OUT}/{name}.wav', 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(data.tobytes())
    print(name, f'{len(s) / SR:.2f}s')


# Dời lựa chọn: tick ngắn, sáng
save('ui_move', tone([1500, 1700], 0.045, 'triangle', curve=4), 0.5)
# Bấm nút / chọn: hai nốt đi lên
save('ui_click', mix(tone([660, 700], 0.06, 'triangle'), np.concatenate([np.zeros(int(SR * 0.045)), tone([990, 1040], 0.09, 'triangle')])), 0.7)
# Quay lại / huỷ: hai nốt đi xuống
save('ui_back', mix(tone([700, 660], 0.06, 'triangle'), np.concatenate([np.zeros(int(SR * 0.045)), tone([470, 440], 0.09, 'triangle')])), 0.6)
# Không được (cờ đích còn khoá...): tiếng bụp trầm hai lần
save('ui_deny', mix(tone([220, 180], 0.08, 'square', curve=2), np.concatenate([np.zeros(int(SR * 0.1)), tone([200, 160], 0.1, 'square', curve=2)])), 0.45)
# Xoá ô lưu: trượt xuống
save('ui_delete', tone([900, 220], 0.28, 'triangle', curve=1.5), 0.6)
# Đã lưu: chuông hai nốt
save('ui_saved', mix(tone([1047], 0.35, 'sine', curve=2.5), np.concatenate([np.zeros(int(SR * 0.08)), tone([1568], 0.4, 'sine', curve=2.5)])), 0.6)
# Bấm PRESS ANY BUTTON: hợp âm đi lên lấp lánh
start = np.zeros(int(SR * 0.7))
for i, f in enumerate([523, 659, 784, 1047]):
    p = tone([f, f * 1.01], 0.45, 'triangle', curve=2)
    o = int(SR * 0.06 * i)
    start[o:o + len(p)] += p
save('ui_start', start, 0.7)
# Zoom vào màn đen: vút xuống
save('ui_zoom_in', noise(0.6, 200, 6000, curve=1.2, attack=0.15, sweep=(3500, 400)), 0.55)
# Zoom ra: vút lên
save('ui_zoom_out', noise(0.7, 200, 6000, curve=1.6, attack=0.05, sweep=(500, 3800)), 0.55)
# Lật trang giấy: xào xạc
flip = noise(0.28, 1500, 9000, curve=1.4, attack=0.03, sweep=(5000, 2500))
save('ui_page', flip, 0.5)
# Chữ thoại hiện dần: tiếng gõ rất ngắn
save('ui_text', tone([880, 820], 0.03, 'square', curve=5, attack=0.001), 0.35)
# Mở cửa EXIT: kẹt cửa + vút
save('ui_door', mix(tone([150, 260, 190], 0.35, 'square', curve=1.2) * 0.4, noise(0.4, 300, 3000, curve=2, attack=0.05)), 0.55)

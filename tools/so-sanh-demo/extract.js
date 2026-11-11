// Cách dùng: node tools/so-sanh-demo/extract.js assets/scenes/Main.scene . <thư mục ra>
//           powershell -File tools/so-sanh-demo/draw.ps1 -dir <thư mục ra> -refDir assets/ref
// Ra cmp1..4.png: nửa trên là khung hình dựng lại từ scene (không có ánh sáng vẽ bằng Graphics), nửa dưới là ảnh demo.
// Dựng danh sách vẽ (đúng thứ tự vẽ của Cocos) cho 4 khung camera của màn demo.
const fs = require('fs'), path = require('path');
const [scenePath, root, outDir] = process.argv.slice(2);
const S = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
// uuid sprite-frame -> { png, rect }
const frames = new Map();
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith('.png.meta') && !f.endsWith('.jpg.meta')) continue;
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, sub] of Object.entries(m.subMetas || {})) {
      if (sub.importer !== 'sprite-frame') continue;
      const u = sub.userData;
      frames.set(m.uuid + '@' + k, { png: p.slice(0, -5), rect: [u.trimX, u.trimY, u.width, u.height], name: path.basename(p, '.meta') });
    }
  }
})(path.join(root, 'assets'));
const comps = n => (n._components || []).map(c => S[c.__id__]);
const isParallax = c => c && '_hasBase' in c && 'factor' in c;
const isGround = c => c && '_overlap' in c && '_tileHeight' in c;
const canvas = S.find(o => o._name === 'Canvas' && o.__type__ === 'cc.Node');
// Bỏ qua UI và node chỉ dùng trong editor. Lớp đang tắt (như MG) cũng bị bỏ qua, giống lúc chơi.
const SKIP = new Set(['Landing', 'DemoRef', 'Camera', 'image 1465', 'HUD', 'BossBar', 'TouchControls']);
const CAMS = [660, 2580, 4500, 6420], CAM_Y = 33;
const mul = (m, n) => [m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1], m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3], m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
const apply = (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
const scr = ([x, y]) => [Math.round((960 + x) * 10) / 10, Math.round((540 - y) * 10) / 10];
// Ô đá của GroundBlock không lưu trong scene (code dựng lại khi mở): xếp lại y như GroundBlock.layTiles
// (cùng hạt giống ngẫu nhiên, cắt viền chỗ giáp nhau, chồng nhẹ, giãn cho vừa khít, kéo dài đáy).
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hash(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; }
function groundTiles(n, g, W, a, layerName) {
  const out = [];
  // Xếp tay: các ô là sprite con thật, đã được vẽ như mọi sprite khác
  if (g._manual) return out;
  const main = g._tileFrame && frames.get(g._tileFrame.__uuid__);
  if (!main) return out;
  const pool = [main, ...(g._variants || []).map(v => v && frames.get(v.__uuid__)).filter(Boolean)];
  const bl = g._bleedLeft || 0, br = g._bleedRight || 0;
  const th = g._tileHeight, cut = g._edgeCut ?? 0, w = g._width + bl + br, sink = g._sink;
  const sc = f => th / f.rect[3];
  const avg = pool.reduce((s, f) => s + (f.rect[2] - 2 * cut) * sc(f), 0) / pool.length;
  const ov = g._overlap * sc(main);
  const cnt = Math.max(1, Math.round((w - 2 * cut * sc(main) - ov) / Math.max(1, avg - ov)));
  const rand = rng(g._seed || hash(n._id));
  const fs = [];
  for (let i = 0; i < cnt; i++) {
    const ch = pool.length > 1 ? pool.filter(f => f !== fs[i - 1]) : pool;
    fs.push(ch[Math.floor(rand() * ch.length) % ch.length]);
  }
  const cuts = fs.map((_, i) => [i > 0 ? cut : 0, i < cnt - 1 ? cut : 0]);
  // Góc ngoài (giống GroundBlock): đầu lộ ra dùng ảnh trong End Frames, đầu trái lật ngang
  const ends = (g._endFrames || []).map(v => v && frames.get(v.__uuid__)).filter(Boolean);
  const flips = fs.map(() => false);
  const leftEnd = g._leftEndFrame && frames.get(g._leftEndFrame.__uuid__);
  if (ends.length || leftEnd) {
    const r2 = rng(((g._seed || hash(n._id)) ^ 0x9e3779b9) >>> 0);
    const pick = () => ends[Math.floor(r2() * ends.length) % ends.length];
    if (g._capRight && ends.length) fs[cnt - 1] = pick();
    if (g._capLeft && (cnt > 1 || !g._capRight)) {
      if (leftEnd) fs[0] = leftEnd;
      else if (ends.length) { fs[0] = pick(); flips[0] = g._flipLeftCap !== false; }
    }
    flips.forEach((f, i) => { if (f) cuts[i] = [cuts[i][1], cuts[i][0]]; });
  }
  const widths = fs.map((f, i) => (f.rect[2] - cuts[i][0] - cuts[i][1]) * sc(f));
  const k = w / Math.max(1, widths.reduce((s, v) => s + v, 0) - (cnt - 1) * ov);
  let x = -bl;
  const ext = g._extend || 0;
  fs.forEach((f, i) => {
    const ww = widths[i] * k;
    const rect = [f.rect[0] + cuts[i][0], f.rect[1], f.rect[2] - cuts[i][0] - cuts[i][1], f.rect[3]];
    const [xl, xr] = flips[i] ? [x + ww, x] : [x, x + ww];
    const quad = (y0, h) => [scr(apply(W, xl, y0)), scr(apply(W, xr, y0)), scr(apply(W, xl, y0 - h))];
    out.push({ kind: 'img', png: f.png, rect, alpha: a, pts: quad(sink, th), name: n._name, art: f.name, layer: layerName, type: 0 });
    if (ext > 0) {
      const strip = [rect[0], f.rect[1] + Math.max(0, f.rect[3] - 30), rect[2], 24];
      out.push({ kind: 'img', png: f.png, rect: strip, alpha: a, pts: quad(sink - th + 4, ext + 4), name: n._name, art: f.name, layer: layerName, type: 0 });
    }
    x += ww - ov * k;
  });
  return out;
}
for (let fi = 0; fi < 4; fi++) {
  const items = [];
  const visit = (n, M, alpha, layerName) => {
    if (n._active === false) return;
    const cs = comps(n);
    let p = n._lpos, s = n._lscale;
    const par = cs.find(isParallax);
    if (par && par._hasBase) {
      p = { x: par._base.x - CAMS[fi] * par.factor.x, y: par._base.y - CAM_Y * par.factor.y };
      s = par._baseScale;
    }
    const q = n._lrot || { z: 0, w: 1 }; const ang = 2 * Math.atan2(q.z, q.w);
    const c = Math.cos(ang), si = Math.sin(ang);
    const local = [c * s.x, si * s.x, -si * s.y, c * s.y, p.x, p.y];
    const W = mul(M, local);
    const op = cs.find(o => o.__type__ === 'cc.UIOpacity');
    const a = alpha * (op && op._enabled !== false ? op._opacity / 255 : 1);
    const ut = cs.find(o => o.__type__ === 'cc.UITransform');
    const g = cs.find(isGround);
    if (g && g._enabled !== false) items.push(...groundTiles(n, g, W, a, layerName));
    const sp = cs.find(o => o.__type__ === 'cc.Sprite');
    if (sp && sp._enabled !== false && sp._spriteFrame && ut) {
      const f = frames.get(sp._spriteFrame.__uuid__);
      const w = ut._contentSize.width, h = ut._contentSize.height, ax = ut._anchorPoint.x, ay = ut._anchorPoint.y;
      const L = -ax * w, R = (1 - ax) * w, B = -ay * h, T = (1 - ay) * h;
      if (f) items.push({ kind: 'img', png: f.png, rect: f.rect, alpha: a * sp._color.a / 255,
        pts: [scr(apply(W, L, T)), scr(apply(W, R, T)), scr(apply(W, L, B))], name: n._name, art: f.name, layer: layerName, type: sp._type });
      else items.push({ kind: 'missing', name: n._name });
    }
    for (const ch of n._children || []) visit(S[ch.__id__], W, a, layerName ?? S[ch.__id__]._name);
  };
  for (const ch of canvas._children) {
    const n = S[ch.__id__];
    if (SKIP.has(n._name)) continue;
    visit(n, [1, 0, 0, 1, 0, 0], 1, n._name);
  }
  fs.writeFileSync(path.join(outDir, `frame${fi + 1}.json`), JSON.stringify(items));
  const kinds = {}; items.forEach(i => kinds[i.kind] = (kinds[i.kind] || 0) + 1);
  console.log('frame', fi + 1, kinds);
}

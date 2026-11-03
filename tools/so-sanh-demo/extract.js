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
const CAMS = [660, 2580, 4500, 6420], CAM_Y = 46;
const mul = (m, n) => [m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1], m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3], m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
const apply = (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
const scr = ([x, y]) => [Math.round((960 + x) * 10) / 10, Math.round((540 - y) * 10) / 10];
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
    if (g && g._enabled !== false) {
      const pts = [[0, 0], [g._width, 0], [g._width, -g._depth], [0, -g._depth]].map(v => scr(apply(W, ...v)));
      items.push({ kind: 'poly', color: [74, 68, 80], alpha: a, pts, name: n._name, layer: layerName });
    }
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

'use strict';

/**
 * Duplicate tại chỗ: nhân bản các node đang chọn (lệnh duplicate-node của editor, giữ prefab, component như Ctrl+D),
 * rồi đặt mỗi bản sao ngay dưới node gốc của nó trong Hierarchy thay vì cuối danh sách. Chọn sẵn các bản sao.
 * Phím tắt Ctrl+Shift+D (Mac: Cmd+Shift+D), hoặc menu Extension → Duplicate tại chỗ.
 */
exports.methods = {
    async duplicateInPlace() {
        const selected = Editor.Selection.getSelected('node') || [];
        if (!selected.length) {
            console.warn('[Duplicate tại chỗ] Chưa chọn node nào trong Hierarchy.');
            return;
        }
        const created = [];
        for (const uuid of selected) {
            try {
                const res = await Editor.Message.request('scene', 'duplicate-node', uuid);
                const copy = Array.isArray(res) ? res[0] : res;
                if (!copy) continue;
                created.push(copy);
                const ok = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: 'duplicate-in-place',
                    method: 'placeAfter',
                    args: [copy, uuid],
                });
                if (!ok) console.warn('[Duplicate tại chỗ] Đã nhân bản nhưng chưa dời được bản sao lên cạnh node gốc.');
            } catch (e) {
                console.error('[Duplicate tại chỗ] Lỗi:', e);
            }
        }
        if (!created.length) return;
        try { await Editor.Message.request('scene', 'snapshot'); } catch (e) { /* không có cũng không sao */ }
        Editor.Selection.clear('node');
        Editor.Selection.select('node', created);
    },
};

exports.load = function () {};
exports.unload = function () {};

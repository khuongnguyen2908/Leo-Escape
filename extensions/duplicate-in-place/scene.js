'use strict';

/** Chạy trong tiến trình scene của editor: dời node trong cây scene đang mở. */
const { director } = require('cc');

function find(node, uuid) {
    if (node.uuid === uuid) return node;
    for (const child of node.children) {
        const found = find(child, uuid);
        if (found) return found;
    }
    return null;
}

exports.methods = {
    /** Đặt node copyUuid ngay sau node srcUuid (cùng node cha). Trả về true nếu dời được. */
    placeAfter(copyUuid, srcUuid) {
        const scene = director.getScene();
        if (!scene) return false;
        const copy = find(scene, copyUuid);
        const src = find(scene, srcUuid);
        if (!copy || !src || copy.parent !== src.parent) return false;
        const target = src.getSiblingIndex() + 1;
        if (copy.getSiblingIndex() !== target) copy.setSiblingIndex(target);
        return true;
    },
};

exports.load = function () {};
exports.unload = function () {};

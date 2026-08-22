/**
 * 夜之城·边缘行者 (cyberpunk_edgerunners) - 状态机与全局引用
 */

export const DRAG_THRESHOLD = 5;

export const ThemeState = {
    engine: null,
    particleEngine: null,
    isOpen: false,
    drag: {
        isDragging: false,
        hasMoved: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0
    }
};

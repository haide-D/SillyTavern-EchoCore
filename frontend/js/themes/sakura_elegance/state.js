/**
 * 平安京·落樱雅境 (sakura_elegance) - 状态机与全局引用
 */

export const DRAG_THRESHOLD = 15;

export const ThemeState = {
    engine: null,
    particleEngine: null,
    isOpen: false,
    drag: {
        isDragging: false,
        hasMoved: false,
        startX: 0,
        startY: 0,
        startTime: 0,
        lastTapTime: 0,
        initialLeft: 0,
        initialTop: 0
    }
};

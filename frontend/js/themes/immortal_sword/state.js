/**
 * 仙途凌霄 (immortal_sword) - 状态机与全局引用
 */

export const DRAG_THRESHOLD = 5;

export const ThemeState = {
    engine: null,
    particleEngine: null,
    currentScene: 'home',
    isModalOpen: false,
    drag: {
        isDragging: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0,
        hasMoved: false
    }
};

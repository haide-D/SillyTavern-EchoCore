export const ThemeState = {
    engine: null,
    particleEngine: null,
    dragState: {
        isDragging: false,
        hasMoved: false,
        startX: 0, startY: 0,
        shiftX: 0, shiftY: 0,
        winW: 0, winH: 0,
    }
};

export const DRAG_THRESHOLD = 10;

export const state = {
    engine: null,
    dragState: {
        isDragging: false,
        hasMoved: false,
        startX: 0, startY: 0,
        startTime: 0,
        lastTapTime: 0,
        shiftX: 0, shiftY: 0,
        winW: 0, winH: 0,
    }
};

export const DRAG_THRESHOLD = 15;

let nextPositionIndex = 0;
const gridColumns = 3;
const gridRows = 3;
let windowWidth = 400;
let windowHeight = 300;
let screenResolution = {width: 1920, height: 1080};


function getNextWindowPosition() {
    const columnIndex = nextPositionIndex % gridColumns;
    const rowIndex = Math.floor(nextPositionIndex / gridColumns);

    const x = columnIndex * (windowWidth + 50);
    const y = rowIndex * (windowHeight + 50);

    // Kiểm tra xem đã vượt quá giới hạn màn hình chưa
    if (x + windowWidth > screenResolution.width || y + windowHeight > screenResolution.height) {
        // Xử lý lỗi: Reset lại nextPositionIndex và thông báo lỗi
        console.error("Exceeded screen bounds! Resetting position index.");
        resetPositions();
        return null; // hoặc throw new Error("Exceeded screen bounds!");
    }

    nextPositionIndex++;
    return `${x},${y}`;
}

function resetPositions() {
    nextPositionIndex = 0;
}

module.exports = {
    getNextWindowPosition,
    resetPositions,
    setWindowDimensions: (width, height) => {
        windowWidth = width;
        windowHeight = height;
    },
    setScreenResolution: (width, height) => {
        screenResolution.width = width;
        screenResolution.height = height;
    },
};

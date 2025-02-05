const os = require('os');
const {screen} = require('electron');

const globalStore = {
    currentPositionIndex: 0,
    positions: [],

    initializeWindowPositions(numberThreads) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const {width: screenWidth, height: screenHeight} = primaryDisplay.workAreaSize;

        const cols = Math.ceil(Math.sqrt(numberThreads)); // Số cột
        const rows = Math.ceil(numberThreads / cols);    // Số hàng
        const windowWidth = Math.floor(screenWidth / cols);
        const windowHeight = Math.floor(screenHeight / rows);

        // Tạo danh sách các vị trí
        this.positions = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * windowWidth;
                const y = row * windowHeight;
                this.positions.push({x, y, width: windowWidth, height: windowHeight});
                if (this.positions.length >= numberThreads) break;
            }
        }
    },

    getNextWindowPosition() {
        if (this.currentPositionIndex >= this.positions.length) {
            return null; // Vượt quá số lượng vị trí
        }
        const position = this.positions[this.currentPositionIndex];
        this.currentPositionIndex++;
        return position;
    },

    reset() {
        this.currentPositionIndex = 0;
    }
};

module.exports = globalStore;

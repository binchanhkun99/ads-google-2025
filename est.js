const path = require("path");

function escapePath(p) {
    return path.win32.normalize(p);
}

console.log(escapePath("\\198.xx.x\\ADMIN\\Pictures"));
// Output: \\\\198.xx.x\\ADMIN\\Pictures

console.log(escapePath("C:\\Users\\ADMIN\\Pictures"));
// Output: C:\\Users\\ADMIN\\Pictures

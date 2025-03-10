const {app, BrowserWindow, ipcMain, Menu, dialog} = require("electron");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const XLSX = require('xlsx');
const {Worker} = require('worker_threads');

function createWindow() {
    try {

        const win = new BrowserWindow({
            width: 1000,
            height: 710,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, './preload.js'),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,  // Tắt nodeIntegration, sử dụng ipcRenderer qua preload.js
            },
        });

        if (process.env.VITE_DEV_SERVER_URL) {
            console.log("UI________", process.env.VITE_DEV_SERVER_URL);
            console.log("Preload________", path.join(__dirname, './preload.js'));
            // Chế độ phát triển
            win.loadURL(process.env.VITE_DEV_SERVER_URL);
        } else {
            // Chế độ sản xuất
            win.loadFile(path.join(__dirname, "../dist/index.html"));
        }

        // Tạo menu tùy chỉnh
        const template = [
            {
                label: "View",
                submenu: [
                    {
                        label: "Toggle DevTools",
                        accelerator: "F12",  // Phím tắt F12
                        click: () => {
                            win.webContents.toggleDevTools();  // Mở/đóng DevTools
                        },
                    },
                ],
            },
        ];
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(null);  // Áp dụng menu vào ứng dụng
    } catch (e) {
        console.log(e)
    }

}


app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});


ipcMain.handle('edit-name-profile', async (event, id, name, apiUrl) => {
    try {
        const response = await axios.post(`${apiUrl}/api/v3/profiles/update/${id}`, {
            profile_name:name,
        });e

       if (response.data.success){
           return response.data.success
       }
       else return false;
    } catch (error) {
        return {error: error.message};
    }
});


// Lắng nghe sự kiện từ renderer
ipcMain.handle('fetch-api', async (event, url) => {
    console.log(`Fetching ${url}`);
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        return {error: error.message};
    }
});

ipcMain.handle('import-excel-file', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        });

        if (canceled || !filePaths.length) return null;

        const filePath = filePaths[0]; // Đường dẫn file Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Chuẩn hóa dữ liệu: loại bỏ \r\n từ tên cột và giá trị
        const normalizedData = data.map(row => {
            const normalizedRow = {};
            for (const key in row) {
                const cleanKey = key.replace(/\r\n/g, ''); // Loại bỏ \r\n từ tên cột
                const cleanValue = String(row[key] || '').replace(/\r\n/g, '').trim(); // Loại bỏ \r\n và khoảng trắng từ giá trị
                normalizedRow[cleanKey] = cleanValue;
            }
            return normalizedRow;
        });

        // Ánh xạ dữ liệu sang định dạng mong muốn
        const cardData = normalizedData.map(row => ({
            exampleNumberCard: row.NumberCard || '',
            exampleNameHolder: row.NameHolder || '',
            exampleSecurityCode: String(row.SecurityCode || '').trim(),
            exampleMM: String(row.MM || '').trim(),
            exampleYY: String(row.YY || '').trim(),
            exampleAddress: row.Address || '',
        }));

        // Trả về cả dữ liệu và đường dẫn file
        return { data: cardData, filePath };
    } catch (error) {
        console.error('Lỗi khi đọc file Excel:', error);
        return null;
    }
});

// Hàm mới để đọc file Excel và lấy dòng đầu tiên
ipcMain.handle('read-excel-setup', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        });

        if (canceled || !filePaths.length) return null;

        const filePath = filePaths[0];
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Lấy dữ liệu thô với header

        // Lấy dòng đầu tiên (dòng 2 trong Excel, vì dòng 1 là header)
        if (data.length < 2) return null; // Kiểm tra nếu không có dữ liệu
        const firstRow = data[1]; // Dòng đầu tiên của dữ liệu (index 1, vì index 0 là header)

        // Ánh xạ dữ liệu từ file Excel sang định dạng mong muốn
        const excelData = {
            campaignName: firstRow[0],
            budgetType: firstRow[1] || 'Daily', // Cột B: Budget Type
            locationCampaign: firstRow[2] || 'All countries and territories', // Cột C: Location
            urlVideo: firstRow[3] || '', // Cột D: Url Video
            longHeadline: firstRow[4] || '', // Cột E: Long Headline
            description: firstRow[5] || '', // Cột F: Description
            targetCPV: firstRow[6] || 5000, // Cột G: Target CPV
            budgetMoney: firstRow[7] || 1111111, // Cột H: Budget Money
        };

        return excelData; // Trả về object với dữ liệu dòng đầu tiên
    } catch (error) {
        console.error('Lỗi khi đọc file Excel:', error);
        return null;
    }
});
ipcMain.handle('read-id', async (event) => {
    const filePath = path.join(__dirname, 'id.txt'); // Tên file mới nếu chưa tồn tại
    const defaultData = '1'
    try {
        // Kiểm tra nếu file không tồn tại
        if (!fs.existsSync(filePath)) {
            // Tạo file mới với dữ liệu mặc định
            fs.writeFileSync(filePath, defaultData, 'utf-8');
            console.log(`File ${filePath} đã được tạo.`);
        }

        // Đọc nội dung file
        const dataIdGroup = fs.readFileSync(filePath, 'utf-8');
        return dataIdGroup;
    } catch (error) {
        console.error('Lỗi xử lý file:', error);
        return null;
    }
})

ipcMain.handle('read-file', async () => {
    const filePath = path.join(__dirname, 'setup.txt'); // Tên file mới nếu chưa tồn tại
    const defaultData = `CTY LIFETECH JSC
https://example.com
key word 1, key word 2
Mạc Đĩnh chi Strict
40051
Ho Chi Minh City
Vietnam
1
1
Tôi pay
1
21/07/2024
Vietnam
Không có mô tả
Không có mối quan hệ
Tôi
1
84
983383863
Trong tháng
Rất nhiều vấn đề
Vietnam`;

    try {
        // Kiểm tra nếu file không tồn tại
        if (!fs.existsSync(filePath)) {
            // Tạo file mới với dữ liệu mặc định
            fs.writeFileSync(filePath, defaultData, 'utf-8');
            console.log(`File ${filePath} đã được tạo.`);
        }

        // Đọc nội dung file
        const dataSetup = fs.readFileSync(filePath, 'utf-8');
        return dataSetup;
    } catch (error) {
        console.error('Lỗi xử lý file:', error);
        return null;
    }
});

ipcMain.handle('read-file-limit', async () => {
    const filePath = path.join(__dirname, 'setup-limit.txt'); // Tên file mới nếu chưa tồn tại
    const defaultData = `CTY LIFETECH JSC
84
983383863
https://example.com
Mạc Đĩnh chi Strict
40051
Ho Chi Minh City
Vietnam
Yes
Yes
21/07/2024
Vietnam, United State
Mô tả về doanh nghiệp
Giải thích về chi tiêu
Rất nhiều vấn đề
C:\\Users\\ADMIN\\Pictures\\image_test_khang_limit_2dollar.png
84
983383863
Trong tháng
Rất nhiều vấn đề`;

    try {
        // Kiểm tra nếu file không tồn tại
        if (!fs.existsSync(filePath)) {
            // Tạo file mới với dữ liệu mặc định
            fs.writeFileSync(filePath, defaultData, 'utf-8');
            console.log(`File ${filePath} đã được tạo.`);
        }

        // Đọc nội dung file
        const dataSetup = fs.readFileSync(filePath, 'utf-8');
        return dataSetup;
    } catch (error) {
        console.error('Lỗi xử lý file:', error);
        return null;
    }
});

ipcMain.handle('read-file-reg', async () => {
    const filePath = path.join(__dirname, 'setup-reg.txt'); // Tên file mới nếu chưa tồn tại
    const defaultData =
        `https://example.com
United States
VND
Organization
Glamour Gaurd LLC
TRINH THI MY LINH
87110
4503060009729912
TRAN MY LINH
813
10
2028
No
No
1209 MOUNTAIN ROAD PL NE STE R
ALBUQUERQUE
New Mexico
87110
Yes
My agency
Yes, we pay for this account
Yes, we pay Google Ads directly
`;
    try {
        // Kiểm tra nếu file không tồn tại
        if (!fs.existsSync(filePath)) {
            // Tạo file mới với dữ liệu mặc định
            fs.writeFileSync(filePath, defaultData, 'utf-8');
            console.log(`File ${filePath} đã được tạo.`);
        }

        // Đọc nội dung file
        const dataSetup = fs.readFileSync(filePath, 'utf-8');
        return dataSetup;
    } catch (error) {
        console.error('Lỗi xử lý file:', error);
        return null;
    }
});


ipcMain.handle('read-file-share-account', async () => {
    const filePath = path.join(__dirname, 'setup-share-account.txt'); // Tên file mới nếu chưa tồn tại
    const defaultData =
        `test1@gmail.com
United States
`;
    try {
        // Kiểm tra nếu file không tồn tại
        if (!fs.existsSync(filePath)) {
            // Tạo file mới với dữ liệu mặc định
            fs.writeFileSync(filePath, defaultData, 'utf-8');
            console.log(`File ${filePath} đã được tạo.`);
        }

        // Đọc nội dung file
        const dataSetup = fs.readFileSync(filePath, 'utf-8');
        return dataSetup;
    } catch (error) {
        console.error('Lỗi xử lý file:', error);
        return null;
    }
});

ipcMain.handle('save-file', async (event, data) => {
    const filePath = path.join(__dirname, 'setup.txt');
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log(`File ${filePath} đã được cập nhật.`);
        return true;
    } catch (error) {
        console.error('Lỗi ghi file:', error);
        return false;
    }
});
// ---------------------LƯU FILE REG
ipcMain.handle('save-file-reg', async (event, data) => {
    const filePath = path.join(__dirname, 'setup-reg.txt');
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log(`File ${filePath} đã được cập nhật.`);
        return true;
    } catch (error) {
        console.error('Lỗi ghi file:', error);
        return false;
    }
});
// ---------------------LƯU FILE KHÁNG LIMIT
ipcMain.handle('save-file-limit', async (event, data) => {
    const filePath = path.join(__dirname, 'setup-limit.txt');
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log(`File ${filePath} đã được cập nhật.`);
        return true;
    } catch (error) {
        console.error('Lỗi ghi file:', error);
        return false;
    }
});
ipcMain.handle('save-file-share-account', async (event, data) => {
    const filePath = path.join(__dirname, 'setup-share-account.txt');
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log(`File ${filePath} đã được cập nhật.`);
        return true;
    } catch (error) {
        console.error('Lỗi ghi file:', error);
        return false;
    }
});
ipcMain.handle('save-id', async (event, data) => {
    const filePath = path.join(__dirname, 'id.txt');
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log(`File ${filePath} đã được cập nhật.`);
        return true;
    } catch (error) {
        console.error('Lỗi ghi file:', error);
        return false;
    }
});
// Lắng nghe sự kiện "import-file"
ipcMain.handle('import-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            {name: 'Text Files', extensions: ['txt']},
            {name: 'All Files', extensions: ['*']},
        ],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return {success: false, message: 'No file selected'};
    }

    const filePath = result.filePaths[0];
    try {
        // Đọc nội dung file
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Trả nội dung file về Vue
        return {success: true, content: fileContent, filePath};
    } catch (error) {
        return {success: false, message: error.message};
    }
});


ipcMain.handle('create-profile', async (event, content, groupId, numberThreads, apiUrl) => {
    try {

        const responseGr = await axios.post(`${apiUrl}/api/v3/groups`);
        const resultGr = responseGr.data;
        const idGr = resultGr.data.find((item) => item.id === groupId);
        const nameGroup = idGr ? idGr.name : "Kháng Ads";

        const lines = content.split('\n').filter(line => line.trim() !== '');
        const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Tối đa 6 luồng chạy đồng thời
        const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS); // Tính vị trí cửa sổ

        const workerQueue = async (tasks, maxConcurrent) => {
            const results = [];
            const executing = [];

            for (const task of tasks) {
                const promise = task()
                    .then(result => {
                        results.push(result);
                        executing.splice(executing.indexOf(promise), 1);
                    })
                    .catch(error => {
                        results.push({success: false, error: error.message});
                        executing.splice(executing.indexOf(promise), 1);
                    });

                executing.push(promise);

                if (executing.length >= maxConcurrent) {
                    await Promise.race(executing); // Đợi một promise hoàn thành
                }
            }

            // Chờ tất cả các promise còn lại hoàn thành
            await Promise.all(executing);
            return results;
        };

        // Tạo danh sách tasks cho worker
        const tasks = lines.map((line, index) => () => new Promise((resolve, reject) => {

            const worker = new Worker(path.join(__dirname, 'worker-create-profile.js'), {
                workerData: {
                    line, nameGroup, apiUrl,
                    winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
                },
            });

            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', code => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        }));

        try {
            const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);

            // Xử lý kết quả từ các worker
            const failed = results.filter(r => !r.success);
            if (failed.length > 0) {
                console.error('Some tasks failed:', failed);
            }

            event.sender.send('update-profile-data', results);
            return {success: failed.length === 0};
        } catch (error) {
            console.error(error);
            return {success: false, message: error};
        }
    } catch (error) {
        log.error('Error in create-profile handler:', error); // Ghi lỗi vào file

        return {success: false, message: error};
    }

});

ipcMain.handle('open-profile', async (event, idProfile, apiUrl) => {
    try {
        const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${idProfile}`);
        if (startResponse.data.success) return {success: true, error: null};
        else return {success: false}
    } catch (error) {
    }
})

ipcMain.handle('close-profile', async (event, idProfile, apiUrl) => {
    try {
        const closeResponse = await axios.post(`${apiUrl}/api/v3/profiles/close/${idProfile}`);
        if (closeResponse.data.success) return {success: true, error: null};
    } catch (error) {
        console.error(error);
    }
})


ipcMain.handle('open-multiple-profile', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Giới hạn tối đa 5 luồng
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };
    const tasks = items.map(item => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'open-multiple-profile.js'), {
            workerData: {apiUrl}
        });

        // Lắng nghe kết quả từ worker
        worker.on('message', resolve);

        // Lắng nghe lỗi từ worker
        worker.on('error', reject);

        // Gửi dữ liệu tới worker
        worker.postMessage(item);
    }));
    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        return {success: true, data: results};
    } catch (error) {
        console.error("Error running workers:", error);
        return {success: false, error: error.message};
    }

})

const {screen} = require('electron');

const calculateWindowPositions = (numberThreads) => {
    const {width: screenWidth, height: screenHeight} = screen.getPrimaryDisplay().workAreaSize;

    // Tính số cột và số hàng
    const cols = Math.ceil(Math.sqrt(numberThreads)); // Số cột trong lưới
    const rows = Math.ceil(numberThreads / cols);    // Số hàng trong lưới

    // Tính kích thước cửa sổ (theo các cột và hàng đã tính)
    const windowWidth = Math.floor(screenWidth / cols);
    const windowHeight = Math.floor(screenHeight / rows);

    const positions = [];
    for (let i = 0; i < numberThreads; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Đảm bảo rằng các cửa sổ không bị tràn ra ngoài màn hình
        const x = col * windowWidth;
        const y = row * windowHeight;

        positions.push({
            x: x,
            y: y,
            width: windowWidth,
            height: windowHeight
        });
    }

    return positions;
};

ipcMain.handle('check-live', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Giới hạn tối đa 5 luồng
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS); // Tính vị trí cửa sổ

    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'worker-check-live.js'), {
            workerData: {
                apiUrl,
                numberThreads,
                totalTasks: items.length,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        // Lắng nghe kết quả từ worker
        worker.on('message', resolve);

        // Lắng nghe lỗi từ worker
        worker.on('error', reject);

        // Gửi dữ liệu tới worker
        worker.postMessage(item);
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        return {success: true, data: results};
    } catch (error) {
        console.error("Error running workers:", error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('ads-appeal', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5;
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-ads-appeal.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('ads-limit-appeal', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-ads-limit-appeal.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('share-account', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-share-account.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
});
ipcMain.handle('ads-reg', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-reg-ads.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
})

ipcMain.handle('only-reg', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-only-reg.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
})

ipcMain.handle('only-verify', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }

        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-only-verify.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
})
ipcMain.handle('auto-set-camp', async (event, dataJSON, numberThreads, apiUrl) => {
    const items = JSON.parse(dataJSON);
    const MAX_CONCURRENT_WORKERS = numberThreads || 5; // Mặc định 5 luồng nếu không truyền `numberThreads`
    const windowPositions = calculateWindowPositions(MAX_CONCURRENT_WORKERS);
    const workerQueue = async (tasks, maxConcurrent) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task()
                .then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(promise), 1);
                })
                .catch(error => {
                    results.push({success: false, error: error.message});
                    executing.splice(executing.indexOf(promise), 1);
                });

            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing); // Đợi một promise hoàn thành
            }
        }
        await Promise.all(executing); // Chờ tất cả các promise còn lại hoàn thành
        return results;
    };

    // Tạo danh sách tasks cho worker
    const tasks = items.map((item, index) => () => new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'worker-auto-set-camp.js'), {
            workerData: {
                item, apiUrl,
                winPos: windowPositions[index % MAX_CONCURRENT_WORKERS] // Truyền vị trí vào worker
            }
        });

        worker.on('message', (result) => {
            event.sender.send('update-profile-data');
            resolve(result);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error.message}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    }));

    try {
        const results = await workerQueue(tasks, MAX_CONCURRENT_WORKERS);
        // Trả về kết quả từ tất cả các worker
        return {success: true, results};
    } catch (error) {
        console.error('Error during worker execution:', error);
        return {success: false, error: error.message};
    }
})


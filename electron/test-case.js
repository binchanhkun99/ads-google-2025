const {parentPort, workerData} = require('worker_threads');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const {item, apiUrl, winPos} = workerData;

(async () => {
    const emailMatch = item.name.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/);
    const nameProfile = emailMatch ? emailMatch[0] : "";

    try {
        // Gửi request cập nhật hồ sơ
        await axios.post(`${apiUrl}/api/v3/profiles/update/${item.id}`, {
            profile_name: nameProfile + " " + "Pending",
        });

        // Gửi request bắt đầu
        const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${item.id}?win_pos=${winPos.x},${winPos.y}&win_size=${winPos.width},${winPos.height}`);
        if (startResponse.status === 200) {
            await processVeri(
                startResponse.data.data.driver_path,
                startResponse.data.data.remote_debugging_address,
                item.id,
                item.name
            );
        }

        parentPort.postMessage({success: true, id: item.id});
    } catch (error) {
        parentPort.postMessage({success: false, id: item.id, error: error.message});
    }
})();
async function processVeri(driverPath, remoteDebuggingAddress, profileId, user) {
    const filePath = path.join(__dirname, 'setup-reg.txt');
    if (!fs.existsSync(filePath)) {
        throw new Error("Missing setup-reg.txt");
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').map(line => line.trim());
    const formData = {
        exampleWebsite: lines[0] || '',
        exampleBillingCountry: lines[1] || '',
        exampleCurrency: lines[2] || '',
        exampleProfileType: lines[3] || 'Organization',
        exampleOrganizationName: lines[4] || '',
        exampleLegalName: lines[5] || '',
        exampleZipcode: lines[6] || '',
        exampleNumberCard: lines[7] || '',
        exampleNameHolder: lines[8] || '',
        exampleSecurityCode: lines[9] || '',
        exampleMM: lines[10] || '',
        exampleYY: lines[11] || '',
        exampleMessagingApp: lines[12] || '',
        exampleAdvertisingAgenCy: lines[13] || '',
        exampleAddress: lines[14] || '',
        exampleCity: lines[15] || '',
        exampleState: lines[16] || '',
        exampleZipCode2: lines[17] || '',
        exampleOrganizationAds: lines[18] || '',
        exampleWantVerifyToday: lines[19] || '',
        exampleAgencyPayFor: lines[20] || '',
        exampleWhoPayFor: lines[21] || '',

    };
    let driver;
    let updateStatus = "Success";
    try{
        const debugPort = remoteDebuggingAddress.split(":")[1];
        const options = new chrome.Options();

        options.setChromeBinaryPath(driverPath);
        options.addArguments(
            '--no-sandbox',
            '--remote-debugging-port=' + debugPort,
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-popup-blocking',
            '--disable-translate',
            '--lang=en'
        );

        const service = new chrome.ServiceBuilder(driverPath);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();
        await driver.sleep(1000)

        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.manage().addCookie({
            name: 'AdsUserLocale',
            value: 'en',
            domain: '.ads.google.com',
            path: '/',
            secure: true,
            sameSite: 'Strict'
        });
        // Tải lại trang để cookie có hiệu lực
        await driver.executeScript("location.reload()")
        await driver.sleep(450000);


    }catch(error){
        console.log(error);
    }
    finally {
        if (profileId) {
            try {
                const emailMatch = user.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/); // Biểu thức chính quy tìm kiếm địa chỉ email
                const email = emailMatch ? emailMatch[0] : ""; // Lấy địa chỉ email nếu tìm thấy, nếu không thì gán rỗng
                const closeResponse = await axios.post(`${apiUrl}/api/v3/profiles/close/${profileId}`);
                const updateResponse = await axios.post(`${apiUrl}/api/v3/profiles/update/${profileId}`, {
                    profile_name: email + " " + updateStatus,
                });

                if (closeResponse.status === 200) {
                    console.log(`Profile ${profileId} closed successfully.`);
                } else {
                    console.error(`Failed to close profile ${profileId}. Response:`, closeResponse.data);
                }
            } catch (apiError) {
                console.error(`Error closing profile ${profileId}:`, apiError.message);
            }
        }
    }


}
async function waitForElementOrTimeoutReg(driver, xpath, interval = 1000, timeout = 6000) {
    let elapsedTime = 0;
    let foundElements = [];

    while (elapsedTime < timeout) {
        foundElements = await driver.findElements(By.xpath(xpath));
        if (foundElements.length > 0) {
            return foundElements; // Trả về nếu tìm thấy phần tử
        }

        await driver.sleep(interval); // Chờ một khoảng thời gian trước khi thử lại
        elapsedTime += interval;
    }
    return null; // Trả về kết quả cuối cùng (rỗng nếu không tìm thấy)
}
async function enterTextIntoInput(driver, element, text) {
    try {
        // Xóa dữ liệu cũ nếu có

        await element.clear();

        // Chờ đến khi ô input sẵn sàng để tương tác
        await driver.wait(until.elementIsVisible(element), 10000);  // Chờ tối đa 10 giây

        // Nhập liệu an toàn với việc gửi từng ký tự
        for (let i = 0; i < text.length; i++) {
            await element.sendKeys(text[i]);  // Gửi từng ký tự
            await driver.sleep(100); // Tạm dừng giữa các ký tự (100ms), có thể điều chỉnh nếu cần
        }

        console.log(`Text "${text}" đã được nhập an toàn vào ô input.`);
    } catch (error) {
        console.error('Error while entering text into input:', error.message);
    }
}

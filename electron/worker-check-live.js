const {parentPort, workerData} = require('worker_threads');
const axios = require('axios');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Hàm chờ tìm element với timeout
const waitForElementOrTimeout = async (driver, xpath, timeout = 5000) => {
    try {
        const element = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout);
        return element;
    } catch (e) {
        return null;
    }
};

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
const {apiUrl, winPos} = workerData
// Hàm chính trong worker
const checkProfile = async (item) => {
    let result = {id: item.id, email: item.name, status: "Pending", data: []};
    let driver = null;

    try {
        const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${item.id}?win_pos=${winPos.x},${winPos.y}&win_size=${winPos.width},${winPos.height}`);
        const emailMatch = item.name.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/);
        const email = emailMatch ? emailMatch[0] : "";
        // Cập nhật trạng thái ban đầu
        await axios.post(`${apiUrl}/api/v3/profiles/update/${item.id}`, {
            profile_name: `${email} Pending`,
        });

        const options = new chrome.Options();
        options.setChromeBinaryPath(startResponse.data.data.driver_path);
        const debugPort = startResponse.data.data.remote_debugging_address.split(":")[1];
        options.addArguments(
            '--no-sandbox',
            `--remote-debugging-port=${debugPort}`,
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-popup-blocking',
            '--disable-translate'
        );

        const service = new chrome.ServiceBuilder(startResponse.data.data.driver_path);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();


        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.sleep(2000)
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

        await driver.sleep(5000);

        const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
        for (let i = 0; i < ElmListAccount.length; i++) {
            const spanElement = await driver.findElement(By.xpath(`(//material-list-item[contains(@class, "user-customer-list-item")])[${i + 1}]/span[1]`));
            const spanValue = await spanElement.getText();
            let account = {id: spanValue, status: "active"};

            const btnSelect = await driver.findElement(By.xpath(`(//material-list-item[contains(@class, "user-customer-list-item")])[${i + 1}]`));
            await btnSelect.click();
            await driver.sleep(5000);

            const isBanAds = await waitForElementOrTimeoutReg(driver, '//div[contains(@class, "notification-container") and contains(@class, "red-bar") and .//span[text()="Your account is suspended"]]', 1000, 4000);
            const isInactive = await waitForElementOrTimeoutReg(driver, '//div[contains(@class, "notification-container") and contains(@class, "red-bar") and .//span[text()="Your account isn\'t active"]]', 1000, 3000);
            if (isBanAds || isInactive) {
                account.status = "inactive";
            } else account.status = "active";

            result.data.push(account);
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(5000);
        }

        result.status = "Success";
    } catch (error) {
        console.log(error);
        result.status = "Error";
        result.error = error.message;
    } finally {
        if (driver) {
            try {
                await driver.quit();
            } catch {
            }
        }

        // Cập nhật trạng thái cuối cùng
        try {
            await axios.post(`${apiUrl}/api/v3/profiles/close/${item.id}`);
            const emailMatch = item.name.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/);
            const email = emailMatch ? emailMatch[0] : "";
            await axios.post(`${apiUrl}/api/v3/profiles/update/${item.id}`, {
                profile_name: `${email} ${result.status}`,
            });
        } catch (updateError) {
            console.error("Error updating profile status:", updateError.message);
        }
    }

    return result;
};

// Lắng nghe tin nhắn từ luồng chính
parentPort.on('message', async (item) => {
    const result = await checkProfile(item);
    parentPort.postMessage(result);
});

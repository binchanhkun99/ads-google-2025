const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function waitForElementOrTimeout(driver, xpath, interval = 1000, timeout = 6000) {
    let elapsedTime = 0;
    let foundElements = [];

    while (elapsedTime < timeout) {
        foundElements = await driver.findElements(By.xpath(xpath));
        if (foundElements.length > 0) {
            return true; // Trả về nếu tìm thấy phần tử
        }

        await driver.sleep(interval); // Chờ một khoảng thời gian trước khi thử lại
        elapsedTime += interval;
    }
    return null; // Trả về kết quả cuối cùng (rỗng nếu không tìm thấy)
}

const { apiUrl, winPos } = workerData;
// Hàm chính trong worker
const checkProfile = async (item) => {
    let result = { id: item.id, email: item.name, status: "Pending", data: [] };
    let driver;

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
            '--disable-translate',
            '--disable-application-cache', // Tắt cache ứng dụng
            '--disable-cache', // Tắt cache
            '--disk-cache-size=0', // Đặt kích thước cache trên ổ đĩa về 0
            '--media-cache-size=0' // Đặt kích thước cache media về 0
        );

        const service = new chrome.ServiceBuilder(startResponse.data.data.driver_path);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();

        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.sleep(2000);
        // Lấy handle của tab hiện tại
        let originalTab = await driver.getWindowHandle();

        // Mở một tab mới
        await driver.switchTo().newWindow('tab');

        // Mở một trang web khác trong tab mới
        await driver.get("https://ads.google.com/nav/selectaccount");

        // Lấy danh sách tất cả các tab đang mở
        let handles = await driver.getAllWindowHandles();

        // Chuyển về tab cũ
        await driver.switchTo().window(originalTab);

        // Đóng tab cũ
        await driver.close();

        // Chuyển về tab mới (tab còn lại)
        await driver.switchTo().window(handles[1]);
        await driver.sleep(2000);

        await driver.manage().addCookie({
            name: 'AdsUserLocale',
            value: 'en',
            domain: '.ads.google.com',
            path: '/',
            secure: true,
            sameSite: 'Strict'
        });
        // Tải lại trang để cookie có hiệu lực
        await driver.executeScript("location.reload()");
        await driver.sleep(5000);

        const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
        for (let i = 0; i < ElmListAccount.length; i++) {
            const spanElement = await driver.findElement(By.xpath(`(//material-list-item[contains(@class, "user-customer-list-item")])[${i + 1}]/span[1]`));
            const spanValue = await spanElement.getText();
            let account = { id: spanValue, status: "active" }; // Khởi tạo account

            const btnSelect = await driver.findElement(By.xpath(`(//material-list-item[contains(@class, "user-customer-list-item")])[${i + 1}]`));
            await btnSelect.click();
            await driver.sleep(5000);

            // Kiểm tra ngay từ đầu xem tài khoản đã bị suspend chưa
            const initialBanCheck = await waitForElementOrTimeout(
                driver,
                '//div[contains(@class, "notification-container") and contains(@class, "red-bar") and .//span[text()="Your account is suspended"]]',
                1000,
                4000
            );
            if (initialBanCheck) {
                account.status = "inactive"; // Nếu đã suspend từ đầu, set inactive và không click
            } else {
                // Chỉ click nếu chưa bị suspend từ đầu
                while (true) {
                    const buttonXPath = '(//material-button[contains(@class, "nav-button")])[2]';
                    await waitForElementOrTimeout(driver, buttonXPath, 1000, 50000);
                    const button = await driver.findElement(By.xpath(buttonXPath));

                    const isDisabled = await button.getAttribute('disabled');
                    if (isDisabled === 'true' || isDisabled === true) {
                        console.log('Button is disabled, stopping process');
                        break;
                    }
                    await button.click();
                    await driver.sleep(2000);

                    const isBanAds = await waitForElementOrTimeout(
                        driver,
                        '//div[contains(@class, "notification-container") and contains(@class, "red-bar") and .//span[text()="Your account is suspended"]]',
                        1000,
                        4000
                    );
                    console.log(isBanAds);
                    // Cập nhật trạng thái cuối cùng cho account
                    account.status = isBanAds ? "inactive" : "active";
                    if (isBanAds) {
                        console.log('Account is suspended, stopping clicks');
                        break; // Dừng click ngay nếu phát hiện inactive
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Đẩy account vào result.data sau khi kiểm tra xong
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

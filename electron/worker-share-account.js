const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Builder, By, Key, until, Actions } = require('selenium-webdriver'); // Thêm Actions
const chrome = require('selenium-webdriver/chrome');
const { item, apiUrl, winPos } = workerData;

(async () => {
    const emailMatch = item.name.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/);
    const nameProfile = emailMatch ? emailMatch[0] : "";
    try {
        await axios.post(`${apiUrl}/api/v3/profiles/update/${item.id}`, {
            profile_name: nameProfile + " " + "Pending",
        });
        const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${item.id}?win_pos=${winPos.x},${winPos.y}&win_size=${winPos.width},${winPos.height}`);
        if (startResponse.status === 200) {
            await processShareAccount(
                startResponse.data.data.driver_path,
                startResponse.data.data.remote_debugging_address,
                item.id,
                item.name,
                item
            );
        }
        parentPort.postMessage({ success: true, id: item.id });
    } catch (error) {
        parentPort.postMessage({ success: false, id: item.id, error: error.message });
    }
})();
async function processShareAccount(driverPath, remoteDebuggingAddress, profileId, user) {
    const filePath = path.join(__dirname, 'setup-share-account.txt');
    if (!fs.existsSync(filePath)) {
        throw new Error("Missing setup-share-account.txt");
    }
    const formData = fs.readFileSync(filePath, 'utf-8')
        .split("\n")
        .map(email => email.trim())
        .filter(email => email !== "");

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
            '--disable-application-cache',
            '--disable-cache',
            '--disk-cache-size=0',
            '--media-cache-size=0'
        );
        const service = new chrome.ServiceBuilder(driverPath);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();

        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.sleep(1500);

        let originalTab = await driver.getWindowHandle();
        await driver.switchTo().newWindow('tab');
        await driver.get("https://ads.google.com/nav/selectaccount");
        let handles = await driver.getAllWindowHandles();
        await driver.switchTo().window(originalTab);
        await driver.close();
        await driver.switchTo().window(handles[1]);
        await driver.sleep(2000);

        const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
        if (ElmListAccount.length <= 0) {
            await axios.post(`${apiUrl}/api/v3/profiles/close/${profileId}`);
            return;
        }

        let listAccountBanned = [];
        for (let i = 0; i < ElmListAccount.length; i++) {
            const currentElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
            const currentAccountElement = currentElmListAccount[i];
            const spanElement = await currentAccountElement.findElement(By.xpath('./span[1]'));
            let spanValue = await spanElement.getText();
            listAccountBanned.push(spanValue);
            await driver.sleep(3000);

            await currentAccountElement.click();
            await driver.sleep(4000);
            await driver.manage().addCookie({
                name: 'AdsUserLocale',
                value: 'en',
                domain: '.ads.google.com',
                path: '/',
                secure: true,
                sameSite: 'Strict'
            });
            await driver.executeScript("location.reload()");
            await driver.sleep(1000);

            const isBanAds = await waitForElementOrTimeout(driver, '//div[contains(@class, "notification-container") and contains(@class, "red-bar") and .//span[contains(text(), "Your account is suspended")]]');
            if (isBanAds) {
                console.log(`Tài khoản ${spanValue} bị cấm.`);
                listAccountBanned.pop();
            } else {
                console.log(`Tài khoản ${spanValue} vẫn hoạt động.`);
            }
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(5000);
        }
        const actions = driver.actions({ async: true }); // Khởi tạo Actions
        for (let item of listAccountBanned) {
            await waitForElementOrTimeout(driver, `//material-list-item[contains(@class, "user-customer-list-item") and .//span[text()='${item}']]`);
            const xpathFirst = await driver.findElement(By.xpath(`//material-list-item[contains(@class, "user-customer-list-item") and .//span[text()='${item}']]`));
            await xpathFirst.click();
            await driver.sleep(4500);
            await driver.manage().addCookie({
                name: 'AdsUserLocale',
                value: 'en',
                domain: '.ads.google.com',
                path: '/',
                secure: true,
                sameSite: 'Strict'
            });
            await driver.sleep(2000);

            await driver.executeScript("location.reload()");
            await driver.sleep(2000);

            const settingsLinkXpath = "//a[contains(@href, '/aw/settings/')]"
            const settingsLinkBtn = await driver.findElement(By.xpath(settingsLinkXpath));
            await driver.executeScript("arguments[0].click();", settingsLinkBtn);
            await driver.sleep(2000);
            const accessAndSecurityXpath = "//sidebar-panel[.//div[contains(text(), 'Access and security')]]"
            const accessAndSecurityBtn = await driver.findElement(By.xpath(accessAndSecurityXpath));
            await driver.executeScript("arguments[0].click();", accessAndSecurityBtn);
            await driver.sleep(3000);

            // bắt đầu for ở đây
            for (let email of formData) {
                const checkAddUser = await waitForElementOrTimeout(driver, "//material-fab[@aria-label='Add user']");
                if (checkAddUser) {
                    const addUserXpath = "//material-fab[@aria-label='Add user']";
                    const addUserBtn = await driver.findElement(By.xpath(addUserXpath));
                    await driver.executeScript("arguments[0].click();", addUserBtn);
                    await driver.sleep(2000);

                    const inputXpath = "//material-dialog//label/input";
                    await driver.executeScript(`
            const element = document.evaluate("${inputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        `);
                    await driver.sleep(2000);
                    const inputElement = await driver.findElement(By.xpath(inputXpath));
                    await enterTextIntoInput(driver, inputElement, email); // Nhập email vào ô input

                    // Chọn quyền admin
                    const xpathRadioAdmin = "(//material-radio)[5]";
                    const radioAdminBtn = await driver.findElement(By.xpath(xpathRadioAdmin));
                    await driver.executeScript("arguments[0].click();", radioAdminBtn);
                    await driver.sleep(2000);

                    // Gửi lời mời
                    const sendInviteXpath = "//material-button[.//div[text()='Send invitation']]";
                    await driver.executeScript(`
            const element = document.evaluate("${sendInviteXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        `);
                    await driver.sleep(2000);
                    const sendInviteBtn = await driver.findElement(By.xpath(sendInviteXpath));
                    await driver.executeScript("arguments[0].click();", sendInviteBtn);
                    await driver.sleep(2000);
                } else {
                    updateStatus = "Error";
                    return;
                }
            }
        }

    }catch (error) {
        console.log(error);
        updateStatus = "Error"

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


async function waitForElementOrTimeout(driver, xpath, interval = 1000, timeout = 6000) {
    let elapsedTime = 0;
    while (elapsedTime < timeout) {
        const foundElements = await driver.findElements(By.xpath(xpath));
        if (foundElements.length > 0) {
            return foundElements;
        }
        await driver.sleep(interval);
        elapsedTime += interval;
    }
    return null;
}

async function enterTextIntoInput(driver, element, text) {
    try {
        await element.clear();
        await driver.wait(until.elementIsVisible(element), 10000);
        for (let i = 0; i < text.length; i++) {
            await element.sendKeys(text[i]);
            await driver.sleep(100);
        }
        console.log(`Text "${text}" đã được nhập an toàn vào ô input.`);
    } catch (error) {
        console.error('Error while entering text into input:', error.message);
    }
}

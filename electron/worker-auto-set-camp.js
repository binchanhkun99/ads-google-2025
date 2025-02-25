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
            await processSetCamp(
                startResponse.data.data.driver_path,
                startResponse.data.data.remote_debugging_address,
                item.id,
                item.name
            );
        }
        parentPort.postMessage({ success: true, id: item.id });
    } catch (error) {
        parentPort.postMessage({ success: false, id: item.id, error: error.message });
    }
})();

async function processSetCamp(driverPath, remoteDebuggingAddress, profileId, user) {
    let driver;
    let updateStatus = "Success";
    try {
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
            exampleMessagingApp: lines[12] || '',
            exampleAdvertisingAgenCy: lines[13] || '',
            exampleCity: lines[15] || '',
            exampleState: lines[16] || '',
            exampleZipCode2: lines[17] || '',
            exampleOrganizationAds: lines[18] || '',
            exampleWantVerifyToday: lines[19] || '',
            exampleAgencyPayFor: lines[20] || '',
            exampleWhoPayFor: lines[21] || '',
        };

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

            const campaignsBtnCreateXPath = "(//material-fab[@role='button' and @aria-disabled='false'])[2]";
            const checkCanCreateCamp = await waitForElementOrTimeout(driver, campaignsBtnCreateXPath, 1000, 10000);
            if(!checkCanCreateCamp) {
                updateStatus = "Error"
                return;
            }

            //Click tạo mới chiến dịch
            const campaignsCreateBtn = await driver.findElement(By.xpath(campaignsBtnCreateXPath));
            await driver.executeScript(`
                        const element = document.evaluate("${campaignsBtnCreateXPath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript("arguments[0].click();", campaignsCreateBtn);
            await driver.sleep(1000);

            const campaignsBtnConfirmCreateXPath = "//material-select-item[@aria-label=\"New campaign\"]";
            const campaignsConfirmCreateBtn = await driver.findElement(By.xpath(campaignsBtnConfirmCreateXPath));
            await actions.move({ origin: campaignsConfirmCreateBtn }).click().perform();
            await driver.sleep(2000);

            await driver.sleep(10000);
            await driver.get("https://ads.google.com/nav/selectaccount");
        }
        //Merge vào nhánh dev để lấy code set camp của Tuấn
    } catch (error) {
        console.log(error);
        updateStatus = "Error";
    } finally {
        if (driver) {
            await driver.quit();
        }
        if (profileId) {
            try {
                const emailMatch = user.match(/^[^@\s]+@[^@\s]+\.[^@\s]+/);
                const email = emailMatch ? emailMatch[0] : "";
                console.log("EMAIL__________________", email);
                const closeResponse = await axios.post(`${apiUrl}/api/v3/profiles/close/${profileId}`);
                const updateResponse = await axios.post(`${apiUrl}/api/v3/profiles/update/${profileId}`, {
                    profile_name: email + " " + updateStatus,
                });
                if (closeResponse.status === 200) {
                    console.log(`Profile ${profileId} closed successfully.`);
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

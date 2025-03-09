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
                item.name,
                item
            );
        }
        parentPort.postMessage({ success: true, id: item.id });
    } catch (error) {
        parentPort.postMessage({ success: false, id: item.id, error: error.message });
    }
})();

async function processSetCamp(driverPath, remoteDebuggingAddress, profileId, user, data) {
    let driver;
    let updateStatus = "Success";
    try {

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

            const campaignsBtnCreateXPath = "(//material-fab[@role='button' and @aria-disabled='false'])[2]";
            const campaignsBtnCreateXPath2 = "//button[@aria-label='New campaign']";

            const checkCanCreateCamp = await waitForElementOrTimeout(driver, campaignsBtnCreateXPath, 1000, 6000);
            const checkCanCreateCamp2 = await waitForElementOrTimeout(driver, campaignsBtnCreateXPath2, 1000, 6000);

            if(checkCanCreateCamp) {
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

                const campaignsBtnConfirmCreateXPath = "//material-select-item[@aria-label='New campaign']";
                const campaignsConfirmCreateBtn = await driver.findElement(By.xpath(campaignsBtnConfirmCreateXPath));
                await actions.move({ origin: campaignsConfirmCreateBtn }).click().perform();
                await driver.sleep(4000);
                //Click skip
                const skipXpath = "//button[.//span[contains(text(), 'Skip')]]";
                await driver.executeScript(`
                        const element = document.evaluate("${skipXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
                await driver.sleep(4000);

                const skipBtn = await driver.findElement(By.xpath(skipXpath));
                await driver.executeScript("arguments[0].click();", skipBtn);
                await driver.sleep(2000);
            }
            else if(checkCanCreateCamp2){
                //Click tạo mới chiến dịch
                const campaignsCreateBtn2 = await driver.findElement(By.xpath(campaignsBtnCreateXPath2));
                await driver.executeScript(`
                        const element = document.evaluate("${campaignsBtnCreateXPath2}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
                await driver.executeScript("arguments[0].click();", campaignsCreateBtn2);
                await driver.sleep(1000);

                const campaignsBtnConfirmCreateXPath = "//material-select-item[@aria-label=\"New campaign\"]";
                const checkCampaignsBtnConfirmCreateXPath = await waitForElementOrTimeout(driver, campaignsBtnConfirmCreateXPath, 1000, 6000);
                if(checkCampaignsBtnConfirmCreateXPath){
                    const campaignsConfirmCreateBtn = await driver.findElement(By.xpath(campaignsBtnConfirmCreateXPath));
                    await actions.move({ origin: campaignsConfirmCreateBtn }).click().perform();
                    await driver.sleep(2000);
                }
            }
            else {
                updateStatus = "Error"
                return;
            }


            const checkPanelXpath = '//material-button[contains(@aria-label, "Close Quick help panel")]'
            const checkPanel = await waitForElementOrTimeout(driver, '//material-button[contains(@aria-label, "Close Quick help panel")]', 1000, 4000);
            if (checkPanel) {
                const checkPanelBtn = await driver.findElement(By.xpath(checkPanelXpath));
                await driver.executeScript("arguments[0].click();", checkPanelBtn);
                await driver.sleep(1000);
            }

            // Bấm vào Create a campaign without guidance
            await waitForElementOrTimeout(driver, "//selection-card[.//span[contains(text(), 'Create a campaign without guidance')]]", 1000, 5000);
            const selectCreateCampaignXpath = "//selection-card[.//span[contains(text(), 'Create a campaign without guidance')]]";
            await driver.executeScript(`
                        const element = document.evaluate("${selectCreateCampaignXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(3000);
            await driver.executeScript(`
            let xpath = "${selectCreateCampaignXpath}";
            let result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            let element = result.singleNodeValue;
            if (element) {
                element.click();
            } else {
                throw new Error("Không tìm thấy phần tử với XPath: " + xpath);
            }
        `);
            await driver.sleep(2000);

            // Bấm vào tạo chiến dịch video
            const videoCreateCampaignXpath = "//selection-card[.//span[normalize-space(text())='Video']]";
            const checkLabelVideo = await waitForElementOrTimeout(driver, videoCreateCampaignXpath, 1000, 3000)
            if (checkLabelVideo) {
                await driver.executeScript(`
                        const element = document.evaluate("${videoCreateCampaignXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
                await driver.sleep(3000);
                await driver.executeScript(`
            let xpath = "${videoCreateCampaignXpath}";
            let result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            let element = result.singleNodeValue;
            if (element) {
                element.click();
            } else {
                throw new Error("Không tìm thấy phần tử với XPath: " + xpath);
            }
        `);
                await driver.sleep(2000);
            }
            else {
                const videoCreateCampaignXpathB = "//selection-card[.//div[normalize-space(text())='Video']]";

                await driver.executeScript(`
                        const element = document.evaluate("${videoCreateCampaignXpathB}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
                await driver.sleep(3000);
                await driver.executeScript(`
            let xpath = "${videoCreateCampaignXpathB}";
            let result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            let element = result.singleNodeValue;
            if (element) {
                element.click();
            } else {
                throw new Error("Không tìm thấy phần tử với XPath: " + xpath);
            }
        `);
                await driver.sleep(2000);
            }



            // Bấm vào continue
            const continueCreateCampaignXpath = "//material-button[@aria-label='Continue to the next step']";
            await driver.executeScript(`
                        const element = document.evaluate("${continueCreateCampaignXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(3000);
            const continueCampaignBtn = await driver.findElement(By.xpath(continueCreateCampaignXpath));
            await driver.executeScript("arguments[0].click();", continueCampaignBtn);
            await driver.sleep(2000);

            if (data.excelConfig?.campaignName){
                await waitForElementOrTimeout(driver, '//input[@aria-label="Campaign name"]')
                const campaignNameInputXpath = "//input[@aria-label='Campaign name']";
                await driver.executeScript(`
                        const element = document.evaluate("${campaignNameInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
                await driver.sleep(2000);
                const campaignNameInput = await driver.wait(until.elementLocated(By.xpath(campaignNameInputXpath)), 2000);

                await enterTextIntoInput(driver, campaignNameInput, data.excelConfig.campaignName);
                await driver.sleep(2000);
            }


            const scrollToBudgetTypeXpath = "//div[text()='Enter budget type and amount']"
            await driver.executeScript(`
                        const element = document.evaluate("${scrollToBudgetTypeXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(2000);
            let xPathBtnBudgetType = "//budget-and-dates/expansion-panel/material-expansionpanel/div/div[2]/div/div[1]/div/div/div/section/div/div[2]/div[1]/material-dropdown-select/dropdown-button/div";

            // Tìm phần tử bằng XPath
            const BtnBudgetType = await driver.findElement(By.xpath(xPathBtnBudgetType));

            // Cuộn phần tử vào khung nhìn nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", BtnBudgetType);

            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", BtnBudgetType);

            let xPathBudgetType = `//material-select-dropdown-item[.//span[text()='${data.excelConfig.budgetType}']]`;

            await driver.executeScript(`
    const element = document.evaluate(
        "${xPathBudgetType}",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    if (element) {
        element.click();
        console.log("Đã click vào phần tử");
    } else {
        console.error("Không tìm thấy phần tử theo XPath đã cung cấp.");
    }
`);
            await driver.sleep(3000);
            const budgetMoneyInputXpath = "//material-expansionpanel/div/div[2]/div/div[1]/div/div/div/section/div/div[2]/div[2]/money-input/mask-money-input/material-input/div[1]/div[1]/label/input";


            const budgetMoneyInputElement = await driver.findElement(By.xpath(budgetMoneyInputXpath));
            await budgetMoneyInputElement.sendKeys(data.excelConfig.budgetMoney);
            await driver.sleep(2000);

            const locationXpath = `//material-radio[.//div[text()='${data.excelConfig.locationCampaign}']]`;
            await driver.executeScript(`
                        const element = document.evaluate("${locationXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(3000);
            const locationSelectBtn = await driver.findElement(By.xpath(locationXpath));
            await locationSelectBtn.click();
            await driver.sleep(2000);

            const SearchYTBLinkInputXpath = "//input[@aria-label='Search for a video or paste the URL from YouTube']";
            await driver.executeScript(`
                        const element = document.evaluate("${SearchYTBLinkInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);

            await driver.sleep(2000);
            const inputElement = await driver.findElement(By.xpath(SearchYTBLinkInputXpath));
            await inputElement.sendKeys(data.excelConfig.urlVideo);
            await driver.sleep(5000);


            const finalLinkInputXpath = "//span[text()='Final URL']/ancestor::label/input";
            await driver.executeScript(`
                        const element = document.evaluate("${finalLinkInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);

            await driver.sleep(2000);
            const finalLinkElement = await driver.findElement(By.xpath(finalLinkInputXpath));
            await finalLinkElement.sendKeys(data.excelConfig.urlVideo);
            await driver.sleep(5000);



            const longHeadlineInputXpath = "//input[@aria-label='Long headline']";
            await driver.executeScript(`
                        const element = document.evaluate("${longHeadlineInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(2000);
            const longHeadlineInput = await driver.wait(until.elementLocated(By.xpath(longHeadlineInputXpath)), 2000);
            await enterTextIntoInput(driver, longHeadlineInput, data.excelConfig.longHeadline);
            await driver.sleep(2000);

            const descriptionInputXpath = "//input[@aria-label='Description']";
            await driver.executeScript(`
                        const element = document.evaluate("${descriptionInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(2000);
            const descriptionInput = await driver.wait(until.elementLocated(By.xpath(descriptionInputXpath)), 2000);
            await enterTextIntoInput(driver, descriptionInput, data.excelConfig.description);
            await driver.sleep(2000);

            const targetInputXpath = "//input[contains(@aria-label, 'Target CPV bid in')]";
            await driver.executeScript(`
                        const element = document.evaluate("${targetInputXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(2000);
            const targetInputElement = await driver.findElement(By.xpath(targetInputXpath));
            await targetInputElement.sendKeys(data.excelConfig.targetCPV);
            await driver.sleep(2000);

            const campaignsBtnCreateFinalXPath = "//material-button[.//div[text()='Create campaign']]"
            const campaignsCreateFinalBtn = await driver.findElement(By.xpath(campaignsBtnCreateFinalXPath));
            await driver.executeScript(`
                        const element = document.evaluate("${campaignsBtnCreateFinalXPath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript("arguments[0].click();", campaignsCreateFinalBtn);
            await driver.sleep(3000);

            const checkSuccess = await waitForElementOrTimeout(driver, "//div[text()='Congratulations! Your campaign is ready.']")
            if (!checkSuccess) {
                updateStatus = "Error"
            }
            await driver.sleep(5000);
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(4000);

        }


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
            await driver.sleep(3000);

            await waitForElementOrTimeout(driver, "//navigation-drawer-item[.//div[text()='Campaigns']]");
            const dropdownCampXpath = "//navigation-drawer-item[.//div[text()='Campaigns']]"
            const dropDownCampaignBtn = await driver.findElement(By.xpath(dropdownCampXpath));
            await driver.executeScript("arguments[0].click();", dropDownCampaignBtn);
            await driver.sleep(2000);
            const childCampXpath = "(//sidebar-panel[.//div[text()='Campaigns']])[2]"
            const childCampaignBtn = await driver.findElement(By.xpath(childCampXpath));
            await driver.executeScript("arguments[0].click();", childCampaignBtn);
            await driver.sleep(2000);


            await waitForElementOrTimeout(driver, "//mat-checkbox[@aria-label='Select all rows']");
            // Bấm vào chọn tất cả----------------------
            const checkAllBtnXpath = "//mat-checkbox[@aria-label='Select all rows']"
            const checkAllBtn = await driver.findElement(By.xpath(checkAllBtnXpath));
            await driver.executeScript(`
                        const element = document.evaluate("${checkAllBtnXpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript("arguments[0].click();", checkAllBtn);
            await driver.sleep(1000);

            // Bâm vào Edit-------------------------
            const editBtnXpath = "//material-button[@aria-label='Bulk edit']"
            const editBtn = await driver.findElement(By.xpath(editBtnXpath));
            await driver.executeScript("arguments[0].click();", editBtn);
            await driver.sleep(1500);

            // Bấm vào tạm dừng-------------------------
            const pauseBtnXpath = "//material-select-item[.//span[text()='Pause']]"
            const pauseBtn = await driver.findElement(By.xpath(pauseBtnXpath));
            await driver.executeScript("arguments[0].click();", pauseBtn);
            await driver.sleep(4000);
        }

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

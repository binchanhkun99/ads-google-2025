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
            await processLimitAppeal(
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
async function processLimitAppeal(driverPath, remoteDebuggingAddress, profileId, user) {
    const filePath = path.join(__dirname, 'setup-limit.txt');
    if (!fs.existsSync(filePath)) {
        throw new Error("Missing setup.txt");
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').map(line => line.trim());
    const formDataLimit = {
        exampleCompanyNameLimit: lines[0] || '',
        examplePrefixPhoneNumberLimit: lines[1] || '',
        examplePhoneNumberLimit: lines[2] || '',
        exampleWebsiteLimit: lines[3] || '',
        exampleAddressLimit: lines[4] || '',
        exampleZipCodeLimit: lines[5] || '',
        exampleCityLimit: lines[6] || '',
        exampleBillingCountryLimit: lines[7] || '',
        exampleYourOwnBusinessLimit: lines[8] || '',
        examplePrimaryPaymentMethodLimit: lines[9] || '',
        exampleDatePaymentMethodLimit: lines[10] || '',
        exampleBusinessServeLimit: lines[11] || '',
        exampleDescriptionBusinessLimit: lines[12] || '',
        exampleJustificationLimit: lines[13] || '',
        exampleProblemSummaryLimit: lines[14] || '',
        exampleLinkImageLimit: lines[15] || ''

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
            '--disable-application-cache', // Tắt cache ứng dụng
            '--disable-cache', // Tắt cache
            '--disk-cache-size=0', // Đặt kích thước cache trên ổ đĩa về 0
            '--media-cache-size=0' // Đặt kích thước cache media về 0
        );

        const service = new chrome.ServiceBuilder(driverPath);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();
        await driver.get("https://support.google.com/google-ads/contact/daily_spend_limit_incr_req");
        await driver.sleep(1500);
        // Lấy handle của tab hiện tại
        let originalTab = await driver.getWindowHandle();

        // Mở một tab mới
        await driver.switchTo().newWindow('tab');

        // Mở một trang web khác trong tab mới
        await driver.get("https://support.google.com/google-ads/contact/daily_spend_limit_incr_req");

        // Lấy danh sách tất cả các tab đang mở
        let handles = await driver.getAllWindowHandles();

        // Chuyển về tab cũ
        await driver.switchTo().window(originalTab);

        // Đóng tab cũ
        await driver.close();

        // Chuyển về tab mới (tab còn lại)
        await driver.switchTo().window(handles[1]);
        await driver.sleep(2000)


        let xpath = "/html/body/div[2]/div/footer"; // XPath của phần tử cần cuộn tới
        await driver.executeScript(`
                        const element = document.evaluate("${xpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
        await driver.sleep(3000);
        let xpathLanguage = "/html/body/div[2]/div/footer/div/div[1]/form/div//ol/li[.//text()[contains(., 'English')]]"; // XPath của phần tử
        // Thực thi đoạn mã JavaScript để click vào phần tử
        await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathLanguage}",
                            document,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        ).singleNodeValue;
                    
                        if (element) {
                            element.click();
                            console.log("Đã click vào phần tử chứa 'English'");
                        } else {
                            console.error("Không tìm thấy phần tử theo XPath đã cung cấp.");
                        }
                    `);
        await driver.sleep(3000);
        const checkOk = await waitForElementOrTimeout(driver, "//h1[contains(text(), 'Daily spending limit increase request')]", 500, 3500);
        if (!checkOk) {
            updateStatus = "Success";
            return;
        }
        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.sleep(5000);
        const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
        let listAccountBanned = [];
        if (ElmListAccount.length <= 0) {
            const closeResponse = await axios.post(`${apiUrl}/api/v3/profiles/close/${profileId}`);
            return;

        }

        for (let i = 0; i < ElmListAccount.length; i++) {
            // Lấy danh sách phần tử lại sau mỗi lần quay lại trang
            const currentElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
            const currentAccountElement = currentElmListAccount[i]; // Lấy phần tử tại vị trí i hiện tại

            // Lấy giá trị span
            const spanElement = await currentAccountElement.findElement(By.xpath('./span[1]'));
            let spanValue = await spanElement.getText();
            listAccountBanned.push(spanValue);

            // Click vào phần tử
            // await currentAccountElement.click();
            // await driver.sleep(5000);

            // Kiểm tra xem tài khoản có bị cấm hay không
            // const isBanAds = await waitForElementOrTimeout(driver, '//div[contains(@class, "notification-container") and contains(@class, "red-bar")]');
            // if (isBanAds) {
            //     console.log(`Tài khoản ${spanValue} bị cấm.`);
            // } else {
            //     console.log(`Tài khoản ${spanValue} vẫn hoạt động.`);
            //     listAccountBanned.pop(); // Xóa tài khoản không bị cấm khỏi danh sách
            // }
            //
            // // Quay lại trang danh sách tài khoản
            // await driver.get("https://ads.google.com/nav/selectaccount");
            // await driver.sleep(5000); // Chờ trang tải lại
        }

        await driver.sleep(5000);
        const waitTime = 5000
        for (let item of listAccountBanned) {
            await driver.get("https://support.google.com/google-ads/contact/daily_spend_limit_incr_req");
            await driver.sleep(4000);
            //-------------------Nhập tên công ty-------------------------
            const xpathCPN = "/html/body/div[2]/div/section/div/div/article/form/div[4]/input"
            const inputCompanyNameLimit = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[4]/input")), waitTime);
            await driver.executeScript(`
                        const element = document.evaluate("${xpathCPN}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await enterTextIntoInput(driver, inputCompanyNameLimit, formDataLimit.exampleCompanyNameLimit);
            //-------------------Nhập số điện thoại-------------------------
            let xpathPrefixPhoneNumber = `/html/body/div[2]/div/section/div/div/article/form/div[6]/div[1]/ol/li[contains(., '${formDataLimit.examplePrefixPhoneNumberLimit}')] `
            await driver.executeScript(`
                        const element = document.evaluate("${xpathPrefixPhoneNumber}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathPrefixPhoneNumber}",
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
            //-------------------Nhập số điện thoại -------------------------
            const inputPhoneNumber = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[6]/input")), waitTime);
            await enterTextIntoInput(driver, inputPhoneNumber, formDataLimit.examplePhoneNumberLimit);
            await driver.sleep(1500);
            //-------------------Chọn tài khoản-------------------------
            const xpathSelectAccount = "/html/body/div[2]/div/section/div/div/article/form/div[8]/div/sc-shared-cid-selector/div/hcfe-search-select-select/div"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSelectAccount}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const btnSelect = await driver.findElement(By.xpath(xpathSelectAccount));
            await driver.executeScript("arguments[0].click();", btnSelect);
            await driver.sleep(2000);
            let xpathListAccount = `//button[.//div[text()='${item}']]`; // XPath của phần tử
            // Thực thi đoạn mã JavaScript để click vào phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathListAccount}",
                            document,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        ).singleNodeValue;
                    
                        if (element) {
                            element.click();
                        } else {
                            console.error("Không tìm thấy phần tử theo XPath đã cung cấp.");
                        }
                    `);
            await driver.sleep(2000);
            //-------------------Nhập tên website-------------------------
            const xpathMyWebsite = "/html/body/div[2]/div/section/div/div/article/form/div[10]/input"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathMyWebsite}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputMyWebsite = await driver.wait(until.elementLocated(By.xpath(xpathMyWebsite)), waitTime);
            await enterTextIntoInput(driver, inputMyWebsite, formDataLimit.exampleWebsiteLimit);
            await driver.sleep(1500);
            //-------------------Nhập địa chỉ đường phố------------------------
            const xpathAddress = "/html/body/div[2]/div/section/div/div/article/form/div[12]/div/textarea"
            const inputAddress = await driver.wait(until.elementLocated(By.xpath(xpathAddress)), waitTime);
            await enterTextIntoInput(driver, inputAddress, formDataLimit.exampleAddressLimit);
            await driver.sleep(1500);
            //-------------------Nhập Zipcode------------------------

            const xpathZipcode = "/html/body/div[2]/div/section/div/div/article/form/div[13]/input"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathZipcode}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputZipcode = await driver.wait(until.elementLocated(By.xpath(xpathZipcode)), waitTime);
            await enterTextIntoInput(driver, inputZipcode, formDataLimit.exampleZipCodeLimit);
            await driver.sleep(1500);
            //-------------------Nhập thành phố------------------------
            const xpathCity = "/html/body/div[2]/div/section/div/div/article/form/div[14]/input"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathCity}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputCity = await driver.wait(until.elementLocated(By.xpath(xpathCity)), waitTime);
            await enterTextIntoInput(driver, inputCity, formDataLimit.exampleCityLimit);
            await driver.sleep(1500);
            //-------------------Chọn quốc gia-------------------------
            let xpathBusinessCountry = `/html/body/div[2]/div/section/div/div/article/form/div[15]/div/ol/li[.//text()[contains(., '${formDataLimit.exampleBillingCountryLimit}')]]`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathBusinessCountry}",
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
            await driver.sleep(1500);
            //-------------------Chọn đang quảng cáo cho ai-------------------------
            let xpathSelectAdvertising  = `/html/body/div[2]/div/section/div/div/article/form/div[16]/fieldset//input[@aria-label='${formDataLimit.exampleYourOwnBusinessLimit}']`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSelectAdvertising}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const advertisingRadio =await driver.wait(until.elementLocated(By.xpath(xpathSelectAdvertising)), waitTime);
            await driver.executeScript("arguments[0].click();", advertisingRadio);
            await driver.sleep(1500);
            //-------------------Chọn tên -------------------------
            let xpathSelectYourName  =  `/html/body/div[2]/div/section/div/div/article/form/div[19]/fieldset//input[@aria-label='${formDataLimit.exampleYourOwnBusinessLimit}']`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSelectYourName}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const yourNameRadio =await driver.wait(until.elementLocated(By.xpath(xpathSelectYourName)), waitTime);
            await driver.executeScript("arguments[0].click();", yourNameRadio);
            await driver.sleep(1500);
            //-------------------Nhập ngày thanh toán-------------------------
            const xpathDatePay = "/html/body/div[2]/div/section/div/div/article/form/div[21]/div/input"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathDatePay}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputRecentDatePay = await driver.wait(until.elementLocated(By.xpath(xpathDatePay)), waitTime);
            await enterTextIntoInput(driver, inputRecentDatePay, formDataLimit.exampleDatePaymentMethodLimit);
            await driver.sleep(1500);

            //-------------------Nhập quốc gia phc vụ-------------------------
            const xpathCountryServe = "/html/body/div[2]/div/section/div/div/article/form/div[22]/div/textarea"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathCountryServe}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputCountryServe = await driver.wait(until.elementLocated(By.xpath(xpathCountryServe)), waitTime);
            await enterTextIntoInput(driver, inputCountryServe, formDataLimit.exampleBusinessServeLimit);
            await driver.sleep(1500);
            //-------------------Nhập mô tả về doanh nghiệp-------------------------
            const xpathDescription  = "/html/body/div[2]/div/section/div/div/article/form/div[23]/div/textarea"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathDescription}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputDescription = await driver.wait(until.elementLocated(By.xpath(xpathDescription)), waitTime);
            await enterTextIntoInput(driver, inputDescription, formDataLimit.exampleDescriptionBusinessLimit);
            await driver.sleep(1500);
            //-------------------Nhập lời giải thích-------------------------
            const xpathJustification  = "/html/body/div[2]/div/section/div/div/article/form/div[24]/div/textarea"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathJustification}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputJustification = await driver.wait(until.elementLocated(By.xpath(xpathJustification)), waitTime);
            await enterTextIntoInput(driver, inputJustification, formDataLimit.exampleJustificationLimit);
            await driver.sleep(1500);
            //-------------------Upload file lên-------------------------

            await driver.wait(until.elementLocated(By.id('file_upload')), 10000);
            // Tìm phần tử input file
            let fileInput = await driver.findElement(By.id('file_upload'));
            // Gửi đường dẫn file đến phần tử input file
            // const filePath = 'C:\\Users\\ADMIN\\Pictures\\Screenshots\\Screenshot 2024-05-12 151623.png';
            await fileInput.sendKeys(formDataLimit.exampleLinkImageLimit);
            await driver.sleep(10000);

            //-------------------Nhập lời Vấn đề-------------------------

            const xpathSummary  = "/html/body/div[2]/div/section/div/div/article/form/div[26]/div[1]/textarea"
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSummary}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const inputSummary = await driver.wait(until.elementLocated(By.xpath(xpathSummary)), waitTime);
            await enterTextIntoInput(driver, inputSummary, formDataLimit.exampleProblemSummaryLimit);
            await driver.sleep(1500);
            //Chuyển iframe để giải capcha
            const checkCaptcha1 = await waitForElementOrTimeout(driver, "(//iframe[contains(@src, 'https://www.google.com/recaptcha/api2') and contains(@title, 'reCAPTCHA')])")
            if (checkCaptcha1) {

                await switchToIframe(driver, "(//iframe[contains(@src, 'https://www.google.com/recaptcha/api2') and contains(@title, 'reCAPTCHA')])");
                const checkCaptcha = await waitForElementOrTimeout(driver, "//span[contains(@class, 'recaptcha-checkbox') and contains(@class, 'rc-anchor-checkbox') and contains(@aria-checked, 'true')]", 1000, 200000)
                if (!checkCaptcha) {
                    return
                }
                await driver.switchTo().defaultContent();
                await driver.sleep(3000);
                //Bấm submit để hiện ô capcha
                const selectSubmitBtnXPath = "//button[text()='Submit' or @class='submit-button']";
                const selectSubmitBtn = await driver.findElement(By.xpath(selectSubmitBtnXPath));
                await selectSubmitBtn.click();
                await driver.sleep(12000);
            }
            const selectSubmitBtnXPath = "//button[text()='Submit' or @class='submit-button']";
            const selectSubmitBtn = await driver.findElement(By.xpath(selectSubmitBtnXPath));
            await selectSubmitBtn.click();
            await driver.sleep(6000);


        }

    }catch(error){
        console.error("Selenium control error:", error);
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


/**
 * Hàm chuyển đổi ngữ cảnh sang một iframe cụ thể
 * @param {WebDriver} driver - Đối tượng WebDriver của Selenium
 * @param {string | WebElement} iframe - XPath, CSS Selector, hoặc WebElement của iframe
 */
async function switchToIframe(driver, iframe) {
    try {
        if (typeof iframe === "string") {
            // Chuyển bằng XPath hoặc CSS Selector
            const iframeElement = await driver.findElement(By.xpath(iframe));
            await driver.switchTo().frame(iframeElement);
        } else {
            // Chuyển bằng WebElement
            await driver.switchTo().frame(iframe);
        }
        console.log("Đã chuyển vào iframe thành công.");
    } catch (error) {
        console.error("Không thể chuyển vào iframe:", error.message);
    }
}

async function waitForElementOrTimeout(driver, xpath, interval = 1000, timeout = 6000) {
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


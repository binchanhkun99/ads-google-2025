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
            await processAppeal(
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

async function processAppeal(driverPath, remoteDebuggingAddress, profileId, user) {
    const filePath = path.join(__dirname, 'setup.txt');
    if (!fs.existsSync(filePath)) {
        throw new Error("Missing setup.txt");
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').map(line => line.trim());
    // Tạo các biến giống như trong Vue
    const formData = {
        exampleCompanyName: lines[0] || '',
        exampleWebsite: lines[1] || '',
        exampleKeyWord: lines[2] || '',
        exampleAddress: lines[3] || '',
        exampleZipCode: lines[4] || '',
        exampleCity: lines[5] || '',
        exampleCityCountry: lines[6] || '',
        exampleNumberAccount: parseInt(lines[7], 10) || 0,
        exampleAdsBusiness: parseInt(lines[8], 10) || 0,
        exampleWhoPay: lines[9] || '',
        exampleSelectPayment: parseInt(lines[10], 10) || 0,
        exampleRecentDatePay: lines[11] || '',
        exampleBusinessCountry: lines[12] || '',
        exampleDescrible: lines[13] || '',
        exampleRelationShip: lines[14] || '',
        exampleOwnerDomain: lines[15] || '',
        exampleSelectConnect: parseInt(lines[16], 10) || 0,
        examplePrefixPhoneNumber: lines[17] || '',
        examplePhoneNumber: lines[18] || '',
        exampleTimeConnect: lines[19] || '',
        exampleProblemSummary: lines[20] || '',
    };

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
            '--disable-translate'
        );

        const service = new chrome.ServiceBuilder(driverPath);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(service)
            .setChromeOptions(options)
            .build();

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

            console.log("spanValue____________", spanValue);

            // Click vào phần tử
            await currentAccountElement.click();
            await driver.sleep(5000);

            // Kiểm tra xem tài khoản có bị cấm hay không
            const isBanAds = await waitForElementOrTimeout(driver, '//div[contains(@class, "notification-container") and contains(@class, "red-bar")]');
            if (isBanAds) {
                console.log(`Tài khoản ${spanValue} bị cấm.`);
            } else {
                console.log(`Tài khoản ${spanValue} vẫn hoạt động.`);
                listAccountBanned.pop(); // Xóa tài khoản không bị cấm khỏi danh sách
            }

            // Quay lại trang danh sách tài khoản
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(5000); // Chờ trang tải lại
        }

        await driver.sleep(5000);
        const waitTime = 5000
        for (let item of listAccountBanned) {
            await driver.get("https://support.google.com/google-ads/contact/pf_suspended?hl=vi&authuser=0&js_request_id=render_api699912689&api_client=help_panel&render_inapp=1&authuser=0&ec=aw_overview&isLoggedIn=true&helpPanelInapp=true&enableSendFeedback=false&helpCenterContext=aw_overview&helpCenterDomain=support.google.com&helpCenterPath=/google-ads&ctx=5JbodJ0Pd7EzoSWBBWV");
            await driver.sleep(5000);
            let xpath = "/html/body/div[2]/div/footer/div/div[1]/form/div"; // XPath của phần tử cần cuộn tới
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
            let xPathNameCompany = "/html/body/div[2]/div/section/div/div/article/form/div[5]";
            await driver.executeScript(`
                        const element = document.evaluate("${xPathNameCompany}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(3000);
            const inputCompanyName = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[6]//input")), waitTime);

            await enterTextIntoInput(driver, inputCompanyName, formData.exampleCompanyName);
            let xPathNameWebsite = "/html/body/div[2]/div/section/div/div/article/form/div[10]";
            await driver.executeScript(`
                        const element = document.evaluate("${xPathNameWebsite}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            const selectAccountBtnXPath = "/html/body/div[2]/div/section/div/div/article/form/div[10]/div/sc-shared-cid-selector/div/hcfe-search-select-select/div";
            const selectAccountBtn = await driver.findElement(By.xpath(selectAccountBtnXPath));
            await selectAccountBtn.click();
            await driver.sleep(1000);
            let xpathSelectWebsiteScroll = "/html/body/div[2]/div/section/div/div/article/form/div[11]"; // XPath của phần tử cần cuộn tới
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSelectWebsiteScroll}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(2000);
            const overlayXPath1 = "//div[contains(@class, 'scSharedMaterialpopupbackdrop')]";
            try {
                const overlay1 = await driver.findElement(By.xpath(overlayXPath1));

                if (overlay1) {
                    console.log("Đang ẩn lớp phủ...");
                    await driver.executeScript("arguments[0].style.display = 'none';", overlay1); // Ẩn lớp phủ
                }
            } catch (error) {
                console.log("Không tìm thấy lớp phủ hoặc lớp phủ đã bị ẩn trước đó.");
            }
            // Bấm chuột vào list tk
            const elmClickListAccountXPath = "/html/body/div[2]/div/section/div/div/article/form/div[10]/div/sc-shared-cid-selector/div/hcfe-search-select-select/div";

            const elmClickListAccount = await driver.findElement(By.xpath(elmClickListAccountXPath));

            await elmClickListAccount.click();
            await driver.sleep(3000);
            let xpathSelectAccount = `//button[.//div[text()='${item}']]`; // XPath của phần tử
            // Thực thi đoạn mã JavaScript để click vào phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathSelectAccount}",
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
            const inputMyWebsite = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[11]//input")), waitTime);
            await enterTextIntoInput(driver, inputMyWebsite, formData.exampleWebsite);
            await driver.sleep(1500);
            //-------------------Nhập tên từ khóa-------------------------
            const inputKeyWord = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[12]//input")), waitTime);
            await enterTextIntoInput(driver, inputKeyWord, formData.exampleKeyWord);
            await driver.sleep(1500);
            //-------------------Cuộn chuột--------------------------------
            let xpathSelectBillScroll = "/html/body/div[2]/div/section/div/div/article/form/div[16]"; // XPath của phần tử cần cuộn tới
            await driver.executeScript(`
                        const element = document.evaluate("${xpathSelectBillScroll}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(1500);
            //-------------------Nhập tên Địa chỉ-------------------------
            const inputAddress = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[15]//input")), waitTime);
            await enterTextIntoInput(driver, inputAddress, formData.exampleAddress);
            await driver.sleep(1500);
            //-------------------Nhập mã zip-------------------------
            const inputZipCode = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[16]//input")), waitTime);
            await enterTextIntoInput(driver, inputZipCode, formData.exampleZipCode);
            await driver.sleep(1500);
            //-------------------Nhập thành phố-------------------------
            const inputCity = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[17]//input")), waitTime);
            await enterTextIntoInput(driver, inputCity, formData.exampleCity);
            await driver.sleep(1500);
            //-------------------Cuộn chuột--------------------------------
            let xpathCountryScroll = "/html/body/div[2]/div/section/div/div/article/form/div[18]"; // XPath của phần tử cần cuộn tới
            await driver.executeScript(`
                        const element = document.evaluate("${xpathCountryScroll}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(1500);
            //-------------------Nhập quốc gia-------------------------
            let xpathSelecCountry = `/html/body/div[2]/div/section/div/div/article/form/div[18]//ol/li[.//text()[contains(., '${formData.exampleCityCountry}')]]`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathSelecCountry}",
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
            //-------------------Click chọn số lượng tài khoản-------------------------
            // Tìm lớp phủ
            const overlayXPath = "//div[contains(@class, 'scSharedMaterialpopupbackdrop')]";
            try {
                const overlay = await driver.findElement(By.xpath(overlayXPath));

                if (overlay) {
                    console.log("Đang ẩn lớp phủ...");
                    await driver.executeScript("arguments[0].style.display = 'none';", overlay); // Ẩn lớp phủ
                }
            } catch (error) {
                console.log("Không tìm thấy lớp phủ hoặc lớp phủ đã bị ẩn trước đó.");
            }
            let xpathNumberAccount = `(/html/body/div[2]/div/section/div/div/article/form/div[19]//fieldset//div[@class='material-radio'])[${formData.exampleNumberAccount}]`; // XPath của phần tử
            const selectNumberAccountBtn = await driver.findElement(By.xpath(xpathNumberAccount));
            await selectNumberAccountBtn.click();
            await driver.sleep(1500);
            //-------------------Click chọn số lượng tài khoản-------------------------
            let xpathAdsBusiness = `(/html/body/div[2]/div/section/div/div/article/form/div[20]//fieldset//div[@class='material-radio'])[${formData.exampleAdsBusiness}]`
            const selectAdsBusinessBtn = await driver.findElement(By.xpath(xpathAdsBusiness));
            await selectAdsBusinessBtn.click();
            await driver.sleep(1500);
            //-------------------Cuộn chuột--------------------------------
            let xpathPaymentScroll = "/html/body/div[2]/div/section/div/div/article/form/div[23]"; // XPath của phần tử cần cuộn tới
            await driver.executeScript(`
                        const element = document.evaluate("${xpathPaymentScroll}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(1500);
            //-------------------Nhập người thanh toán-------------------------
            const inputWhoPay = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[21]//textarea")), waitTime);
            await driver.executeScript("arguments[0].click();", inputWhoPay);
            await enterTextIntoInput(driver, inputWhoPay, formData.exampleWhoPay);
            await driver.sleep(1500);
            //-------------------Tùy chọn thanh toán-------------------------
            let xpathSelectPayment = `(/html/body/div[2]/div/section/div/div/article/form/div[22]//ol/li)[${formData.exampleSelectPayment + 1}]`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathSelectPayment}",
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
            //-------------------Nhập ngày thanh toán-------------------------
            const inputRecentDatePay = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[23]//input")), waitTime);
            await enterTextIntoInput(driver, inputRecentDatePay, formData.exampleRecentDatePay);
            await driver.sleep(1500);
            //-------------------Chọn quốc gia-------------------------
            let xpathBusinessCountry = `/html/body/div[2]/div/section/div/div/article/form/div[24]//ol/li[.//text()[contains(., '${formData.exampleBusinessCountry}')]]`; // XPath của phần tử
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
            //-------------------Nhập mô tả-------------------------
            const inputDescrible = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[25]//textarea")), waitTime);
            await enterTextIntoInput(driver, inputDescrible, formData.exampleDescrible);
            await driver.sleep(1500);
            //-------------------Nhập Thông tin về mối quan hệ giữa đại lý và khách hàng-------------------------
            if (formData.exampleRelationShip) {
                const inputRelationShip = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[26]//textarea")), waitTime);
                await enterTextIntoInput(driver, inputRelationShip, formData.exampleRelationShip);
            }
            await driver.sleep(1500);
            //-------------------Cuộn chuột--------------------------------
            let xpathOwnerDomainScroll = "/html/body/div[2]/div/section/div/div/article/form/div[29]"; // XPath của phần tử cần cuộn tới
            await driver.executeScript(`
                        const element = document.evaluate("${xpathOwnerDomainScroll}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.sleep(1500);
            //-------------------Nhập chủ sở hữu domain-------------------------
            if (formData.exampleOwnerDomain) {
                const inputOwnerDomain = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[27]//textarea")), waitTime);
                await enterTextIntoInput(driver, inputOwnerDomain, formData.exampleOwnerDomain);

            }
            await driver.sleep(1500);

            //-------------------Tùy chọn liên hệ-------------------------
            let xpathSelectConnect = `(/html/body/div[2]/div/section/div/div/article/form/div[28]//fieldset//div[@class='material-radio'])[${formData.exampleSelectConnect}]`; // XPath của phần tử
            await driver.executeScript(`
                        const element = document.evaluate(
                            "${xpathSelectConnect}",
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
            if (formData.exampleSelectConnect == 1 || formData.exampleSelectConnect == 2) {
                let xpathPrefixPhoneNumber = `/html/body/div[2]/div/section/div/div/article/form/div[29]//ol/li[.//text()[contains(., '${formData.examplePrefixPhoneNumber}')]]`; // XPath của phần tử
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
                //-------------------Nhập số điện thoại và thời gian liên hệ-------------------------
                const inputPhoneNumber = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[29]//input")), waitTime);
                await enterTextIntoInput(driver, inputPhoneNumber, formData.examplePhoneNumber);
                await driver.sleep(1500);

                const inputTimeConnect = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[30]//input")), waitTime);
                await enterTextIntoInput(driver, inputTimeConnect, formData.exampleTimeConnect);
                await driver.sleep(1500);
            }else if(formData.exampleSelectConnect === 3){
                //-------------------Nếu là Email me-------------------------

                const xpathEmailMe = "//div[contains(@class, 'material-radio')]/input[@aria-label='Email me']"
                const btnEmailMe = await driver.findElement(By.xpath(xpathEmailMe));
                await driver.executeScript("arguments[0].click();", btnEmailMe);
                await driver.sleep(2000);
            }

            //-------------------Nhập tóm tắt vấn đề-------------------------
            const inputProblemSumary = await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/div/section/div/div/article/form/div[31]//textarea")), waitTime);
            await enterTextIntoInput(driver, inputProblemSumary, formData.exampleProblemSummary);
            await driver.sleep(1500);
            //Bấm submit để hiện ô capcha
            const selectSubmitBtnXPath = "//button[text()='Submit' or @class='submit-button']";
            const selectSubmitBtn = await driver.findElement(By.xpath(selectSubmitBtnXPath));
            await selectSubmitBtn.click();
            await driver.sleep(2000);

            //Chuyển iframe để giải capcha
            await switchToIframe(driver, "(//iframe[contains(@src, 'https://www.google.com/recaptcha/api2') and contains(@title, 'reCAPTCHA')])[2]");
            const checkCapcha = await waitForElementOrTimeout(driver, "//span[contains(@class, 'recaptcha-checkbox') and contains(@class, 'rc-anchor-checkbox') and contains(@aria-checked, 'true')]", 1000, 200000)
            if (!checkCapcha) {
                return
            }
            await driver.switchTo().defaultContent();
            await driver.sleep(3000);
            //Bấm submit để hiện ô capcha
            await selectSubmitBtn.click();
            await driver.sleep(12000);
        }


    } catch (error) {
        console.error("Selenium control error:", error);
        updateStatus = "Error"
    } finally {
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


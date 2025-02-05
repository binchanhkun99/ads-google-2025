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
        await driver.sleep(1000)

        await driver.get("https://ads.google.com/nav/selectaccount");
        await driver.sleep(4500)

        const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
        let listAccountBanned = [];
        if (ElmListAccount.length <= 0) {
            updateStatus = "Error"
            return;

        }
        // Click vào phần tử
        // Kiểm tra xem tài khoản có bị cấm hay không

        for(let i = 0; i < ElmListAccount.length; i++) {
            // Lấy danh sách phần tử lại sau mỗi lần quay lại trang\
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(5000); // Chờ trang tải lại
            const currentElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));

            const currentAccountElement = currentElmListAccount[i];
            // Lấy giá trị span
            const spanElement = await currentAccountElement.findElement(By.xpath('./span[1]'));
            let spanValue = await spanElement.getText();
            listAccountBanned.push(spanValue);
            await currentAccountElement.click();
            await driver.sleep(4500)
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
            await driver.sleep(4500);
            //-------------------Tài khoản vẫn hoạt động thì check xem có cần veri không--------------------------------
            const billingBtnXPath = "(//a[contains(@href, '/aw/billing/summary')])[1]";
            const billingBtnCheck = await waitForElementOrTimeoutReg(driver, billingBtnXPath, 1000, 5000);

            if (!billingBtnCheck) {
                listAccountBanned.pop();
            }
            else {
                const billingBtn = await driver.findElement(By.xpath(billingBtnXPath));
                await billingBtn.click();
                await driver.sleep(3500);
                //-------------------Bấm vào verify ad--------------------------------
                const advertiserBtnXPath = "//a[.//div[text()='Advertiser verification']]";
                const advertiserBtn = await driver.findElement(By.xpath(advertiserBtnXPath));

                await advertiserBtn.click();
                await driver.sleep(2500);
                const checkVerify = await waitForElementOrTimeoutReg(driver, "//h4[text()='Complete the tasks to get verified']", 1000, 4000)
                if (!checkVerify) {
                    const checkVerify2 = await waitForElementOrTimeoutReg(driver, "//material-button[.//div[text()='Start verification']]", 1000, 4000)
                    if (!checkVerify2) {
                        listAccountBanned.pop();
                    }
                }
            }


        }
        for (let item of listAccountBanned) {
            await driver.get("https://ads.google.com/nav/selectaccount");
            await driver.sleep(4500)
            console.log("of listAccountBanned_____")

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
            await driver.sleep(2000)

            // Tải lại trang để cookie có hiệu lực
            await driver.executeScript("location.reload()")

            const billingBtnXPath = "(//a[contains(@href, '/aw/billing/summary')])[1]";
            await waitForElementOrTimeoutReg(driver, billingBtnXPath, 1000, 10000);
            const billingBtn = await driver.findElement(By.xpath(billingBtnXPath));
            await driver.executeScript(`
                        const element = document.evaluate("${billingBtnXPath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript("arguments[0].click();", billingBtn);
            await driver.sleep(4000);
            //-------------------Bấm vào verify ad--------------------------------
            const advertiserBtnXPath = "//a[.//div[text()='Advertiser verification']]";
            const advertiserBtn = await driver.findElement(By.xpath(advertiserBtnXPath));
            await driver.executeScript(`
                        const element = document.evaluate("${advertiserBtnXPath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    `);
            await driver.executeScript("arguments[0].click();", advertiserBtn);
            await driver.sleep(5500);
            //-------------------Bấm vào bắt đầu verify--------------------------------
            const checkBtnStart = await waitForElementOrTimeoutReg(driver, "//button[.//span[text()='Start task']]", 1000, 4000)
            const checkBtnStartVerification = await waitForElementOrTimeoutReg(driver, "//material-button[.//div[text()='Start verification']]", 1000, 4000)

            // Xử lý logic nhấn nút
            if (checkBtnStartVerification) {
                // Nếu nút "Start verification" có sẵn
                const xpathStartVerify = '//material-button[.//div[text()="Start verification"]]';
                const startVerifyBtn = await driver.findElement(By.xpath(xpathStartVerify));
                await startVerifyBtn.click();
                await driver.sleep(4500);
            } else if (checkBtnStart) {
                // Nếu nút "Start task" có sẵn
                const xpathStartTask = '//button[.//span[text()="Start task"]]';
                const startTaskBtn = await driver.findElement(By.xpath(xpathStartTask));
                await startTaskBtn.click();
                await driver.sleep(4500);
            } else {
                // Nếu không tìm thấy cả hai nút
                updateStatus = "Error";
                return;
            }

            //-------------------Form Tell us about your organization --------------------------------
            await waitForElementOrTimeoutReg(driver, `//material-radio[.//simple-html[.//span[text()='${formData.exampleOrganizationAds}']]]`, 1000, 4000)
            const xpathOrganizationAds = `//material-radio[.//simple-html[.//span[text()='${formData.exampleOrganizationAds}']]]//div[contains(@class, 'icon-container')]`;
            const OrganizationAdsBtn = await driver.findElement(By.xpath(xpathOrganizationAds));
            await OrganizationAdsBtn.click();
            await driver.sleep(2000);

            if(formData.exampleOrganizationAds==='Yes'){
                if(formData.exampleWantVerifyToday==='My agency'){
                    const xpathWantVerifyToday = `//material-radio[.//simple-html[.//span[text()='${formData.exampleWantVerifyToday}']]]`
                    const WantVerifyTodayBtn = await driver.findElement(By.xpath(xpathWantVerifyToday));
                    await WantVerifyTodayBtn.click();
                }else if(formData.exampleWantVerifyToday==='A client'){
                    const xpathWantVerifyToday = `//material-radio[.//simple-html[.//span[text()='${formData.exampleWantVerifyToday}']]]`
                    const WantVerifyTodayBtn = await driver.findElement(By.xpath(xpathWantVerifyToday));
                    await WantVerifyTodayBtn.click();
                    await driver.sleep(2000);
                    const xpathAgencyPayFor = `//material-radio[.//simple-html[.//span[text()='${formData.exampleAgencyPayFor}']]]`
                    const agencyPayForBtn = await driver.findElement(By.xpath(xpathAgencyPayFor));
                    await agencyPayForBtn.click();
                }


            }else if(formData.exampleOrganizationAds==='No'){

                const xpathWhoPayFor = `//material-radio[.//simple-html[.//span[text()='${formData.exampleWhoPayFor}']]]`
                const agencyWhoPayForBtn = await driver.findElement(By.xpath(xpathWhoPayFor));
                await agencyWhoPayForBtn.click();

            }
            await driver.sleep(2000);
            //-------------------Save and continued--------------------------------
            const xpathSaveAndContinue = "//material-button[.//div[text()='Save & Continue']]"
            const SaveAndContinueBtn = await driver.findElement(By.xpath(xpathSaveAndContinue));
            await SaveAndContinueBtn.click();

            const btnProvideInfoCheck = await waitForElementOrTimeoutReg(driver, "(//in-progress-task-item//button[.//span[text()='Start task']])[1]", 1000, 8000)
            if(!btnProvideInfoCheck) {
                const verifyYourAgency = await waitForElementOrTimeoutReg(driver, "//verification-task-list-item[.//span[text()='Get started'] and .//span[text()='Verify your agency']]", 1000, 4000)
                if (verifyYourAgency){
                    const xpathYACBtn = "//verification-task-list-item[.//span[text()='Get started'] and .//span[text()='Verify your agency']]//button"
                    const yAGCBtn = await driver.findElement(By.xpath(xpathYACBtn))
                    await driver.executeScript("arguments[0].scrollIntoView(true);", yAGCBtn);
                    await driver.sleep(500);
                    await driver.executeScript("arguments[0].click();", yAGCBtn);
                }
            }
            else {
                const xpathProvideInfoBtn = "(//in-progress-task-item//button[.//span[text()='Start task']])[1]"
                const provideInfoBtn = await driver.findElement(By.xpath(xpathProvideInfoBtn))
                await driver.executeScript("arguments[0].scrollIntoView(true);", provideInfoBtn);
                await driver.sleep(500);
                await driver.executeScript("arguments[0].click();", provideInfoBtn);
            }

            //-------------------Nhấn vào start verify--------------------------------
            await driver.sleep(3000);
            await driver.switchTo().defaultContent();
            await driver.sleep(2000);
            const checkNoti = await waitForElementOrTimeoutReg(driver, "//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/identityverification')]", 1000, 8000)
            if (!checkNoti) {
                updateStatus = "Error"
                return
            }
            // Chuyển vào iframe
            await driver.switchTo().frame(
                await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/identityverification')]"))
            );
            const xpathStartVerifyBtn = "//button[.//span[text()='Start verification']]"
            const StartVerifyBtn = await driver.findElement(By.xpath(xpathStartVerifyBtn))
            await driver.executeScript("arguments[0].scrollIntoView(true);", StartVerifyBtn);
            await driver.sleep(500);
            await driver.executeScript("arguments[0].click();", StartVerifyBtn);
            await driver.sleep(5000);
            //-------------------Chuyển khung--------------------------------
            const xpathInput1 = "//input[1]"
            // Dùng executeScript để nhập giá trị
            await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.click()
        element.value = arguments[1]; // Đặt giá trị mới 
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathInput1, `${formData.exampleOrganizationName}`);
            await driver.sleep(2000);
            const xpathInputAddress = "/html/body/div[1]/c-wiz/div/div/c-wiz/div/c-wiz/div[1]/div/div[1]/div/div/div/div/div[1]/div[3]/div/div[2]/div/div/div[1]/label/input";
            const xpathInputAddressFind = await driver.findElement(By.xpath(xpathInputAddress))
            await driver.executeScript("arguments[0].scrollIntoView(true);", xpathInputAddressFind);
            // Dùng executeScript để nhập giá trị
            await enterTextIntoInput(driver, xpathInputAddressFind, formData.exampleAddress);

            await driver.sleep(2000);

            const xpathInput2 = "/html/body/div[1]/c-wiz/div/div/c-wiz/div/c-wiz/div[1]/div/div[1]/div/div/div/div/div[1]/div[3]/div/div[4]/div/div/div[1]/label/input";
            const xpathInput2Find = await driver.findElement(By.xpath(xpathInput2))
            await driver.executeScript("arguments[0].scrollIntoView(true);", xpathInput2Find);
            console.log("_____City", formData.exampleCity)
            await enterTextIntoInput(driver, xpathInput2Find, formData.exampleCity);

            await driver.sleep(2000);
            //-------------------Chọn doanh nghiệp hay cá nhân--------------------------------
            const elementClickState = await driver.findElement(By.xpath("//div[contains(@class, 'VfPpkd-TkwUic')]"));
            await driver.sleep(2000);
            await driver.executeScript("arguments[0].scrollIntoView(true);", elementClickState);
            await driver.executeScript("arguments[0].focus();", elementClickState);
            await driver.executeScript("arguments[0].click();", elementClickState);
            await driver.sleep(2000);
            const xpathState = `//li[.//span[normalize-space(text())='${formData.exampleState}']]`;
            const btnState = await driver.findElement(By.xpath(xpathState));
            await driver.executeScript("arguments[0].click();", btnState);
            await driver.sleep(2000);
            const xpathInput3 = "/html/body/div[1]/c-wiz/div/div/c-wiz/div/c-wiz/div[1]/div/div[1]/div/div/div/div/div[1]/div[3]/div/div[5]/div[2]/div/div/div[1]/label/input";
            const xpathInput3Find = await driver.findElement(By.xpath(xpathInput3))
            console.log("_____Zipcode", formData.exampleZipCode2)
            await driver.executeScript("arguments[0].scrollIntoView(true);", xpathInput3Find);
            // Dùng executeScript để nhập giá trị
            await enterTextIntoInput(driver, xpathInput3Find, formData.exampleZipCode2);

            await driver.sleep(2000);
            //-------------------Bấm vào submit--------------------------------
            const xpathSubmit = "//button[.//span[text()='Submit']]";
            const btnSubmitVerify =  await driver.findElement(By.xpath(xpathSubmit));
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnSubmitVerify);
            await driver.executeScript("arguments[0].click();", btnSubmitVerify);
            await driver.sleep(2000);
            await waitForElementOrTimeoutReg(driver, "//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')]", 1000, 10000);
            await driver.switchTo().defaultContent();
            await driver.switchTo().frame(await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')]")));
            await driver.sleep(4000);
            //-------------------Bấm vào submit--------------------------------
            const checkCorrect = await waitForElementOrTimeoutReg(driver, "//button[.//span[contains(text(), 'Yes,')]]", 1000, 5000)
            if (checkCorrect) {
                const xpathCorrectBtn = "//button[.//span[contains(text(), 'Yes,')]]"
                const correctBtn = await driver.findElement(By.xpath(xpathCorrectBtn));
                await driver.executeScript("arguments[0].click();", correctBtn);
            }
            else {
                const xpathConfirm = "//button[.//span[text()='Confirm']]";
                const btnConfirm = await driver.findElement(By.xpath(xpathConfirm));
                await driver.executeScript("arguments[0].click();", btnConfirm);
            }
            await driver.sleep(4500);
            await driver.wait(async () => {
                const readyState = await driver.executeScript("return document.readyState;");
                return readyState === "complete";
            }, 10000);
            await driver.switchTo().defaultContent();
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
            await driver.executeScript("location.reload()")
            const xpathStartProvide = '//button[.//span[text()="Start task"]]'
            const checkStartFn = await waitForElementOrTimeoutReg(driver, xpathStartProvide, 1000, 10000);
            if (!checkStartFn) {
                const checkStartFnCase2 = await waitForElementOrTimeoutReg(driver,"//button[.//span[text()='Get started'] and contains(@class, 'action-button')]", 1000, 10000);
                if (checkStartFnCase2) {
                    const startStartProvideBtnCase2 = await driver.findElement(By.xpath("//button[.//span[text()='Get started'] and contains(@class, 'action-button')]"));
                    await startStartProvideBtnCase2.click();
                    await driver.sleep(2000);
                }
            }
            else {
                const startStartProvideBtn = await driver.findElement(By.xpath(xpathStartProvide));
                await startStartProvideBtn.click();
                await driver.sleep(2000);
            }

            const tabs = await driver.getAllWindowHandles();
            await driver.switchTo().window(tabs[1]);

            const xpathContinuePass = '/html/body/div[1]/root/div/advertiser-identity-view-loader/identity-invitation-view/div/div/intro-card/div[1]/div[1]/div/div[2]/material-button[1]';
            await waitForElementOrTimeoutReg(driver, xpathContinuePass, 1000, 20000);
            const ContinuePassBtn = await driver.findElement(By.xpath(xpathContinuePass));
            await ContinuePassBtn.click();
            await driver.sleep(4500);
            const ifPass = await waitForElementOrTimeoutReg(driver, "//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/identityverification')]", 1000, 8000)
            if (!ifPass) {
                updateStatus = "Error"
                return
            }
            // Chuyển vào iframe
            await driver.switchTo().frame(
                await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/identityverification')]"))
            );
            const xpathSLPRFBtn = "//div[contains(@class, 'yFyOHf')]"
            const SLPRFBtn = await driver.findElement(By.xpath(xpathSLPRFBtn))
            await driver.executeScript("arguments[0].scrollIntoView(true);", SLPRFBtn);
            await driver.sleep(500);
            await driver.executeScript("arguments[0].click();", SLPRFBtn);
            await driver.sleep(2000);
            const xpathPin = `(//div[contains(@jsaction,'click:') and .//div[text()='${formData.exampleOrganizationName}']])[1]`
            const pinBtn = await driver.findElement(By.xpath(xpathPin))
            await driver.executeScript("arguments[0].scrollIntoView(true);", pinBtn);
            await driver.sleep(500);
            await driver.executeScript("arguments[0].click();", pinBtn);
            await driver.sleep(5000);
            const xpathEnd = "//button[contains(@class, 'VfPpkd-LgbsSe VfPpkd-LgbsSe-OWXEXe-k8QpJ')]"
            const endBtn = await driver.findElement(By.xpath(xpathEnd))
            await driver.executeScript("arguments[0].scrollIntoView(true);", endBtn);
            await driver.sleep(500);
            await driver.executeScript("arguments[0].click();", endBtn);
            await driver.sleep(2000);

        }

        await driver.sleep(3000)

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


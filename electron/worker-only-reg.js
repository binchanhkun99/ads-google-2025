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
            await processReg(
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

async function processReg(driverPath, remoteDebuggingAddress, profileId, user) {
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
        await driver.sleep(1000)
        await mainProcess(driver, formData, updateStatus);
        await driver.sleep(3000);
        let xpathSkip1 = "(//material-button[.//div[text()='Next']])[2]";
        const checkSkip1 = await waitForElementOrTimeoutReg(driver, xpathSkip1);
        if (checkSkip1) {
            // Tìm phần tử bằng XPath
            const btnskip1 = await driver.findElement(By.xpath(xpathSkip1));

            // Cuộn đến phần tử nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnskip1);
            await driver.sleep(2000);

            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", btnskip1);

            // Chờ sau khi nhấp
            await driver.sleep(4000)
        }


        //-------------------Kiểm tra form-------------------------
        let xpathCheckRole = "//express-construction-nb-header"
        let result = await driver.executeScript(`
        let xpathCheckRole = "${xpathCheckRole}";
        let node = document.evaluate(xpathCheckRole, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        node ? true : false; // Trả về true nếu tìm thấy, false nếu không
    `);
        await driver.sleep(5000);

        // Kiểm tra giá trị result
        if (result) {
            await mainProcess(driver, formData, updateStatus);
        }
        // let xpathSkip2 = "(//button[text()='Skip'])[2]";
        let xpathSkip2 = "//left-stepper-content/dynamic-component/linking-wrapper/div/button-panel/div/div/button";
        const checkSkip2 = await waitForElementOrTimeoutReg(driver, xpathSkip2);
        if (checkSkip2) {
            // Tìm phần tử bằng XPath
            const btnskip2 = await driver.findElement(By.xpath(xpathSkip2));

            // Cuộn phần tử vào khung nhìn (nếu cần)
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnskip2);
            await driver.sleep(3000);


            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", btnskip2);

            // Chờ thêm nếu cần
            await driver.sleep(3000);
            //-------------------Kiểm tra form Muc tiêu VÀ SKIP-------------------------
            const checkCard = waitForElementOrTimeoutReg(driver, "//conversion-goal-card", 1000, 10000)
            if (!checkCard) {
                updateStatus = "Error"
                return;
            }
            let xpathSkip3 = "//left-stepper-content/dynamic-component/campaign-goals-wrapper/div/button-panel/div/div/button";

            let skipButton3 = await driver.findElement(By.xpath(xpathSkip3));


            // Cuộn đến phần tử nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", skipButton3);
            await driver.sleep(3000);
            let tagName = await skipButton3.getTagName(); // Lấy tên thẻ
            let text = await skipButton3.getText(); // Lấy văn bản hiển thị
            let id = await skipButton3.getAttribute('id'); // Lấy thuộc tính id (nếu có)
            // Nhấp vào phần tử
            await driver.executeScript("arguments[0].click();", skipButton3);
            await driver.sleep(3000);


            //-------------------Skip chiến dịch-------------------------
            await driver.sleep(3000);
            // let xpathSkip4 = "(//button[text()='Skip'])[3]";
            let xpathSkip4 = "//left-stepper-content/dynamic-component/campaign-type-wrapper/div/button-panel/div/div/button";


            let btnSkip4 = await driver.findElement(By.xpath(xpathSkip4));
            // Cuộn phần tử vào khung nhìn (nếu cần)
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnSkip4);
            await driver.sleep(3000);


            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", btnSkip4);

            // Chờ sau khi nhấp
            await driver.sleep(3000);

            //-------------------Rời khỏi tạo chiến dịch-------------------------

            let xpathSkipFinal = "//material-button[.//div[text()='Leave campaign creation']]";
            const btnSkipFinal = await driver.wait(until.elementLocated(By.xpath(xpathSkipFinal)), 10000);

            await driver.executeScript(`
    const element = document.evaluate(${JSON.stringify(xpathSkipFinal)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        element.click();
    } else {
        throw new Error("Element not found for the given XPath: " + ${JSON.stringify(xpathSkipFinal)});
    }
`);
            await driver.sleep(3000);
        }

        let xPathCurrency1 = "(//div[@buttondecorator and @keyboardonlyfocusindicator])[3]";
        const checkAccountSettings = await waitForElementOrTimeoutReg(driver, xPathCurrency1);
        if (checkAccountSettings) {
            //-------------------Chọn quốc gia thanh toán-------------------------
            let xpathCountry = "(//div[@buttondecorator and @keyboardonlyfocusindicator])[1]";

            // Tìm phần tử bằng XPath
            const btnCountry = await driver.findElement(By.xpath(xpathCountry));

            // Cuộn phần tử vào khung nhìn nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnCountry);

            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", btnCountry);

            // Chờ thêm thời gian nếu cần
            await driver.sleep(2000);
            //-------------------Chọn quốc gia-------------------------

            let xPathCountry2 = `//div[contains(@class, 'options-wrapper')]//material-select-dropdown-item[.//span[text()='${formData.exampleBillingCountry}']]`;

            await driver.executeScript(`
    const element = document.evaluate(
        "${xPathCountry2}",
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
            //-------------------Chọn tiền tệ-------------------------
            let xPathCurrency = "(//div[@buttondecorator and @keyboardonlyfocusindicator])[3]";

            // Tìm phần tử bằng XPath
            const btnCurrency = await driver.findElement(By.xpath(xPathCurrency));

            // Cuộn phần tử vào khung nhìn nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnCurrency);

            // Nhấp vào phần tử bằng JavaScript
            await driver.executeScript("arguments[0].click();", btnCurrency);

            // Chờ thêm thời gian nếu cần
            await driver.sleep(2000);
            let xPathCurrency2 = `(//div[contains(@class, 'options-wrapper')]//material-select-dropdown-item[
  contains(translate(.//span, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${formData.exampleCurrency}')
])[1]`;

            await driver.executeScript(`
    const element = document.evaluate(
       \`${xPathCurrency2}\`,
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
            let btnContinuePart1 = await driver.wait(
                until.elementLocated(By.xpath("(//material-button[contains(@class, 'continue-button') and .//material-ripple[@aria-hidden='true']])[1]")),
                10000 // Thời gian chờ tối đa 10 giây
            )
            // Cuộn đến phần tử nếu cần
            await driver.executeScript("arguments[0].scrollIntoView(true);", btnContinuePart1);

            // Nhấp vào phần tử
            await driver.executeScript("arguments[0].click();", btnContinuePart1);
            await driver.sleep(3000);
        }

        //-------------------Chọn quốc gia thanh toán-------------------------

        let xpathCountry2 = "(//div[@buttondecorator and @keyboardonlyfocusindicator])[1]";
        await waitForElementOrTimeoutReg(driver, xpathCountry2, 1000, 10000);
        if (!xpathCountry2) {
            updateStatus = 'Error'
            return
        }
        // Tìm phần tử bằng XPath
        const btnCountry2 = await driver.findElement(By.xpath(xpathCountry2));

        // Cuộn phần tử vào khung nhìn nếu cần
        await driver.executeScript("arguments[0].scrollIntoView(true);", btnCountry2);

        // Nhấp vào phần tử bằng JavaScript
        await driver.executeScript("arguments[0].click();", btnCountry2);

        // Chờ thêm thời gian nếu cần
        await driver.sleep(2000);

        let xPathCountry3 = `//material-select-dropdown-item[.//span[normalize-space(text())='${formData.exampleBillingCountry}']]`;

        await driver.executeScript(`
    const element = document.evaluate(
        "${xPathCountry3}",
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
        //-------------------Mở Popup tạo hồ sơ--------------------------------
        try {
            // Chờ iframe hiển thị
            await waitForElementOrTimeoutReg(driver, "//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/buyflow2')]", 1000, 10000);

            // Chuyển vào iframe
            await driver.switchTo().frame(
                await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/buyflow2')]"))
            );

            await driver.sleep(5000);
            // Tìm và click nút
            const xpathBtnProfile = "//div[contains(@jsaction, 'click:') and //div[text()='Create new payments profile'] and @data-is-selected='true']";
            const btnProfile = await driver.findElement(By.xpath(xpathBtnProfile));
            await driver.executeScript("arguments[0].click();", btnProfile);

        } catch (e) {
            console.error(e);
        }
        await driver.sleep(3000);

        await driver.switchTo().defaultContent();
        await driver.sleep(2000);

        //-------------------Chọn doanh nghiệp hay cá nhân--------------------------------
        const checkModalIframeX = await waitForElementOrTimeoutReg(driver, "(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]")
        if (checkModalIframeX) {
            const modalIframe2 = await driver.findElement(By.xpath("(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]"));
            await driver.switchTo().frame(modalIframe2);
        }
        else {
            const modalIframe = await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')]"));
            await driver.switchTo().frame(modalIframe);
        }
        await driver.sleep(5000);

        // Check đã tồn tại
        try {
            const xpathBtnProfileModal = "//div[text()='Create new payments profile']";
            const btnProfileModal = await driver.findElement(By.xpath(xpathBtnProfileModal));

            // Cuộn vào khung nhìn
            await driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", btnProfileModal);
            await driver.sleep(1000); // Đợi cuộn hoàn tất

            // Sử dụng JavaScript click
            await driver.executeScript(`
    const element = arguments[0];
    element.focus(); // Đảm bảo phần tử được focus
    element.click(); // Kích hoạt sự kiện click
`, btnProfileModal);

            await driver.sleep(3000);
        } catch (error) {
            if (error.name === "NoSuchElementError") {
                console.log("Button not found. Continuing...");
            } else {
                console.error("An error occurred:", error);
            }
        }
        await driver.switchTo().defaultContent();
        await driver.sleep(2000);

        //-------------------Chọn doanh nghiệp hay cá nhân--------------------------------
        const checkModalIframe2 = await waitForElementOrTimeoutReg(driver, "(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]")
        if (checkModalIframe2) {
            console.log("SW vào iframe dự phòng _________", checkModalIframe2)

            const modalIframe2 = await driver.findElement(By.xpath("(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]"));
            await driver.switchTo().frame(modalIframe2);
        }
        else {
            console.log("SW vào iframe chính_________")
            const modalIframe = await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')]"));
            await driver.switchTo().frame(modalIframe);
        }
        // Chuyển vào iframe mới

        await driver.sleep(5000);

        // const elementIframeModal = await driver.findElement(By.xpath("//div[@data-label='Profile type']//div[contains(@jsaction, 'click:')]"));
        const elementIframeModal = await driver.findElement(By.xpath("//input[@autocomplete='organization']"));
        await driver.sleep(2000);
        await driver.executeScript("arguments[0].focus();", elementIframeModal);

        // Tạo đối tượng Actions
        const actions = driver.actions({bridge: true});

        // Hover vào phần tử
        await actions.move({origin: elementIframeModal}).perform();

        // Click vào phần tử sau khi hover
        await elementIframeModal.click();


        await driver.sleep(2000);


        try {
            const checkProfilType = await waitForElementOrTimeoutReg(driver, `//li[.//span[normalize-space(text())='${formData.exampleProfileType}']]`, 1000, 4000)
            if (checkProfilType) {
                const xpathProfileType = `//li[.//span[normalize-space(text())='${formData.exampleProfileType}']]`;
                const btnProfileType = await driver.findElement(By.xpath(xpathProfileType));
                await driver.executeScript("arguments[0].click();", btnProfileType);

                await driver.sleep(2000);
            }


            //-------------------Nhập tên doanh nghiệp--------------------------------

            const xpath = "//input[@autocomplete='organization']";

            // Dùng executeScript để nhập giá trị
            await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value = arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpath, `${formData.exampleOrganizationName}`);
            await driver.sleep(2000);

        } catch (e) {
            console.error(e);
        }

        //-------------------Nhập tên pháp lý-------------------------
        const xpathName = "//input[@autocomplete='name']";

        // Dùng executeScript để nhập giá trị
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value = arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathName, `${formData.exampleLegalName}`);

        await driver.sleep(2000);
        //-------------------Nhập tên zip code-------------------------
        const xpathZipcode = "//input[@autocomplete='postal-code']";

        // Dùng executeScript để nhập giá trị
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value = arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathZipcode, `${formData.exampleZipcode}`);

        await driver.sleep(3000);
        //button[.//span[text()='Create']]
        const xpathCreatePayment = `//button[.//span[text()='Create']]`;
        const btnCreatePayment = await driver.findElement(By.xpath(xpathCreatePayment));
        await driver.executeScript("arguments[0].click();", btnCreatePayment);

        await driver.sleep(2000);
        await driver.switchTo().defaultContent();
        await driver.sleep(2000);
        //-------------------Thêm thẻ !!!!!!!!!!!--------------------------------
        //-----------------Nhấn vào submit--------------
        const xpathSubmit = `//material-button[.//div[text()='Submit']]`;
        const btnSubmit = await driver.findElement(By.xpath(xpathSubmit));
        await driver.executeScript("arguments[0].click();", btnSubmit);
        await driver.sleep(2000);
        const checkModalIframeY = await waitForElementOrTimeoutReg(driver, "(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]")
        if (checkModalIframeY) {
            const modalIframe2 = await driver.findElement(By.xpath("(//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')])[2]"));
            await driver.switchTo().frame(modalIframe2);
        }
        else {
            const modalIframe = await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/modaliframe?')]"));
            await driver.switchTo().frame(modalIframe);
        }
        await driver.sleep(4000);
        //-----------------Nhấn vào add thẻ--------------
        const xpathAddCard = `//div[contains(@jsaction, 'click:') and .//div[contains(text(), 'Add credit or debit card')]]`;
        const btnAddCard = await driver.findElement(By.xpath(xpathAddCard));
        await driver.executeScript("arguments[0].click();", btnAddCard);
        await driver.sleep(3000);
        //-----------------Nhập number card--------------

        const xpathNumberCard = "(//input[contains(@class, 'VfPpkd-fmcmS-wGMbrd')])[1]";
        // Dùng executeScript để nhập giá trị
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value = arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathNumberCard, `${formData.exampleNumberCard}`);
        await driver.sleep(3000);
        //-----------------Nhập MM--------------
        const xpathMMYY = "(//input[contains(@class, 'VfPpkd-fmcmS-wGMbrd')])[2]";
        // Dùng executeScript để nhập giá trị
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value = arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathMMYY, `${formData.exampleMM}`);
        await driver.sleep(3000);
        //-----------------Nhập YY--------------
        const shortYY = formData.exampleYY.slice(-2); // "28"

        // Dùng executeScript để nhập giá trị
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value += arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathMMYY, `${shortYY}`);
        await driver.sleep(3000);
        //-----------------Nhập Security code--------------
        const xpathSecurity = "(//input[contains(@class, 'VfPpkd-fmcmS-wGMbrd')])[3]";
        await driver.executeScript(`
    const element = document.evaluate(arguments[0], document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element) {
        element.value += arguments[1]; // Đặt giá trị mới
        element.dispatchEvent(new Event('input', { bubbles: true })); // Gửi sự kiện 'input' nếu cần
        console.log('Đã nhập giá trị:', arguments[1]);
    } else {
        console.error('Không tìm thấy phần tử với XPath:', arguments[0]);
    }
`, xpathSecurity, `${formData.exampleSecurityCode}`);
        await driver.sleep(3000);
        //-----------------Nhấn vào Save card--------------
        const xpathBtnSaveCard = `//button[.//span[text()='Save card']]`;
        const btnSaveCard = await driver.findElement(By.xpath(xpathBtnSaveCard));
        await driver.executeScript("arguments[0].click();", btnSaveCard);
        await driver.sleep(3000);
        await driver.switchTo().defaultContent();
        await driver.sleep(2000);
        // Chuyển vào iframe
        await driver.switchTo().frame(
            await driver.findElement(By.xpath("//iframe[contains(@src, 'https://payments.google.com/gp/w/u/0/buyflow2')]"))
        );
        await driver.sleep(3000);
        const checkAddCardSuccess = await waitForElementOrTimeoutReg(driver, "//legend[.//div[text()='Payment method']]", 20000, 1000);
        if (!checkAddCardSuccess) {
            updateStatus = "Error"
        }
        await driver.switchTo().defaultContent();
        await driver.sleep(2000);
        //-----------------Nhấn vào muốn liên hệ--------------
        const xpathConnect1 = `(//communications-opt-in)[1]//material-radio[.//div[text()='No']]`;
        const btnConnect1 = await driver.findElement(By.xpath(xpathConnect1));
        await driver.executeScript("arguments[0].click();", btnConnect1);
        await driver.sleep(2000);
        const xpathConnect2 = `(//communications-opt-in//material-radio[.//div[text()='No']])[2]`;
        const checkConnect2 = await waitForElementOrTimeoutReg(driver, "(//communications-opt-in//material-radio[.//div[text()='No']])[2]", 5000, 1000);
        if(checkConnect2){
            const btnConnect2 = await driver.findElement(By.xpath(xpathConnect2));
            await driver.executeScript("arguments[0].click();", btnConnect2);
            await driver.sleep(2000);
        }

        //-----------------Nhấn vào submit--------------
        const xpathSubmit2 = `//material-button[.//div[text()='Submit']]`;
        const btnSubmit2 = await driver.findElement(By.xpath(xpathSubmit2)); // Tìm lại phần tử
        await driver.executeScript("arguments[0].click();", btnSubmit2);
        await driver.sleep(8000);
        const finalReg = await waitForElementOrTimeoutReg(driver, "//p[text()='Your account was created']");
        if (!finalReg) {
            updateStatus = "Error"
            return
        }
        await driver.sleep(3000)

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

async function mainProcess(driver, formData, updateStatus) {
    // Bước bắt đầu: Truy cập vào trang
    await driver.get("https://ads.google.com/nav/selectaccount");
    await driver.sleep(2500)
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
    await driver.sleep(2000)
    // Đặt cookie AdsUserLocale với giá trị 'en' (tiếng Anh)
    await driver.manage().addCookie({
        name: 'AdsUserLocale',
        value: 'en',
        domain: '.ads.google.com',
        path: '/',
        secure: true,
        sameSite: 'Strict'
    });

    await driver.sleep(2000);
    console.log("SLEPP XONG")

    const waitTime = 5000;

    const ElmListAccount = await driver.findElements(By.xpath('//material-list-item[contains(@class, "user-customer-list-item")]'));
    const checkSetupReg = await waitForElementOrTimeoutReg(driver, "(//material-list-item[contains(@class, 'user-customer-list-item') and .//span[contains(text(), '(')]])[1]", 1000, 8000)
    if (checkSetupReg) {
        let xpathSelectSetupReg = "(//material-list-item[contains(@class, 'user-customer-list-item') and .//span[contains(text(), '(')]])[1]"; // XPath của phần tử cần cuộn tới
        const selectSetupRegBtn = await driver.wait(until.elementLocated(By.xpath(xpathSelectSetupReg)), 5000);
        await selectSetupRegBtn.click();
    }
    else if(ElmListAccount.length <= 0) {
        let xpathSelect = "/html/body/div[1]/root/div[2]/nav-view-loader/multiaccount-view/div/div[2]/div/div[3]/button/div[2]"; // XPath của phần tử cần cuộn tới
        const selectRegBtn = await driver.wait(until.elementLocated(By.xpath(xpathSelect)), 5000);
        await selectRegBtn.click();

    } else {
        let xpathSelect = "/html/body/div[1]/root/div[2]/nav-view-loader/multiaccount-view/div/div[2]/div/div[2]/button/div[2]"; // XPath của phần tử cần cuộn tới
        const selectRegBtn = await driver.wait(until.elementLocated(By.xpath(xpathSelect)), 5000);
        await selectRegBtn.click();
        await driver.sleep(5000);
        let isCheckMultiple = "//div[contains(@class, 'pane') and contains(@class, 'visible')]";
        const element = await driver.wait(until.elementLocated(By.xpath(isCheckMultiple)), 3000);
        if (element) {
            let xpathBtnSecond = await driver.wait(
                until.elementLocated(By.xpath("//div[contains(@class, 'draft-account-prompt-footer')]//button[contains(@class, 'mdc-button mdc-button--text mdc-button--icon-text dialog-button')]")),
                8000 // Thời gian chờ tối đa 8 giây
            );
            await driver.executeScript("arguments[0].scrollIntoView(true);", xpathBtnSecond);
            await driver.executeScript("arguments[0].click();", xpathBtnSecond);
            await driver.sleep(2000);
        }

    }
    await driver.sleep(4000);

    const checkFirstReg = await waitForElementOrTimeoutReg(driver, "//div[contains(@class, 'ACCOUNT_ONBOARDING')]", 1000, 10000);
    if (!checkFirstReg) {
        updateStatus = "Error";
        return;
    }

    let xpathRegCam = "(//button[.//material-ripple[contains(@class, 'mdc-button__ripple')]])[3]";
    const checkFirstSetup = await waitForElementOrTimeoutReg(driver, xpathRegCam, 1000, 6000);
    if(checkFirstSetup) {
        const btnRegCam = await driver.wait(until.elementLocated(By.xpath(xpathRegCam)), 4000);
        await driver.actions().move({origin: btnRegCam}).click().perform();
        await driver.sleep(2000);

        //-------------------Nhập trang web của tôi và tiếp-------------------------
        const inputWebsite = await driver.wait(until.elementLocated(By.xpath("/html/body/div[1]/root/div/div[1]/div[2]/div/div[3]/div/div/awsm-child-content/content-main/div/div[1]/account-onboarding-root/div/div/view-loader/business-root/div[1]/left-stepper/div[1]/div[1]/div[1]/left-stepper-content/dynamic-component/business-name-wrapper/div/business-name-view/div/div[2]/material-radio-group/div[1]/div/material-input/div[1]/div[1]/label/input")), waitTime);
        await enterTextIntoInput(driver, inputWebsite, formData.exampleWebsite);
        await driver.sleep(2000);

        let xpathCtnWebsite = "(//material-button[contains(@class, 'next-button') and contains(@role, 'button')])[1]";
        const btnCtnWebsite = await driver.findElement(By.xpath(xpathCtnWebsite));

        // Cuộn đến phần tử
        await driver.executeScript("arguments[0].scrollIntoView(true);", btnCtnWebsite);
        await driver.sleep(2000);

        // Sử dụng Actions để di chuyển và nhấp
        await driver.actions().move({origin: btnCtnWebsite}).click().perform();

        await driver.sleep(4000);
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

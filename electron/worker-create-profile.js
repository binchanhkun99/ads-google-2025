const {parentPort, workerData} = require('worker_threads');

const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const {line, nameGroup, apiUrl, winPos} = workerData;

(async () => {

    try {
        // Nhận dữ liệu từ workerData
        const [user, pass, mailReco, proxy, isProvide] = line.trim().split('|');
        const fullProxy = isProvide ? `${proxy}|${isProvide}` : proxy;

        // Payload để tạo profile
        const payload = {
            profile_name: `${user} Pending`,
            group_name: nameGroup,
            browser_core: "chromium",
            browser_name: "Chrome",
            browser_version: "129.0.6533.73",
            is_random_browser_version: false,
            raw_proxy: fullProxy || '',
            startup_urls: "",
            is_masked_font: true,
            is_noise_canvas: false,
            is_noise_webgl: false,
            is_noise_client_rect: false,
            is_noise_audio_context: true,
            is_random_screen: false,
            is_masked_webgl_data: true,
            is_masked_media_device: true,
            is_random_os: false,
            os: "Windows 11",
            webrtc_mode: 2,
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        };

        // Gửi yêu cầu tạo profile
        const response = await axios.post(`${apiUrl}/api/v3/profiles/create`, payload);
        if (response.data.success && response.data.data.id) {
            const profileId = response.data.data.id;
            // Gửi yêu cầu khởi động profile
            const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${profileId}?win_pos=${winPos.x},${winPos.y}&win_size=${winPos.width},${winPos.height}`);
            const driverPath = startResponse.data.data.driver_path;
            const remoteDebuggingAddress = startResponse.data.data.remote_debugging_address;

            // Thực hiện quá trình tạo và đăng nhập với Selenium
            await createAndLogin(driverPath, remoteDebuggingAddress, user, pass, mailReco, fullProxy, profileId);
        }

        // Gửi thông báo thành công
        parentPort.postMessage({success: true});
    } catch (error) {
        console.error("Worker error:", error.message);
        parentPort.postMessage({success: false, error: error.message});
    }
})();

async function createAndLogin(driverPath, remoteDebuggingAddress, user, pass, mailReco, proxy, profileId) {
    let driver;
    let updateStatus = "Error"; // Mặc định là "Error"
    const debugPortLogin = remoteDebuggingAddress.split(":")[1];
    const options = new chrome.Options();
    options.setChromeBinaryPath(driverPath);
    options.addArguments(
        '--no-sandbox',
        '--remote-debugging-port=' + debugPortLogin,
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

    await driver.get('https://accounts.google.com/');
    const waitTime = 10000;
    try {
        const loginFormElement = await driver.wait(until.elementLocated(By.xpath('//input[@type="email"]')), waitTime);

        if (loginFormElement) {
            await handleInputAndContinue(driver, '//input[@type="email"]', '(//button[contains(@jsaction, "click:")])[2]', user, waitTime);
            await driver.sleep(3000);

            await handleInputAndContinue(driver, '//input[@type="password" and @name="Passwd"]', '(//button[contains(@jsaction, "click:")])[2]', pass, waitTime);
            await driver.sleep(4000);

            const elements = await driver.findElements(By.xpath('//div[@data-challengeid="5"]'));
            if (elements.length > 0) {
                const btnMailReco = elements[0];
                await btnMailReco.click();
                await driver.sleep(5000);
                await handleInputAndContinue(driver, '//input[@type="email" and @name="knowledgePreregisteredEmailResponse"]', '(//button[contains(@jsaction, "click:")])[1]', mailReco, waitTime);
                await driver.sleep(5000);
            } else {
                await driver.sleep(5000);
            }
            const checkSmartLogin = await driver.findElement(By.xpath('//img[contains(@src, "https://ssl.gstatic.com/accounts/marc/passkey_enrollment.svg")]'))
                .catch(() => null); // Trả về `null` nếu không tìm thấy

            if (checkSmartLogin) {
                const xpathBtnSkip = '(//button[contains(@jsaction, "click:")])[2]'
                const btnSkip = await driver.findElement(By.xpath(xpathBtnSkip));
                await btnSkip.click();
                await driver.sleep(5000);
            }

            await driver.get('https://accounts.google.com/');
            const finalLogin = await driver.findElement(By.xpath('//a[contains(@href, "https://www.google.com/account/about/")]'))
                .catch(() => null); // Trả về `null` nếu không tìm thấy

            if (finalLogin) {
                console.log("ok");
                updateStatus = ""; // Cập nhật trạng thái thành công
            } else {
                console.error("Final login element not found, login failed.");
                updateStatus = "Error"; // Trạng thái lỗi
            }
        }
    } catch (error) {
        console.error("Login error:", error);
    } finally {
        try {
            await axios.post(`${apiUrl}/api/v3/profiles/close/${profileId}`);
            await axios.post(`${apiUrl}/api/v3/profiles/update/${profileId}`, {
                profile_name: user + " " + updateStatus,
            });
        } catch (err) {
            console.error("Error during API calls:", err);
        }

        if (driver) {
            await driver.quit();
        }
    }
}

async function handleInputAndContinue(driver, xpathInput, xpathButton, value, waitTime = 10000) {
    try {
        const inputElement = await driver.wait(until.elementLocated(By.xpath(xpathInput)), waitTime);
        await inputElement.click();
        await driver.sleep(3000);

        await enterTextIntoInput(driver, inputElement, value);
        await driver.sleep(5000);
        const continueButton = await driver.findElement(By.xpath(xpathButton));
        await driver.sleep(5000);

        await continueButton.click();
        const checkCaptcha = await waitForElementOrTimeout(driver, "(//iframe[contains(@src, 'https://www.google.com/recaptcha/api2') and contains(@title, 'reCAPTCHA')])[2]", 1000, 6500)
        if(checkCaptcha) {
            await switchToIframe(driver, "(//iframe[contains(@src, 'https://www.google.com/recaptcha/api2') and contains(@title, 'reCAPTCHA')])[2]");
            await waitForElementOrTimeout(driver, "//span[contains(@class, 'recaptcha-checkbox') and contains(@class, 'rc-anchor-checkbox') and contains(@aria-checked, 'true')]", 1000, 200000)
            await driver.switchTo().defaultContent();
            const continueButton2 = await driver.findElement(By.xpath(xpathButton));
            await continueButton2.click();
        }


    } catch (error) {
        console.error(`Error in handleInputAndContinue: ${error.message}`);
        throw new Error("Process stopped due to an error.");
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

function randomBetween400And700() {
    return Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
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

module.exports = createAndLogin;

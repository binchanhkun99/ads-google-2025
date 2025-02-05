const {parentPort, workerData} = require('worker_threads');
const axios = require('axios');
const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const {apiUrl} = workerData;

const openMultipleProfile = async (item) => {
    try {
        const startResponse = await axios.get(`${apiUrl}/api/v3/profiles/start/${item.id}`);
        console.log(startResponse.data);
        return {success: true, error: null, data: startResponse.data};

    } catch (error) {
        console.error(error);
    }
}
parentPort.on('message', async (item) => {
    const result = await openMultipleProfile(item);
    parentPort.postMessage(result);
});

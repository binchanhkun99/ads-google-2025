const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    fetchAPI: (url) => ipcRenderer.invoke('fetch-api', url),
    importFile: () => ipcRenderer.invoke('import-file'),
    invokeReadFile: () => ipcRenderer.invoke('read-file'),

    invokeReadFileLimit: () => ipcRenderer.invoke('read-file-limit'),
    invokeSaveFileLimit: (data) => ipcRenderer.invoke('save-file-limit', data),

    invokeReadFileReg: () => ipcRenderer.invoke('read-file-reg'),
    invokeSaveFileReg: (data) => ipcRenderer.invoke('save-file-reg', data),

    importExcelFile: () => ipcRenderer.invoke('import-excel-file'),
    readExcelSetup: () => ipcRenderer.invoke('read-excel-setup'),
    invokeReadId: () => ipcRenderer.invoke('read-id'),
    openProfile: (idProfile, apiUrl) => ipcRenderer.invoke('open-profile', idProfile, apiUrl),
    closeProfile: (idProfile, apiUrl) => ipcRenderer.invoke('close-profile', idProfile, apiUrl),
    invokeSaveFile: (data) => ipcRenderer.invoke('save-file', data),
    invokeSaveIdGroup: (id, apiUrl) => ipcRenderer.invoke('save-id', id, apiUrl),
    createProfile: (content, groups, numberThreads, apiUrl) => ipcRenderer.invoke('create-profile', content, groups, numberThreads, apiUrl),
    checkLive: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('check-live', dataJSON, numberThreads, apiUrl),
    // Lắng nghe sự kiện từ main process và truyền ra ngoài cho renderer
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    openMultipleProfile: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('open-multiple-profile', dataJSON, numberThreads, apiUrl),
    // Tắt sự kiện để tránh rò rỉ bộ nhớ khi không cần thiết
    off: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },
    adsAppeal: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('ads-appeal', dataJSON, numberThreads, apiUrl),
    adsLimitAppeal: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('ads-limit-appeal', dataJSON, numberThreads, apiUrl),

    regAdsSelenium: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('ads-reg', dataJSON, numberThreads, apiUrl),
    onlyReg: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('only-reg', dataJSON, numberThreads, apiUrl),
    onlyVerify: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('only-verify', dataJSON, numberThreads, apiUrl),
    autoSetCamp: (dataJSON, numberThreads, apiUrl) => ipcRenderer.invoke('auto-set-camp', dataJSON, numberThreads, apiUrl)

});

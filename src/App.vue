<script setup>
import {ref, onMounted, reactive, onUnmounted} from 'vue';
import {notify} from "@kyvg/vue3-notification";
import axios from "axios";

const currentTime = ref("");
const apiUrl = ref('http://127.0.0.1:19995');
import CreditCard from './components/CreditCard.vue'

let intervalId = null;
const isLoading = ref(false);
const dataProfile = ref([])
const isPopupOpen = ref(false);
const showPopup = ref(false);
let updateProfileDataListener = null; // Lưu trữ listener
const idGroup = ref('')
const isPopupOpen1 = ref(false);
const selectedOption = ref(null);

const options = [
  { value: 'regFull', display: 'Chạy full' },
  { value: 'onlyReg', display: 'Chỉ chạy reg' },
  { value: 'onlyVerify', display: 'Chỉ chạy verify' },
];

const openPopup = () => {
  isPopupOpen1.value = true;
};

const closePopup = () => {
  isPopupOpen1.value = false;
  selectedOption.value = null;
};

const selectOption = (option) => {
  selectedOption.value = option;
};
const getSelectedDisplay = () => {
  const selected = options.find(option => option.value === selectedOption.value);
  return selected ? selected.display : 'Chưa chọn';
};

const startReg = async () => {
  if (selectedOption.value) {
    const selected = options.find(option => option.value === selectedOption.value);
    console.log(`Bắt đầu với lựa chọn: ${selected.display} (giá trị: ${selected.value})`);

    const selectedAccounts = dataProfile.value.filter(item => item.selected);
    if (selectedAccounts.length <= 0) {
      notify({
        type: 'error',
        title: "Lỗi",
        text: "Vui lòng chọn tài khoản để chạy",
      });
      return;
    }
    const dataJSON = JSON.stringify(selectedAccounts);
    if(selected.value === 'regFull') {
      closePopup()
      const result = await window.electronAPI.regAdsSelenium(dataJSON, numberThreads.value, apiUrl.value);

    }
    else if(selected.value === 'onlyReg') {
      closePopup()
      const result = await window.electronAPI.onlyReg(dataJSON, numberThreads.value, apiUrl.value);
    }
    else if(selected.value === 'onlyVerify') {
      closePopup()
      const result = await window.electronAPI.onlyVerify(dataJSON, numberThreads.value, apiUrl.value);
    }

    notify({
      type: 'success',
      title: "Thành công",
      text: "Kiểm tra thành công",
    });
    closePopup();
  } else {
    alert('Vui lòng chọn một lựa chọn trước khi bắt đầu.');
  }
}


const ProfileType = [
  {label: 'Organization', value: 'Organization'},
  {label: 'Individual', value: 'Individual'},

];
const MessagingType = [
  {label: 'Yes', value: 'Yes'},
  {label: 'No', value: 'No'},

];
const AdvertisingAgenCyType = [
  {label: 'Yes', value: 'Yes'},
  {label: 'No', value: 'No'},

];
const organizationAdvertising = [
  {label: 'Yes', value: 'Yes'},
  {label: 'No', value: 'No'},
];
const wantVerifyToday = [
  {label: 'My agency', value: 'My agency'},
  {label: 'A client', value: 'A client'},
];
const exampleYourOwnBusinessLimit = [
  {label: 'Yes', value: 'Yes'},
  {label: 'No', value: 'No'},
];
const examplePrimaryPaymentMethodLimit = [
  {label: 'Yes', value: 'Yes'},
  {label: 'No', value: 'No'},
];
const agencyPayFor = [
  {label: 'Yes, we pay for this account', value: 'Yes, we pay for this account'},
  {label: 'No, our client pays for this account', value: 'No, our client pays for this account'},
];

const whoPayAds = [
  {label: 'Yes, we pay Google Ads directly', value: 'Yes, we pay Google Ads directly'},
  {label: 'No, an agency pays and invoices us', value: 'No, an agency pays and invoices us'},
];
// Dữ liệu form
const formData = ref({
  exampleCompanyName: '',
  exampleWebsite: '',
  exampleKeyWord: '',
  exampleAddress: '',
  exampleZipCode: '',
  exampleCity: '',
  exampleCityCountry: '',
  exampleNumberAccount: '',
  exampleAdsBusiness: '',
  exampleWhoPay: '',
  exampleSelectPayment: '',
  exampleRecentDatePay: '',
  exampleBusinessCountry: '',
  exampleDescrible: '',
  exampleRelationShip: '',
  exampleOwnerDomain: '',
  exampleSelectConnect: '',
  examplePrefixPhoneNumber: '',
  examplePhoneNumber: '',
  exampleTimeConnect: '',
  exampleProblemSummary: '',
});

const formDataLimit = ref({
  exampleCompanyNameLimit: '',
  examplePrefixPhoneNumberLimit: '',
  examplePhoneNumberLimit: '',
  exampleWebsiteLimit: '',
  exampleAddressLimit: '',
  exampleZipCodeLimit: '',
  exampleCityLimit: '',
  exampleBillingCountryLimit: '',
  exampleYourOwnBusinessLimit: '',
  examplePrimaryPaymentMethodLimit: '',
  exampleDatePaymentMethodLimit: '',
  exampleBusinessServeLimit: '',
  exampleDescriptionBusinessLimit: '',
  exampleJustificationLimit: '',
  exampleProblemSummaryLimit: '',
  exampleLinkImageLimit: ''
});

const formDataReg = ref({
  exampleWebsite: '',
  exampleBillingCountry: '',
  exampleCurrency: '',
  exampleProfileType: '',
  exampleOrganizationName: '',
  exampleLegalName: '',
  exampleZipcode: '',
  exampleNumberCard: '',
  exampleNameHolder: '',
  exampleSecurityCode: '',
  exampleMM: '',
  exampleYY: '',
  exampleMessagingApp: '',
  exampleAdvertisingAgenCy: '',
  exampleAddress: '',
  exampleCity: '',
  exampleState: '',
  exampleZipCode2: '',
  exampleOrganizationAds: '',
  exampleWantVerifyToday: '',
  exampleAgencyPayFor: '',
  exampleWhoPayFor: '',




  exampleAdsBusiness: '',
  exampleWhoPay: '',
  exampleSelectPayment: '',
  exampleRecentDatePay: '',
  exampleBusinessCountry: '',
  exampleDescrible: '',
  exampleRelationShip: '',
  exampleOwnerDomain: '',
  exampleSelectConnect: '',
  examplePrefixPhoneNumber: '',
  examplePhoneNumber: '',
  exampleTimeConnect: '',
  exampleProblemSummary: '',
});

const updateCurrentTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString();
};
const setupReg = async () => {
  activeTab.value = 'tab2'
  isLoading.value = true;
  const result = await window.electronAPI.invokeReadFileReg();
  if (result) {
    const lines = result.split("\n");
    formDataReg.value = {
      exampleWebsite: lines[0] || '',
      exampleBillingCountry: lines[1] || '',
      exampleCurrency: lines[2] || '',
      exampleProfileType: lines[3] || '',
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
  }
  isLoading.value = false;
}

const setup = async () => {
  isLoading.value = true;
  const result = await window.electronAPI.invokeReadFile();
  isPopupOpen.value = true;
  if (result) {
    const lines = result.split("\n");
    formData.value = {
      exampleCompanyName: lines[0] || '',
      exampleWebsite: lines[1] || '',
      exampleKeyWord: lines[2] || '',
      exampleAddress: lines[3] || '',
      exampleZipCode: lines[4] || '',
      exampleCity: lines[5] || '',
      exampleCityCountry: lines[6] || '',
      exampleNumberAccount: lines[7] || '',
      exampleAdsBusiness: lines[8] || '',
      exampleWhoPay: lines[9] || '',
      exampleSelectPayment: lines[10] || '',
      exampleRecentDatePay: lines[11] || '',
      exampleBusinessCountry: lines[12] || '',
      exampleDescrible: lines[13] || '',
      exampleRelationShip: lines[14] || '',
      exampleOwnerDomain: lines[15] || '',
      exampleSelectConnect: lines[16] || '',
      examplePrefixPhoneNumber: lines[17] || '',
      examplePhoneNumber: lines[18] || '',
      exampleTimeConnect: lines[19] || '',
      exampleProblemSummary: lines[20] || '',
    };
  }
  isLoading.value = false;
};
const setupAppealLimit = async () => {
  isLoading.value = true;
  activeTab.value = 'tab3'

  const result = await window.electronAPI.invokeReadFileLimit();
  isPopupOpen.value = true;
  if (result) {
    const lines = result.split("\n");
    formDataLimit.value = {
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
  }
  isLoading.value = false;
};

const saveData = async () => {
  isPopupOpen.value = true;
  const dataToSave = Object.values(formData.value).join("\n");
  await window.electronAPI.invokeSaveFile(dataToSave);
  isPopupOpen.value = false;
  notify({
    type: 'success',
    title: "Thành công",
    text: "Lưu file setup thành công"
  });
};
const saveDataReg = async () => {
  isPopupOpen.value = true;
  const dataToSave = Object.values(formDataReg.value).join("\n");
  await window.electronAPI.invokeSaveFileReg(dataToSave);
  isPopupOpen.value = false;
  notify({
    type: 'success',
    title: "Thành công",
    text: "Lưu file setup thành công"
  });
};
const saveDataLimit = async () => {
  isPopupOpen.value = true;
  const dataToSave = Object.values(formDataReg.value).join("\n");
  await window.electronAPI.invokeSaveFileLimit(dataToSave);
  isPopupOpen.value = false;
  notify({
    type: 'success',
    title: "Thành công",
    text: "Lưu file setup thành công"
  });
};
const selectGroup = async () => {
  try {
    await callAPI(idGroup.value)
    const rs = await window.electronAPI.invokeSaveIdGroup(idGroup.value, apiUrl.value);
    console.log(rs)

  } catch (error) {
    console.log(error)
  }


}
const callAPI = async (idValue) => {
  try {
    if (idValue === "") {
      let id = await window.electronAPI.invokeReadId()
      if (id) {
        idGroup.value = id
      }
      console.log(apiUrl.value)
      const result = await window.electronAPI.fetchAPI(`${apiUrl.value}/api/v3/profiles?group_id=${id || 1}&page=1&per_page=100`);
      // Kiểm tra dữ liệu có hợp lệ không, sau đó thêm trường `selected` vào mỗi phần tử
      if (result.data && Array.isArray(result.data)) {
        dataProfile.value = result.data.map(item => ({...item, selected: false}));
      } else {
        // Nếu dữ liệu không hợp lệ
        dataProfile.value = [];
      }
    } else {
      const result = await window.electronAPI.fetchAPI(`${apiUrl.value}/api/v3/profiles?group_id=${idValue}&page=1&per_page=100`);
      if (result.data && Array.isArray(result.data)) {
        dataProfile.value = result.data.map(item => ({...item, selected: false}));
      } else {
        // Nếu dữ liệu không hợp lệ
        dataProfile.value = [];
      }
    }

  } catch (error) {
    console.log(error);
  }
};


const fileContent = ref('');
const results = ref([]);
const groups = ref('');
const numberThreads = ref(5)
const createProfile = async () => {
  showPopup.value = false;
  filePath.value = '';
  if (!groups.value) {
    alert('Vui lòng nhập id groups!');
    return;
  }
  if (!fileContent.value) {
    alert('Vui lòng import file!');
    return;
  }
  const result = await window.electronAPI.createProfile(fileContent.value, groups.value, numberThreads.value, apiUrl.value);
  if (result.success) {
    notify({
      type: 'success',
      title: "Thành công",
      text: "Đăng nhập và tạo mới thành công",
    });
  } else console.log(result);

}
const filePath = ref('');
const importFile = async () => {
  try {
    // isLoading.value = true;
    const result = await window.electronAPI.importFile();
    if (result.success) {
      fileContent.value = result.content; // Nội dung file TXT
      filePath.value = result.filePath;
      notify({
        type: 'success',
        title: "Thành công",
        text: "Import file thành công 🎉",
      });
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error('Error importing file:', error);
  } finally {
    // isLoading.value = false;
  }
};


// -----------------MỞ PROFILE
const isOpen = ref(true);

async function openProfile(id) {
  try {
    const rs = await window.electronAPI.openProfile(id, apiUrl.value);
    if (rs.success) {
      dataProfile.value.forEach(item => {
        if (item.id === id) {
          item.open = isOpen.value;
        }
      });
    }
  } catch (error) {
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Có lỗi xảy ra",
    });
  }

}

async function closeProfile(id) {
  try {
    const rs = await window.electronAPI.closeProfile(id, apiUrl.value);
    if (rs.success) {
      dataProfile.value.forEach(item => {
        if (item.id === id) {
          item.open = !isOpen.value;
        }
      });
    }

  } catch (error) {
    console.log(error);

  }
}

const activeTab = ref('tab1'); // Default tab

async function openMultipleProfile() {
  try {
    // Lọc các tài khoản đã được chọn
    const selectedAccounts = dataProfile.value.filter(item => item.selected);

    // Kiểm tra nếu không có tài khoản nào được chọn
    if (selectedAccounts.length <= 0) {
      notify({
        type: 'error',
        title: "Lỗi",
        text: "Vui lòng chọn profile để chạy",
      });
      return;
    }

    // Chuyển selectedAccounts thành JSON để gửi đi
    const dataJSON = JSON.stringify(selectedAccounts);

    // Gửi yêu cầu API và nhận kết quả
    const rs = await window.electronAPI.openMultipleProfile(dataJSON, numberThreads.value, apiUrl.value);

    // Lấy tất cả profile_id từ kết quả trả về và tạo một mảng profile_id
    const profileIdsFromApi = rs.data.map(item => item.data.data.profile_id);
    // Duyệt qua các tài khoản trong dataProfile và kiểm tra xem có trùng profile_id không
    dataProfile.value.forEach(item => {
      if (item.selected) {
        // Duyệt qua tất cả profileIdsFromApi để kiểm tra sự trùng khớp
        profileIdsFromApi.forEach(profileId => {

          if (item.id === profileId) {
            item.open = isOpen.value;  // Thêm trường .open nếu profile_id trùng
          }
        });
      }
    });

    // In ra kết quả sau khi cập nhật
    console.log("Cập nhật với trường .open:", dataProfile.value);

  } catch (error) {
    // Xử lý lỗi nếu có
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Có lỗi xảy ra",
    });
  }
}


async function checkLive() {
  const selectedAccounts = dataProfile.value.filter(item => item.selected);
  if (selectedAccounts.length <= 0) {
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Vui lòng chọn tài khoản để chạy",
    });
    return;
  }
  const dataJSON = JSON.stringify(selectedAccounts);
  const result = await window.electronAPI.checkLive(dataJSON, numberThreads.value, apiUrl.value);

  notify({
    type: 'success',
    title: "Thành công",
    text: "Kiểm tra thành công",
  });
  if (result.success) {
    // Gọi API khác nếu cần
    await callAPI(idGroup.value);
    // Duyệt qua kết quả trả về và cập nhật vào dataProfile
    result.data.forEach((itemChecked) => {
      // Tìm profile theo ID
      const profile = dataProfile.value.find((p) => p.id === itemChecked.id);
      if (profile) {
        // Thêm trạng thái hoặc các thông tin khác vào profile
        if (!profile.statuses) {
          profile.statuses = []; // Tạo mảng nếu chưa tồn tại
        }

        // Gộp danh sách trạng thái vào profilea
        itemChecked.data.forEach((statusItem) => {
          const existingStatus = profile.statuses.find((s) => s.id === statusItem.id);
          if (!existingStatus) {
            profile.statuses.push({
              id: statusItem.id,
              status: statusItem.status,
            });
          }
        });
      }
    });

  }
}

onMounted(() => {
  callAPI(idGroup.value);
  updateCurrentTime();


  intervalId = setInterval(updateCurrentTime, 1000);
  // Đăng ký listener và lưu lại
  updateProfileDataListener = () => {
    callAPI(idGroup.value);
  };
  window.electronAPI.on('update-profile-data', updateProfileDataListener);
});


// ----------------------CHỌN NHIỀU TÀI KHOẢN
const selectAll = ref(false);

const toggleSelectAll = () => {
  dataProfile.value.forEach(item => {
    item.selected = selectAll.value;
  });
};
const submitSelected = () => {
  const selectedAccounts = dataProfile.value.filter(item => item.selected);
  if (selectedAccounts.length <= 0) {
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Vui lòng chọn tài khoản để chạy",
    });
    return;

  }

  const dataJSON = JSON.stringify(selectedAccounts);
  // Gửi dữ liệu qua Electron
  window.electronAPI.adsAppeal(dataJSON, numberThreads.value, apiUrl.value);
};


const updateSelectAll = () => {
  selectAll.value = dataProfile.value.every(item => item.selected);
};
// ----------------------REG ADS ACC

const appealLimitAds = async () => {
  const selectedAccounts = dataProfile.value.filter(item => item.selected);
  if (selectedAccounts.length <= 0) {
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Vui lòng chọn tài khoản để chạy",
    });
    return;

  }
  const dataJSON = JSON.stringify(selectedAccounts);
  await window.electronAPI.adsLimitAppeal(dataJSON, numberThreads.value, apiUrl.value);


}
onUnmounted(() => {
  clearInterval(intervalId);
  // Hủy đăng ký listener
  if (updateProfileDataListener) {
    window.electronAPI.off('update-profile-data', updateProfileDataListener);
  }
});


</script>

<template>
  <notifications style="margin-top: 12px" position="top center"/>

  <span class="loader" v-if="isLoading"></span>

  <div class="wrapper" v-if="!isLoading">
    <div
        style="width: 20px"></div>
    <!--    <div class="left-side">-->

    <!--    </div>-->
    <div class="main-container">
      <div class="header">
        <div class="logo">Google
          <span class=logo-det>Ads</span></div>

        <div class="user-info">
          <div class="hour">{{ currentTime }}</div>

          <svg class="profile" viewBox="-42 0 512 512" fill="currentColor">
            <path
                d="M210.4 246.6c33.8 0 63.2-12.1 87.1-36.1 24-24 36.2-53.3 36.2-87.2 0-33.9-12.2-63.2-36.2-87.2-24-24-53.3-36.1-87.1-36.1-34 0-63.3 12.2-87.2 36.1S87 89.4 87 123.3c0 33.9 12.2 63.2 36.2 87.2 24 24 53.3 36.1 87.2 36.1zm-66-189.3a89.1 89.1 0 0166-27.3c26 0 47.5 9 66 27.3a89.2 89.2 0 0127.3 66c0 26-9 47.6-27.4 66a89.1 89.1 0 01-66 27.3c-26 0-47.5-9-66-27.3a89.1 89.1 0 01-27.3-66c0-26 9-47.6 27.4-66zm0 0M426.1 393.7a304.6 304.6 0 00-12-64.9 160.7 160.7 0 00-13.5-30.3c-5.7-10.2-12.5-19-20.1-26.3a88.9 88.9 0 00-29-18.2 100.1 100.1 0 00-37-6.7c-5.2 0-10.2 2.2-20 8.5-6 4-13 8.5-20.9 13.5-6.7 4.3-15.8 8.3-27 11.9a107.3 107.3 0 01-66 0 119.3 119.3 0 01-27-12l-21-13.4c-9.7-6.3-14.8-8.5-20-8.5a100 100 0 00-37 6.7 88.8 88.8 0 00-29 18.2 114.4 114.4 0 00-20.1 26.3 161 161 0 00-13.4 30.3A302.5 302.5 0 001 393.7c-.7 9.8-1 20-1 30.2 0 26.8 8.5 48.4 25.3 64.4C41.8 504 63.6 512 90.3 512h246.5c26.7 0 48.6-8 65.1-23.7 16.8-16 25.3-37.6 25.3-64.4a437 437 0 00-1-30.2zm-44.9 72.8c-11 10.4-25.4 15.5-44.4 15.5H90.3c-19 0-33.4-5-44.4-15.5C35.2 456.3 30 442.4 30 424c0-9.5.3-19 1-28.1A272.9 272.9 0 0141.7 338a131 131 0 0110.9-24.7A84.8 84.8 0 0167.4 294a59 59 0 0119.3-12 69 69 0 0123.6-4.5c1 .5 3 1.6 6 3.6l21 13.6c9 5.6 20.4 10.7 34 15.1a137.3 137.3 0 0084.5 0c13.7-4.4 25.1-9.5 34-15.1a2721 2721 0 0027-17.2 69 69 0 0123.7 4.5 59 59 0 0119.2 12 84.5 84.5 0 0114.9 19.4c4.5 8 8.2 16.3 10.8 24.7a275.2 275.2 0 0110.8 57.8c.6 9 1 18.5 1 28.1 0 18.5-5.3 32.4-16 42.6zm0 0"/>
          </svg>
        </div>
      </div>
      <div class="user-box first-box">
        <button class="p-4" @click="showPopup=true">Tạo Profile</button>
        <!--        @click="processFile"-->
        <button class="button-85" @click="submitSelected" role="button">Chạy kháng</button>
        <button class="button-85" @click="appealLimitAds" role="button">Kháng limit 2$</button>

        <button class="p-4" style="background-color: #0ab50b; color: #ffffff" @click="checkLive">Check Live</button>
<!--        <button class="button-85" @click="regAds" role="button">Chạy Reg</button>-->
        <button class="button-85" @click="openPopup" role="button">Chạy Reg</button>
        <button class="p-4" style="background-color: #ffffff; color: #000000" @click="setup">Setup</button>
        <button class="p-4" style="background-color: #ffffff; color: #000000" @click="openMultipleProfile">Mở Profile</button>

      </div>
      <div class="user-box second-box">
        <div class="cards-wrapper" style="--delay: 1s">
          <div class="cards-header">

            <div style="display: flex; align-items: center; justify-content: center; gap: 4px">
              <span>Groups:</span><input
                style="background-color: black; color: white; height: 30px; width: 40px; padding: 4px" type="text"
                v-model="idGroup" placeholder="Là số id VD: 1">
              <button class="p-3" style="height: 30px" @click="selectGroup">

                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="fill:white;">
                  <path
                      d="M16.242 17.242a6.04 6.04 0 0 1-1.37 1.027l.961 1.754a8.068 8.068 0 0 0 2.569-2.225l-1.6-1.201a5.938 5.938 0 0 1-.56.645zm1.743-4.671a5.975 5.975 0 0 1-.362 2.528l1.873.701a7.977 7.977 0 0 0 .483-3.371l-1.994.142zm1.512-2.368a8.048 8.048 0 0 0-1.841-2.859l-1.414 1.414a6.071 6.071 0 0 1 1.382 2.146l1.873-.701zm-8.128 8.763c-.047-.005-.094-.015-.141-.021a6.701 6.701 0 0 1-.468-.075 5.923 5.923 0 0 1-2.421-1.122 5.954 5.954 0 0 1-.583-.506 6.138 6.138 0 0 1-.516-.597 5.91 5.91 0 0 1-.891-1.634 6.086 6.086 0 0 1-.247-.902c-.008-.043-.012-.088-.019-.131A6.332 6.332 0 0 1 6 13.002V13c0-1.603.624-3.109 1.758-4.242A5.944 5.944 0 0 1 11 7.089V10l5-4-5-4v3.069a7.917 7.917 0 0 0-4.656 2.275A7.936 7.936 0 0 0 4 12.999v.009c0 .253.014.504.037.753.007.076.021.15.03.227.021.172.044.345.076.516.019.1.044.196.066.295.032.142.065.283.105.423.032.112.07.223.107.333.026.079.047.159.076.237l.008-.003A7.948 7.948 0 0 0 5.6 17.785l-.007.005c.021.028.049.053.07.081.211.272.433.538.681.785a8.236 8.236 0 0 0 .966.816c.265.192.537.372.821.529l.028.019.001-.001a7.877 7.877 0 0 0 2.136.795l-.001.005.053.009c.201.042.405.071.61.098.069.009.138.023.207.03a8.038 8.038 0 0 0 2.532-.137l-.424-1.955a6.11 6.11 0 0 1-1.904.102z"></path>
                </svg>
              </button>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px">
              <span>API URL:</span><input
                style="background-color: black; color: white; height: 30px; width: 180px; padding: 4px" type="text"
                v-model="apiUrl" placeholder="Là số id VD: 1">

            </div>

            <div style="display: flex; align-items: center; justify-content: center; gap: 4px">
              <span>Số luồng:</span>
              <div><input style="background-color: black; color: white; height: 30px; width: 40px; padding: 4px"
                          type="text" v-model="numberThreads" placeholder="Là luồng VD:1"></div>
            </div>

          </div>

          <div class="cards card">
            <h1 class="h1-not-found" v-if="dataProfile.length===0" style="align-items: center">
              <svg class="ml-0-" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" style="fill: white;">
                <path
                    d="M22 8a.76.76 0 0 0 0-.21v-.08a.77.77 0 0 0-.07-.16.35.35 0 0 0-.05-.08l-.1-.13-.08-.06-.12-.09-9-5a1 1 0 0 0-1 0l-9 5-.09.07-.11.08a.41.41 0 0 0-.07.11.39.39 0 0 0-.08.1.59.59 0 0 0-.06.14.3.3 0 0 0 0 .1A.76.76 0 0 0 2 8v8a1 1 0 0 0 .52.87l9 5a.75.75 0 0 0 .13.06h.1a1.06 1.06 0 0 0 .5 0h.1l.14-.06 9-5A1 1 0 0 0 22 16V8zm-10 3.87L5.06 8l2.76-1.52 6.83 3.9zm0-7.72L18.94 8 16.7 9.25 9.87 5.34zM4 9.7l7 3.92v5.68l-7-3.89zm9 9.6v-5.68l3-1.68V15l2-1v-3.18l2-1.11v5.7z"></path>
              </svg>
            </h1>
            <table class="table" v-if="dataProfile.length > 0">
              <thead>
              <tr >
                <th style="font-weight: bold">
                  <input
                      type="checkbox"
                      v-model="selectAll"
                      @change="toggleSelectAll"
                  />
                </th>
                <th style="font-weight: bold">Email/Profile</th>
                <th style="font-weight: bold">Version</th>
                <th style="font-weight: bold">Proxy</th>
                <th style="font-weight: bold">Trạng thái</th>

                <th style="font-weight: bold">Live Ads</th>
                <th style="font-weight: bold">Action</th>
              </tr>
              </thead>

              <tbody>
              <tr
                  v-for="(item, index) in dataProfile"
                  :key="index"
              >
                <td>
                  <input
                      type="checkbox"
                      v-model="item.selected"
                      @change="updateSelectAll"
                  />
                </td>
                <td><p class="truncate-1-line">{{ item.name }}</p></td>
                <td>{{ item.browser_version }}</td>
                <td>{{ item.raw_proxy || 'Không có proxy' }}</td>
                <td>
                  <div>
                    <div v-if="item.name.includes('Success')" class="status is-green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                           stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Thành công
                    </div>
                    <div v-else-if="item.name.includes('Error')" class="status is-red">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                           stroke-linejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                      Lỗi
                    </div>
                    <div v-else-if="item.name.includes('Pending')" class="status is-wait">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path
                            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Đang chờ
                    </div>
                    <p v-else style="color: green">
                      Đã login</p>
                  </div>
                </td>

                <td>
                  <div v-if="item.statuses && item.statuses.length > 0">
                    <span

                        v-for="status in item.statuses"
                        :key="status.id"
                        :class="{
                  'status is-green': status.status === 'active',
                  'status is-red': status.status === 'inactive'
                }"
                        style="display: block;"
                    >
                      {{ status.id }}
                    </span>
                  </div>
                  <p v-else>Chưa có trạng thái</p>
                </td>
                <td>
                  <button class="p-3 w-20 text-center flex justify-center" v-if="!item.open" style="background-color: #0ab50b; color: #ffffff" @click="openProfile(item.id)
">Mở
                  </button>
                  <button class="p-3 w-20 text-center flex justify-center" v-else style="background-color: red; color: #ffffff" @click="closeProfile(item.id)
">Đóng
                  </button>

                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    <!-- Popup -->
    <div v-if="isPopupOpen" class="popup-overlay">
      <div class="popup">
        <h2>Nhập thông tin</h2>

        <!-- Input Fields -->
        <div class="form-group">
          <label>Tên công ty:</label>
          <input type="text" placeholder="VD: Ovantin Company" v-model="formData.exampleCompanyName"/>
        </div>

        <div class="form-group">
          <label>Trang web:</label>
          <input placeholder="VD: https://hola.com.vn" v-model="formData.exampleWebsite"/>
        </div>

        <div class="form-group">
          <label>Từ khóa:</label>
          <input placeholder="VD: từ khóa 1, từ khóa 2" v-model="formData.exampleKeyWord"/>
        </div>
        <div class="form-group">
          <label>Địa chỉ:</label>
          <input placeholder="VD: Ngan Ha Strict" type="text" v-model="formData.exampleAddress"/>
        </div>

        <div class="form-group">
          <label>Zip Code:</label>
          <input placeholder="VD: 400001" v-model="formData.exampleZipCode"/>
        </div>

        <div class="form-group">
          <label>Thành phố:</label>
          <input placeholder="VD: Hà Nội" v-model="formData.exampleCity"/>
        </div>
        <div class="form-group">
          <label>Quốc gia thanh toán:</label>
          <input placeholder="VD: Vietnam" v-model="formData.exampleCityCountry"/>
        </div>

        <div class="form-group">
          <label>Bạn có một hoặc nhiều tài khoản:</label>
          <input type="number" placeholder="VD: 1" v-model="formData.exampleNumberAccount"/>
        </div>

        <div class="form-group">
          <label>Bạn có đang quảng cáo doanh nghiệp của riêng bạn không?</label>
          <input type="number" placeholder="VD: 1" v-model="formData.exampleAdsBusiness"/>
        </div>
        <div class="form-group">
          <label>Ai là người thanh toán?:</label>
          <textarea placeholder="VD: Trần Hoàng Luân" v-model="formData.exampleWhoPay"></textarea>
        </div>

        <div class="form-group">
          <label>Tùy chọn thanh toán:</label>
          <input v-model="formData.exampleSelectPayment"/>
        </div>

        <div class="form-group">
          <label>Ngày thanh toán gần nhất:</label>
          <input placeholder="VD: 21/08/2024" v-model="formData.exampleRecentDatePay"/>
        </div>
        <div class="form-group">
          <label>Doanh nghiệp của bạn phục vụ (những) quốc gia nào?</label>
          <input placeholder="VD: Vietnam" v-model="formData.exampleBusinessCountry"/>
        </div>

        <div class="form-group">
          <label>Mô tả về doanh nghiệp:</label>
          <textarea placeholder="VD: Doanh nghiệp của tôi..." v-model="formData.exampleDescrible"></textarea>
        </div>


        <div class="form-group">
          <label> Thông tin về mối quan hệ giữa đại lý và khách hàng:</label>
          <input placeholder="VD: Thông tin mối liên hệ...." v-model="formData.exampleRelationShip"/>
        </div>
        <div class="form-group">
          <label>Chủ sở hữu miền:</label>
          <input placeholder="VD: Tôi" type="text" v-model="formData.exampleOwnerDomain"/>
        </div>
        <div class="form-group">
          <label>Chúng tôi có thể liên hệ với bạn bằng cách nào trong trường hợp chúng ta mất liên lạc?</label>
          <input type="number" v-model="formData.exampleSelectConnect"/>
        </div>


        <div class="form-group" style="display: flex; gap: 6px">
          <div>
            <label>Đầu số:</label>
            <input v-model="formData.examplePrefixPhoneNumber"/>
          </div>
          <div>
            <label>SĐT:</label>
            <input placeholder="VD: 983763541" v-model="formData.examplePhoneNumber"/>
          </div>

        </div>
        <div class="form-group">
          <label>Thòi gian thích hợp để liên hệ:</label>
          <input placeholder="VD: Ngày mai" type="text" v-model="formData.exampleTimeConnect"/>
        </div>
        <div class="form-group">
          <label>Tóm tắt vấn đề :</label>
          <input placeholder="VD: Vấn đề là..." type="text" v-model="formData.exampleProblemSummary"/>
        </div>
        <!-- Buttons -->
        <div class="buttons">
          <button class="p-4" @click="isPopupOpen = false">Đóng</button>
          <button class="p-4" @click="saveData" style="border: 1.5px solid #00a200;">Lưu</button>
        </div>
      </div>
    </div>
    <!-- Popup -->
    <div v-if="isPopupOpen" class="popup-overlay">
      <div class="popup">
        <h2>Nhập thông tin</h2>

        <!-- Tabs Navigation -->
        <div class="tabs w-full">
          <button
              style="border-radius: 0 !important;"
              class="w-1/2 text-center flex justify-center font-semibold"
              :class="{ active: activeTab === 'tab1' }"
              @click="activeTab = 'tab1'"
          >
            Setup Kháng
          </button>
          <button
              class="w-1/2 text-center flex justify-center font-semibold"
              style="border-radius: 0 !important;"
              :class="{ active: activeTab === 'tab2' }"
              @click="setupReg"
          >
            Setup Reg
          </button>
          <button
              class="w-1/2 text-center flex justify-center font-semibold"
              style="border-radius: 0 !important;"
              :class="{ active: activeTab === 'tab3' }"
              @click="setupAppealLimit"
          >
            Setup kháng limit
          </button>
        </div>

        <!-- Tab 1 Content -->
        <div v-if="activeTab === 'tab1'" class="tab-content">
          <!-- Input Fields -->
          <div class="form-group">
            <label>Tên công ty:</label>
            <input type="text" placeholder="VD: Ovantin Company" v-model="formData.exampleCompanyName"/>
          </div>

          <div class="form-group">
            <label>Trang web:</label>
            <input placeholder="VD: https://hola.com.vn" v-model="formData.exampleWebsite"/>
          </div>

          <div class="form-group">
            <label>Từ khóa:</label>
            <input placeholder="VD: từ khóa 1, từ khóa 2" v-model="formData.exampleKeyWord"/>
          </div>
          <div class="form-group">
            <label>Địa chỉ:</label>
            <input placeholder="VD: Ngan Ha Strict" type="text" v-model="formData.exampleAddress"/>
          </div>

          <div class="form-group">
            <label>Zip Code:</label>
            <input placeholder="VD: 400001" v-model="formData.exampleZipCode"/>
          </div>

          <div class="form-group">
            <label>Thành phố:</label>
            <input placeholder="VD: Hà Nội" v-model="formData.exampleCity"/>
          </div>
          <div class="form-group">
            <label>Quốc gia thanh toán:</label>
            <input placeholder="VD: Vietnam" v-model="formData.exampleCityCountry"/>
          </div>

          <div class="form-group">
            <label>Bạn có một hoặc nhiều tài khoản:</label>
            <input type="number" placeholder="VD: 1" v-model="formData.exampleNumberAccount"/>
          </div>

          <div class="form-group">
            <label>Bạn có đang quảng cáo doanh nghiệp của riêng bạn không?</label>
            <input type="number" placeholder="VD: 1" v-model="formData.exampleAdsBusiness"/>
          </div>
          <div class="form-group">
            <label>Ai là người thanh toán?:</label>
            <textarea placeholder="VD: Trần Hoàng Luân" v-model="formData.exampleWhoPay"></textarea>
          </div>

          <div class="form-group">
            <label>Tùy chọn thanh toán:</label>
            <input v-model="formData.exampleSelectPayment"/>
          </div>

          <div class="form-group">
            <label>Ngày thanh toán gần nhất:</label>
            <input placeholder="VD: 21/08/2024" v-model="formData.exampleRecentDatePay"/>
          </div>
          <div class="form-group">
            <label>Doanh nghiệp của bạn phục vụ (những) quốc gia nào?</label>
            <input placeholder="VD: Vietnam" v-model="formData.exampleBusinessCountry"/>
          </div>

          <div class="form-group">
            <label>Mô tả về doanh nghiệp:</label>
            <textarea placeholder="VD: Doanh nghiệp của tôi..." v-model="formData.exampleDescrible"></textarea>
          </div>


          <div class="form-group">
            <label> Thông tin về mối quan hệ giữa đại lý và khách hàng:</label>
            <input placeholder="VD: Thông tin mối liên hệ...." v-model="formData.exampleRelationShip"/>
          </div>
          <div class="form-group">
            <label>Chủ sở hữu miền:</label>
            <input placeholder="VD: Tôi" type="text" v-model="formData.exampleOwnerDomain"/>
          </div>
          <div class="form-group">
            <label>Chúng tôi có thể liên hệ với bạn bằng cách nào trong trường hợp chúng ta mất liên lạc?</label>
            <input type="number" v-model="formData.exampleSelectConnect"/>
          </div>


          <div class="form-group" style="display: flex; gap: 6px">
            <div>
              <label>Đầu số:</label>
              <input v-model="formData.examplePrefixPhoneNumber"/>
            </div>
            <div>
              <label>SĐT:</label>
              <input placeholder="VD: 983763541" v-model="formData.examplePhoneNumber"/>
            </div>

          </div>
          <div class="form-group">
            <label>Thòi gian thích hợp để liên hệ:</label>
            <input placeholder="VD: Ngày mai" type="text" v-model="formData.exampleTimeConnect"/>
          </div>
          <div class="form-group">
            <label>Tóm tắt vấn đề :</label>
            <input placeholder="VD: Vấn đề là..." type="text" v-model="formData.exampleProblemSummary"/>
          </div>
          <div class="buttons">
            <button class="p-4" @click="isPopupOpen = false">Đóng</button>
            <button class="p-4" @click="saveData" style="border: 1.5px solid #00a200;">Lưu</button>
          </div>

        </div>

        <!-- Tab 2 Content -->
        <div v-if="activeTab === 'tab2'" class="tab-content">
          <div class="form-group">
            <label>Website:</label>
            <input type="text" placeholder="VD: https:caigido.com" v-model="formDataReg.exampleWebsite"/>
          </div>
          <div class="form-group">
            <label>Billing Country:</label>
            <input type="text" placeholder="VD: United Sates" v-model="formDataReg.exampleBillingCountry"/>
          </div>
          <div class="form-group">
            <label>Currency</label>
            <input type="text" placeholder="VD: VND" v-model="formDataReg.exampleCurrency"/>
          </div>


          <div class="form-group">
            <label>ProfileType</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleProfileType">
              <option v-for="prf in ProfileType" :key="prf.value" :value="prf.value">
                {{ prf.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>OrganizationName</label>
            <input type="text" placeholder="VD: NEXT TECH JSC" v-model="formDataReg.exampleOrganizationName"/>

          </div>
          <div class="form-group">
            <label>LegalName</label>
            <input type="text" placeholder="VD: NGUYEN THI MY LINH" v-model="formDataReg.exampleLegalName"/>
          </div>
          <div class="form-group">
            <label>ZipCode</label>
            <input type="text" placeholder="VD: 7447474" v-model="formDataReg.exampleZipcode"/>
          </div>
          <CreditCard
              v-model:cardNumber="formDataReg.exampleNumberCard"
              v-model:cardName="formDataReg.exampleNameHolder"
              v-model:securityCode="formDataReg.exampleSecurityCode"
              v-model:mm="formDataReg.exampleMM"
              v-model:yy="formDataReg.exampleYY"
          />
          <div class="form-group">
            <label>Messaging app?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleMessagingApp">
              <option v-for="mess in MessagingType" :key="mess.value" :value="mess.value">
                {{ mess.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>AdvertisingAgenCy?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleAdvertisingAgenCy">
              <option v-for="agency in AdvertisingAgenCyType" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Street Address</label>
            <input type="text" placeholder="Ngo 1" v-model="formDataReg.exampleAddress"/>
          </div>
          <div class="form-group">
            <label>City</label>
            <input type="text" placeholder="Ha Noi" v-model="formDataReg.exampleCity"/>
          </div>
          <div class="form-group">
            <label>State</label>
            <input type="text" placeholder="New Mexico" v-model="formDataReg.exampleState"/>
          </div>
       <div class="form-group">
            <label>Zipcode</label>
            <input type="text" placeholder="51000" v-model="formDataReg.exampleZipCode2"/>
          </div>

          <div class="form-group">
            <label>Is your organization an advertising agency?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleOrganizationAds">
              <option v-for="agency in organizationAdvertising" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group" v-if="formDataReg.exampleOrganizationAds==='Yes'">
            <label>Who do you want to verify today?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleWantVerifyToday">
              <option v-for="agency in wantVerifyToday" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group" v-if="formDataReg.exampleOrganizationAds==='Yes' && formDataReg.exampleWantVerifyToday==='A client'">
            <label>Does your agency pay for this client's account?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleAgencyPayFor">
              <option v-for="agency in agencyPayFor" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group" v-if="formDataReg.exampleOrganizationAds==='No'">
            <label>Who pays for your ads?</label>
            <!--            <input type="text" placeholder="VD:1" v-model="formDataReg.exampleProfileType"/>-->
            <select id="priceSelect" v-model="formDataReg.exampleWhoPayFor">
              <option v-for="agency in whoPayAds" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>

          <div class="buttons">
            <button class="p-4" @click="isPopupOpen = false">Đóng</button>
            <button class="p-4" @click="saveDataReg" style="border: 1.5px solid #00a200;">Lưu</button>
          </div>
        </div>
        <div v-if="activeTab === 'tab3'" class="tab-content">
          <!-- Input Fields -->
          <div class="form-group">
            <label>Tên công ty:</label>
            <input type="text" placeholder="VD: Ovantin Company" v-model="formDataLimit.exampleCompanyNameLimit"/>
          </div>
          <div class="form-group" style="display: flex; gap: 6px">
            <div>
              <label>Đầu số:</label>
              <input v-model="formDataLimit.examplePrefixPhoneNumberLimit"/>
            </div>
            <div>
              <label>SĐT:</label>
              <input placeholder="VD: 983763541" v-model="formDataLimit.examplePhoneNumberLimit"/>
            </div>

          </div>

          <div class="form-group">
            <label>Trang web:</label>
            <input placeholder="VD: https://hola.com.vn" v-model="formDataLimit.exampleWebsiteLimit"/>
          </div>

          <div class="form-group">
            <label>Địa chỉ:</label>
            <input placeholder="VD: Ngan Ha Strict" type="text" v-model="formDataLimit.exampleAddressLimit"/>
          </div>

          <div class="form-group">
            <label>Zip Code:</label>
            <input placeholder="VD: 400001" v-model="formDataLimit.exampleZipCodeLimit"/>
          </div>

          <div class="form-group">
            <label>Thành phố:</label>
            <input placeholder="VD: Hà Nội" v-model="formDataLimit.exampleCityLimit"/>
          </div>
          <div class="form-group">
            <label>Quốc gia thanh toán:</label>
            <input placeholder="VD: Vietnam" v-model="formDataLimit.exampleBillingCountryLimit"/>
          </div>

          <div class="form-group" >
            <label>Bạn có đang quảng cáo doanh nghiệp của riêng bạn không?</label>
            <select id="priceSelect" v-model="formDataLimit.exampleYourOwnBusinessLimit">
              <option v-for="agency in exampleYourOwnBusinessLimit" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group" >
            <label>Tên bạn có liên kết với phương thức thanh toán chính cho tài khoản này không?</label>
            <select id="priceSelect" v-model="formDataLimit.examplePrimaryPaymentMethodLimit">
              <option v-for="agency in examplePrimaryPaymentMethodLimit" :key="agency.value" :value="agency.value">
                {{ agency.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Ngày thanh toán cuối cùng
            </label>
            <input  placeholder="VD: 1" v-model="formDataLimit.exampleDatePaymentMethodLimit"/>
          </div>
          <div class="form-group">
            <label>Doanh nghiệp của bạn phục vụ những quốc gia nào?
            </label>
            <input  placeholder="VD: 1" v-model="formDataLimit.exampleBusinessServeLimit"/>
          </div>
          <div class="form-group">
            <label>Cung cấp mô tả ngắn gọn về doanh nghiệp của bạn  </label>
            <textarea placeholder="VD: Mô tả" v-model="formDataLimit.exampleDescriptionBusinessLimit"></textarea>
          </div>
          <div class="form-group">
            <label>Cung cấp giải thích ngắn gọn cho lý do bạn cần tăng hạn mức chi tiêu hàng ngày của tài khoản
            </label>
            <textarea placeholder="VD: Lí do A" v-model="formDataLimit.exampleJustificationLimit"></textarea>
          </div>
          <div class="form-group">
            <label>Đường dẫn ảnh
            </label>
            <input placeholder="C://" v-model="formDataLimit.exampleLinkImageLimit"></input>
          </div>


          <div class="form-group">
            <label>Tóm tắt vấn đề :</label>
            <textarea placeholder="VD: Vấn đề là..." type="text" v-model="formData.exampleProblemSummary"/>
          </div>
          <div class="buttons">
            <button class="p-4" @click="isPopupOpen = false">Đóng</button>
            <button class="p-4" @click="saveData" style="border: 1.5px solid #00a200;">Lưu</button>
          </div>

        </div>

        <!-- Buttons -->
      </div>
    </div>
    <div v-if="showPopup" class="popup-overlay">
      <div class="popup">
        <h3>Tạo profile</h3>
        <div class="popup-content row-create">
          <input
              type="number"
              v-model="groups"
              placeholder="Nhập ID Groups"

          />
          <button class="p-2" @click="importFile">Import file</button>
        </div>

        <div style="margin-bottom: 8px"><span>{{ filePath }}</span></div>
        <div class="row-buttons">
          <button class="close-btn p-2" @click="showPopup = false">Đóng</button>
          <button class="close-btn p-2" @click="createProfile">Bắt đầu</button>


        </div>
      </div>
    </div>
  </div>
  <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
  >
    <div
        v-if="isPopupOpen1"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-80">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Chọn một lựa chọn</h3>
          <div class="space-y-2">
            <label
                v-for="option in options"
                :key="option.value"
                class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded transition duration-200 cursor-pointer"
            >
              <input
                  type="checkbox"
                  :checked="selectedOption === option.value"
                  @change="selectOption(option.value)"
                  class="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
              />
              <span class="text-gray-700 text-sm">{{ option.display }}</span>
            </label>
          </div>
        </div>
        <div class="bg-gray-100 px-4 py-3 flex justify-between items-center rounded-b-lg">

          <div class="space-x-2 flex w-full justify-between">
            <button
                @click="closePopup"
                class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            >
              Cancel
            </button>
            <button
                @click="startReg"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
select {
  width: 100%;
  height: 37px;
  font-size: 16px;
  padding: 4px;
}

/* CSS cho popup */
.popup-overlay {
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-create {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}

.row-create button {
  outline: none;
}

.row-buttons {
  display: flex;
  justify-content: space-between;
}

.row-buttons button:nth-child(2) {
  background-color: #0ab50b;
  color: #ffffff;
  outline: none;
}

.row-create input {
  padding: 6px;
  color: #ffffff;
}

.popup {
  max-height: 80%; /* Giới hạn chiều cao */
  overflow-y: auto; /* Bật thanh cuộn dọc khi cần */
  background: #1f1f1f;
  padding: 20px;
  border-radius: 8px;
  width: 58%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.popup input {
  background-color: #141414;
  color: #fff; /* Đặt màu chữ mặc định là trắng */

}

.popup textarea {
  background-color: #141414;
  color: #ffffff;

}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  text-align: left;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.button-85 {
  padding: 0.6em 2em;
  border: none;
  outline: none;
  color: rgb(255, 255, 255);
  background: #111;
  cursor: pointer;
  position: relative;
  z-index: 0;
  border-radius: 10px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.button-85:before {
  content: "";
  background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
  position: absolute;
  top: -2px;
  left: -2px;
  background-size: 400%;
  z-index: -1;
  filter: blur(5px);
  -webkit-filter: blur(5px);
  width: calc(100% + 4px);
  height: calc(100% + 4px);
  animation: glowing-button-85 20s linear infinite;
  transition: opacity 0.3s ease-in-out;
  border-radius: 10px;
}

.tabs {
  display: flex;
  margin-bottom: 10px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  color: #0a0a0a;
  cursor: pointer;
}

.tabs button.active {
  background: #00a200;
  color: white;
}

.tab-content {
  margin-top: 10px;
}

@keyframes glowing-button-85 {
  0% {
    background-position: 0 0;
  }
  50% {
    background-position: 400% 0;
  }
  100% {
    background-position: 0 0;
  }
}

.button-85:after {
  z-index: -1;
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  background: #222;
  left: 0;
  top: 0;
  border-radius: 10px;
}
</style>

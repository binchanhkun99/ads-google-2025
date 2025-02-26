<template>
  <div class="min-h-screen bg-[#1E1F2E] text-gray-100">
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <a class="flex items-center justify-between gap-2" href="/">
          <ArrowLeftToLine class="w-4 h-4" />
          <h1 class="text-base">Kháng Ads</h1>
        </a>
        <div class="flex items-center space-x-2">
          <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md flex items-center space-x-1" @click="setupFromExcel">
            <FileIcon class="w-4 h-4" />
            <span>Setup từ Excel</span>
          </button>
          <button
              @click="autoSetCamp"
              class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md flex items-center space-x-1"
          >
            <Youtube class="w-4 h-4" />
            <span>Auto set camp YTB</span>
          </button>
        </div>
      </div>

      <div class="flex space-x-2 mb-4">
        <div class="relative flex-1">
          <input
              type="text"
              placeholder="Nhập vào id group..."
              v-model="idGroup"
              class="w-full bg-gray-700 text-gray-100 px-4 py-2 rounded-md pl-10"
          >
          <Users class="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
        </div>
        <div class="flex items-center space-x-2">
          <button class="p-3" style="height: 30px" @click="selectGroup">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="fill:white;">
              <path d="M16.242 17.242a6.04 6.04 0 0 1-1.37 1.027l.961 1.754a8.068 8.068 0 0 0 2.569-2.225l-1.6-1.201a5.938 5.938 0 0 1-.56.645zm1.743-4.671a5.975 5.975 0 0 1-.362 2.528l1.873.701a7.977 7.977 0 0 0 .483-3.371l-1.994.142zm1.512-2.368a8.048 8.048 0 0 0-1.841-2.859l-1.414 1.414a6.071 6.071 0 0 1 1.382 2.146l1.873-.701zm-8.128 8.763c-.047-.005-.094-.015-.141-.021a6.701 6.701 0 0 1-.468-.075 5.923 5.923 0 0 1-2.421-1.122 5.954 5.954 0 0 1-.583-.506 6.138 6.138 0 0 1-.516-.597 5.91 5.91 0 0 1-.891-1.634 6.086 6.086 0 0 1-.247-.902c-.008-.043-.012-.088-.019-.131A6.332 6.332 0 0 1 6 13.002V13c0-1.603.624-3.109 1.758-4.242A5.944 5.944 0 0 1 11 7.089V10l5-4-5-4v3.069a7.917 7.917 0 0 0-4.656 2.275A7.936 7.936 0 0 0 4 12.999v.009c0 .253.014.504.037.753.007.076.021.15.03.227.021.172.044.345.076.516.019.1.044.196.066.295.032.142.065.283.105.423.032.112.07.223.107.333.026.079.047.159.076.237l.008-.003A7.948 7.948 0 0 0 5.6 17.785l-.007.005c.021.028.049.053.07.081.211.272.433.538.681.785a8.236 8.236 0 0 0 .966.816c.265.192.537.372.821.529l.028.019.001-.001a7.877 7.877 0 0 0 2.136.795l-.001.005.053.009c.201.042.405.071.61.098.069.009.138.023.207.03a8.038 8.038 0 0 0 2.532-.137l-.424-1.955a6.11 6.11 0 0 1-1.904.102z"></path>
            </svg>
          </button>
        </div>
        <select class="bg-gray-700 text-gray-100 px-4 py-2 rounded-md">
          <option>Từ mới đến cũ</option>
        </select>
        <select class="bg-gray-700 text-gray-100 px-4 py-2 rounded-md">
          <option>Chế độ chọn: Tích vào ô checkbox</option>
        </select>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2 mb-4">
        <button class="bg-gray-700 h-full hover:bg-gray-600 px-3 py-1.5 rounded-md flex items-center space-x-1">
          <span class="text-red-500">{{ selectedProfiles.length }}</span>
          <span>profiles đang chọn</span>
        </button>
        <div class="relative flex justify-center items-center">
<!--          <span>Số luồng</span>-->

          <input
              type="text"
              placeholder="Nhập vào số luồng"
              v-model="numberThreads"
              class="w-full bg-gray-700 text-gray-100 px-4 py-2 rounded-md pl-10"
          >
          <Cpu class="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      <!-- Table với scroll và checkbox -->
      <div class="bg-[#282A3E] rounded-lg overflow-hidden">
        <div class="max-h-[calc(110vh-300px)] overflow-y-auto">
          <table class="w-full table-fixed">
            <thead class="bg-gray-800 sticky top-0 z-10">
            <tr>
              <th class="px-4 py-2 text-left w-12">
                <input
                    type="checkbox"
                    v-model="selectAll"
                    @change="toggleSelectAll"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
              </th>
              <th class="px-4 py-2 text-left w-40">Tên profile</th>
              <th class="px-4 py-2 text-left w-16">Storage</th>
              <th class="px-4 py-2 text-left w-16">OS</th>
              <th class="px-4 py-2 text-left w-32">Trạng thái</th>
              <th class="px-4 py-2 text-left w-40">Proxy</th>
              <th class="px-4 py-2 text-left w-16">Ghi chú</th>
              <th class="px-4 py-2 text-right w-24">Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="profile in profiles" :key="profile.id" class="border-b border-gray-700 hover:bg-gray-700">
              <td class="px-4 py-3">
                <input
                    type="checkbox"
                    v-model="profile.selected"
                    @change="updateSelectedProfiles"
                    class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs">
                    127
                  </div>
                  <span class="truncate">{{ profile.name }}</span>
                  <PencilIcon class="w-4 h-4 text-gray-400" />
                </div>
              </td>
              <td class="px-4 py-3">
                <FolderIcon class="w-4 h-4 text-gray-400" />
              </td>
              <td class="px-4 py-3">
                <WindowsIcon class="w-4 h-4 text-gray-400" />
              </td>
              <td class="px-4 py-3 text-lg whitespace-nowrap">
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>{{ profile.status || 'Sẵn sàng' }}</span>
                </div>
              </td>
              <td class="px-4 py-3 truncate" :title="profile.raw_proxy || 'Local IP'">
                {{ profile.raw_proxy || 'Local IP' }}
              </td>
              <td class="px-4 py-3">
                <PencilIcon class="w-4 h-4 text-gray-400" />
              </td>
              <td class="px-4 py-3 text-right">
                <button @click="openProfile(profile.id)" class="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded text-sm">
                  Mở
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center space-x-2">
          <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            <ChevronLeftIcon class="w-4 h-4" />
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button
              @click="nextPage"
              :disabled="isLastPage"
              class="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="flex items-center space-x-2">
          <span>Số profile trên mỗi trang</span>
          <select
              v-model="perPage"
              @change="updatePagination"
              class="bg-gray-700 text-gray-100 px-2 py-1 rounded-md"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import { notify } from "@kyvg/vue3-notification";

import {
  Youtube,
  ArrowLeftToLine,
  Users,
  Cpu,
  FileText as FileIcon,
  Pencil as PencilIcon,
  Folder as FolderIcon,
  Monitor as WindowsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next'

const apiUrl = ref('http://127.0.0.1:19995')
const profiles = ref([])
const idGroup = ref(0)
const isLoading = ref(false)
const currentPage = ref(1)
const perPage = ref(10)
const totalPages = ref(1)
const isLastPage = ref(false)
const selectAll = ref(false)
let updateProfileDataListener = null;
const excelData = ref(null)

const selectedProfiles = computed(() => profiles.value.filter(profile => profile.selected))

const selectGroup = async () => {
  try {
    await callAPI(idGroup.value)
    const rs = await window.electronAPI.invokeSaveIdGroup(idGroup.value, apiUrl.value)
    console.log(rs)
  } catch (error) {
    console.log(error)
  }
}

const callAPI = async (idValue) => {
  try {
    isLoading.value = true
    let url = ''
    if (idValue === "" || idValue === 0) {
      let id = await window.electronAPI.invokeReadId()
      if (id) idGroup.value = id
      url = `${apiUrl.value}/api/v3/profiles?group_id=${id || 1}&page=${currentPage.value}&per_page=${perPage.value}`
    } else {
      url = `${apiUrl.value}/api/v3/profiles?group_id=${idValue}&page=${currentPage.value}&per_page=${perPage.value}`
    }

    const result = await window.electronAPI.fetchAPI(url)
    if (result && result.success && Array.isArray(result.data)) {
      profiles.value = result.data.map(item => ({ ...item, selected: item.selected || false }))
      isLastPage.value = result.data.length < perPage.value
      totalPages.value = isLastPage.value ? currentPage.value : '∞'
    } else {
      profiles.value = []
      isLastPage.value = true
      totalPages.value = currentPage.value || 1
    }
    updateSelectAllState()
  } catch (error) {
    console.log(error)
    profiles.value = []
    isLastPage.value = true
    totalPages.value = currentPage.value || 1
  } finally {
    isLoading.value = false
  }
}

const toggleSelectAll = () => {
  profiles.value.forEach(profile => {
    profile.selected = selectAll.value
  })
  updateSelectedProfiles()
}

const updateSelectAllState = () => {
  selectAll.value = profiles.value.length > 0 && profiles.value.every(profile => profile.selected)
}

const updateSelectedProfiles = () => {
  updateSelectAllState()
}
async function openProfile(id) {
  try {
    const rs = await window.electronAPI.openProfile(id, apiUrl.value);
    if (rs.success) {
      profiles.value.forEach(item => {
        // if (item.id === id) {
        //   item.open = isOpen.value;
        // }
      });
    }
  } catch (error) {
    console.log(error)
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Có lỗi xảy ra",
    });
  }

}

const numberThreads = ref(5)
const setupFromExcel = async () => {
  try {
    isLoading.value = true;
    const result = await window.electronAPI.readExcelSetup(); // Sử dụng hàm mới
    // Kiểm tra xem result có phải là object và không rỗng
    if (result && Object.keys(result).length > 0) {
      // Dữ liệu đã là object chứa thông tin dòng đầu tiên, không cần lấy thêm `firstRow`
      excelData.value = {
        campaignName: result.campaignName || null,
        budgetType: result.budgetType || 'Daily',
        locationCampaign: result.locationCampaign || 'All countries and territories',
        urlVideo: result.urlVideo || '',
        longHeadline: result.longHeadline || '',
        description: result.description || '',
        targetCPV: result.targetCPV || 5000,
        budgetMoney: result.budgetMoney || 1111111,
      };
      notify({
        type: 'success',
        title: "Thành công",
        text: "Đọc file Excel thành công",
      });

    } else {
      notify({
        type: 'error',
        title: "Lỗi",
        text: "Không đọc được file Excel",
      });
    }
  } catch (error) {
    console.log(error);
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Có lỗi xảy ra khi đọc file Excel",
    });
  } finally {
    isLoading.value = false;
  }
};const autoSetCamp = () => {
  const selectedProfilesData = profiles.value.filter(profile => profile.selected);
  if (selectedProfilesData.length <= 0) {
    notify({
      type: 'error',
      title: "Thất bại",
      text: "Vui lòng chọn ít nhất một profile",
    });
    return;
  }
  if (!excelData.value) {
    notify({
      type: 'error',
      title: "Lỗi",
      text: "Vui lòng setup từ Excel trước",
    });
    return;
  }

  const combinedData = selectedProfilesData.map(profile => ({
    ...profile,
    excelConfig: excelData.value,
  }));
  const dataJSON = JSON.stringify(combinedData);
  window.electronAPI.autoSetCamp(dataJSON, numberThreads.value, apiUrl.value);
};
const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--
    await callAPI(idGroup.value)
  }
}

const nextPage = async () => {
  if (!isLastPage.value) {
    currentPage.value++
    await callAPI(idGroup.value)
  }
}

const updatePagination = async () => {
  currentPage.value = 1
  await callAPI(idGroup.value)
}

onMounted(() => {
  callAPI(idGroup.value)

  updateProfileDataListener = () => {
    callAPI(idGroup.value);
  };
  window.electronAPI.on('update-profile-data', updateProfileDataListener);
  if (updateProfileDataListener) {
    window.electronAPI.off('update-profile-data', updateProfileDataListener);
  }
})
</script>
<style scoped>
thead th {
  background: #374151;
  border-bottom: 1px solid #4b5563;
}
table {
  table-layout: fixed;
  width: 100%;
}
</style>
<style scoped>
thead th {
  background: #374151;
  border-bottom: 1px solid #4b5563;
}
</style>

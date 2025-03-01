<template>
  <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg text-white font-semibold">Edit Profile</h3>
        <button
            @click="emit('close')"
            class="outline-none border-none"

        >
          <svg class="w-6 h-6" fill="" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mb-4">
        <input
            v-model="inputValue"
            type="text"
            class="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter something..."
        >
      </div>

      <div class="flex justify-end">
        <button
            @click="handleConfirm"
            class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Khai báo defineEmits một lần duy nhất với tất cả emits
const emit = defineEmits(['close', 'confirm'])

const inputValue = ref('')

const handleConfirm = () => {
  emit('confirm', inputValue.value)
}
</script>

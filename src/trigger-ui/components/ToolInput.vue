<script setup lang="ts">
import type { LeafToolDescriptor, LeafToolInput, ToolDescriptor } from 'triggerix-ui-preset-war3'
import { computed, ref } from 'vue'

const props = defineProps<{
  descriptor: ToolDescriptor
}>()

const emit = defineEmits<{
  confirm: [value: unknown]
}>()

const textValue = ref('')
const numberValue = ref<number | undefined>(undefined)
const selectedValue = ref<unknown>(null)

const leafDescriptor = computed<LeafToolDescriptor | null>(() =>
  props.descriptor.type === 'leaf' ? props.descriptor : null
)

const leafInput = computed<LeafToolInput | null>(() => leafDescriptor.value?.input ?? null)

const inputType = computed(() => leafInput.value?.type)

const selectOptions = computed(() => {
  if (!leafInput.value || leafInput.value.type !== 'select') return []
  return (leafInput.value.options ?? []).map((opt) => ({
    value: String(opt.value),
    label: opt.label
  }))
})

function confirmText() {
  emit('confirm', textValue.value)
}

function confirmNumber() {
  emit('confirm', numberValue.value ?? 0)
}

function selectOption(value: string) {
  selectedValue.value = value
  emit('confirm', value)
}
</script>

<template>
  <div class="py-1">
    <template v-if="inputType === 'text'">
      <input
        v-model="textValue"
        type="text"
        class="w-full px-2.5 py-1.5 rounded bg-#0c0e14 border border-#3d4f6a text-#e6edf3 font-mono text-xs outline-none transition-colors duration-150 placeholder:text-#7a8599 focus:border-#4fc3f7 focus:shadow-[0_0_0_2px_rgba(79,195,247,0.1)]"
        :placeholder="leafInput?.placeholder || '输入...'"
        @keydown.enter="confirmText"
      />
      <button
        type="button"
        class="block w-full mt-1.5 py-1.5 rounded bg-#4fc3f7/10 border border-#4fc3f7/25 text-#4fc3f7 text-[0.75rem] cursor-pointer hover:bg-#4fc3f7/18 hover:border-#4fc3f7/40 transition-all duration-150"
        @click="confirmText"
      >
        确认
      </button>
    </template>

    <template v-else-if="inputType === 'number'">
      <input
        v-model.number="numberValue"
        type="number"
        class="w-full px-2.5 py-1.5 rounded bg-#0c0e14 border border-#3d4f6a text-#e6edf3 font-mono text-xs outline-none transition-colors duration-150 placeholder:text-#7a8599 focus:border-#4fc3f7 focus:shadow-[0_0_0_2px_rgba(79,195,247,0.1)]"
        :placeholder="leafInput?.placeholder || '输入数字...'"
        @keydown.enter="confirmNumber"
      />
      <button
        type="button"
        class="block w-full mt-1.5 py-1.5 rounded bg-#4fc3f7/10 border border-#4fc3f7/25 text-#4fc3f7 text-[0.75rem] cursor-pointer hover:bg-#4fc3f7/18 hover:border-#4fc3f7/40 transition-all duration-150"
        @click="confirmNumber"
      >
        确认
      </button>
    </template>

    <template v-else-if="inputType === 'select'">
      <div class="flex flex-col gap-0.5">
        <button
          v-for="opt in selectOptions"
          :key="opt.value"
          type="button"
          class="block w-full px-2.5 py-1.5 rounded bg-transparent border border-transparent text-#c9d1d9 text-xs text-left cursor-pointer hover:bg-#222b3d hover:border-#3d4f6a transition-all duration-150"
          :class="{
            'bg-#222b3d border-#80cbc4 text-#80cbc4': selectedValue === opt.value
          }"
          @click="selectOption(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </template>
  </div>
</template>

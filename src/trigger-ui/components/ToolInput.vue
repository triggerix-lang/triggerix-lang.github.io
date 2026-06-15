<script setup lang="ts">
import type {
  LeafToolDescriptor,
  SelectOption,
  SlotContext,
  ToolDescriptor
} from 'triggerix-editor-vue'
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

const leafDescriptor = computed(() =>
  props.descriptor.type === 'leaf' ? (props.descriptor as LeafToolDescriptor) : null
)

const inputType = computed(() => leafDescriptor.value?.input.type)

const selectOptions = computed<SelectOption[]>(() => {
  if (!leafDescriptor.value || leafDescriptor.value.input.type !== 'select') return []
  const opts = leafDescriptor.value.input.options
  if (typeof opts === 'function') {
    const ctx: SlotContext = { slots: {} }
    return opts(ctx)
  }
  return opts
})

function confirmText() {
  emit('confirm', textValue.value)
}

function confirmNumber() {
  emit('confirm', numberValue.value ?? 0)
}

function selectOption(opt: SelectOption) {
  selectedValue.value = opt.value
  emit('confirm', opt.value)
}
</script>

<template>
  <div class="tool-input">
    <template v-if="inputType === 'text'">
      <input
        v-model="textValue"
        class="tool-input__field"
        type="text"
        :placeholder="(leafDescriptor!.input as any).placeholder || '输入...'"
        @keydown.enter="confirmText"
      />
      <button class="tool-input__confirm" @click="confirmText">确认</button>
    </template>

    <template v-else-if="inputType === 'number'">
      <input
        v-model.number="numberValue"
        class="tool-input__field"
        type="number"
        :placeholder="(leafDescriptor!.input as any).placeholder || '输入数字...'"
        :min="(leafDescriptor!.input as any).min"
        :max="(leafDescriptor!.input as any).max"
        @keydown.enter="confirmNumber"
      />
      <button class="tool-input__confirm" @click="confirmNumber">确认</button>
    </template>

    <template v-else-if="inputType === 'select'">
      <div class="tool-input__options">
        <button
          v-for="opt in selectOptions"
          :key="String(opt.value)"
          class="tool-input__option"
          :class="{ 'tool-input__option--selected': selectedValue === opt.value }"
          @click="selectOption(opt)"
        >
          {{ opt.label }}
        </button>
      </div>
    </template>
  </div>
</template>

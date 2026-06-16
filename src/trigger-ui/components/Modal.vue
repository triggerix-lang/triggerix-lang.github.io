<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getNextZIndex, isTopModal, popModal, pushModal } from '../composables/useModal'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    maskClosable?: boolean
  }>(),
  {
    title: '',
    maskClosable: true
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const id = `modal-${Math.random().toString(36).slice(2, 10)}`
const zIndex = ref(getNextZIndex())

const maskZIndex = computed(() => zIndex.value)
const contentZIndex = computed(() => zIndex.value + 1)

function close(): void {
  emit('update:open', false)
}

function handleMaskClick(): void {
  if (props.maskClosable) close()
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isTopModal(id)) {
    e.stopPropagation()
    close()
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      zIndex.value = getNextZIndex()
      pushModal(id)
      window.addEventListener('keydown', handleKeydown)
    } else {
      popModal(id)
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  popModal(id)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-mask">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        :style="{ zIndex: maskZIndex }"
        @click="handleMaskClick"
      />
    </Transition>

    <Transition name="modal-content">
      <div
        v-if="open"
        class="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        :style="{ zIndex: contentZIndex }"
      >
        <div
          class="pointer-events-auto w-full max-w-[480px] rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.15)] dark:bg-neutral-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.35)] flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <div
            v-if="title"
            class="px-5 py-3.5 border-b border-gray-200/80 dark:border-neutral-800 text-base font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ title }}
          </div>

          <div class="px-5 py-4 overflow-y-auto text-gray-700 dark:text-gray-200">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="px-5 py-3 border-t border-#2a3348 bg-#0f1219 flex justify-end gap-2"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask-enter-active,
.modal-mask-leave-active {
  transition: opacity 0.2s ease;
}
.modal-mask-enter-from,
.modal-mask-leave-to {
  opacity: 0;
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: opacity 0.2s ease;
}
.modal-content-enter-active > div,
.modal-content-leave-active > div {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
}
.modal-content-enter-from > div,
.modal-content-leave-to > div {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>

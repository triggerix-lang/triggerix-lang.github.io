import { reactive, ref } from 'vue'

const BASE_Z_INDEX = 1000
const Z_INDEX_STEP = 10

export const modalStack = reactive<string[]>([])

export function getNextZIndex(): number {
  return BASE_Z_INDEX + modalStack.length * Z_INDEX_STEP
}

export function pushModal(id: string): void {
  modalStack.push(id)
}

export function popModal(id: string): void {
  const index = modalStack.lastIndexOf(id)
  if (index !== -1) {
    modalStack.splice(index, 1)
  }
}

export function isTopModal(id: string): boolean {
  return modalStack[modalStack.length - 1] === id
}

export function useModal() {
  const isOpen = ref(false)

  function open(): void {
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  return { isOpen, open, close }
}

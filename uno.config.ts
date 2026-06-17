import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'
import { unoColors } from 'uno-colors'

export default defineConfig({
  theme: {
    colors: unoColors({
      primary: '#4fc3f7'
    })
  },
  shortcuts: [
    {
      'surface-base': 'bg-white dark:bg-neutral-900',
      'surface-subtle': 'bg-gray-100/75 dark:bg-neutral-800/65',
      'border-subtle': 'border-gray-200/85 dark:border-neutral-700/80',
      'text-soft': 'text-gray-500 dark:text-gray-500',
      'focus-ring-primary':
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-5/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-4/65 dark:focus-visible:ring-offset-neutral-950',
      'interactive-soft':
        'transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-neutral-800/72',
      card: 'rounded-xl border border-subtle surface-base p-4',
      'card-hover':
        'card transition-all duration-200 hover:bg-gray-50 dark:hover:bg-neutral-800/65 dark:hover:border-blue-4/30 hover:shadow-sm',
      'btn-primary':
        'rounded-lg bg-blue-6 px-4 py-2 text-white font-medium transition-colors duration-200 hover:bg-blue-7 focus-ring-primary',
      'btn-secondary':
        'rounded-lg bg-gray-100 px-4 py-2 text-gray-700 font-medium transition-colors duration-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700 focus-ring-primary',
      'input-base':
        'rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-5 focus:ring-2 focus:ring-blue-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-100 dark:focus:border-blue-4'
    },

    ['fcc', 'flex justify-center items-center'],
    ['fccc', 'fcc flex-col'],
    ['fxc', 'flex justify-center'],
    ['fyc', 'flex items-center'],
    ['fbc', 'flex justify-between items-center'],
    ['fsc', 'flex justify-start items-center']
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      cdn: 'https://esm.sh/',
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'text-bottom'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()]
})

const fs = require('fs')
const path = require('path')

function copyFile(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
  }
  fs.copyFileSync(src, dest)
  console.log(`✅ ${path.basename(dest)}`)
}

// Font Awesome
const faBase = './node_modules/@fortawesome/fontawesome-free'
if (fs.existsSync(faBase)) {
  // CORREGIDO: Ahora cierra con comilla simple (') al final
  copyFile(`${faBase}/css/all.min.css`, './public/css/font-awesome.min.css')
  
  const webfonts = ['fa-solid-900.woff2', 'fa-regular-400.woff2', 'fa-brands-400.woff2']
  webfonts.forEach(f => {
    const src = `${faBase}/webfonts/${f}`
    if (fs.existsSync(src)) copyFile(src, `./public/webfonts/${f}`)
  })
}

// Chart.js
const chartPath = './node_modules/chart.js/dist/chart.umd.js'
if (fs.existsSync(chartPath)) {
  copyFile(chartPath, './public/js/chart.umd.min.js')
}

// Fonts
const fonts = [
  { pkg: '@fontsource/montserrat/files/montserrat-latin-400-normal.woff2', dest: './public/fonts/montserrat-latin-400.woff2' },
  { pkg: '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2', dest: './public/fonts/montserrat-latin-600.woff2' },
  { pkg: '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2', dest: './public/fonts/montserrat-latin-700.woff2' },
  { pkg: '@fontsource/inter/files/inter-latin-400-normal.woff2', dest: './public/fonts/inter-latin-400.woff2' },
  { pkg: '@fontsource/inter/files/inter-latin-600-normal.woff2', dest: './public/fonts/inter-latin-600.woff2' },
]
fonts.forEach(({ pkg, dest }) => {
  if (fs.existsSync(`./node_modules/${pkg}`)) {
    copyFile(`./node_modules/${pkg}`, dest)
  }
})

console.log('\n🎉 Assets copiados. La app ahora funciona offline.')
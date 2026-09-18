const fs = require('fs')
const path = require('path')

const indexPath = path.join('public', 'apidoc', 'index.html')

if (!fs.existsSync(indexPath)) {
  console.error('public/apidoc/index.html not found. Run apidoc first.')
  process.exit(1)
}

let html = fs.readFileSync(indexPath, 'utf8')

html = html.replace(/(href|src)="assets\//g, '$1="/apidoc/assets/')

const layoutFix = `
  <style>
    @media (min-width: 768px) {
      #sidenav,
      #scrollingNav {
        width: 250px;
      }
      #content {
        margin-left: 250px !important;
        width: auto !important;
        max-width: calc(100% - 250px);
        float: none !important;
        padding-left: 24px;
        padding-right: 24px;
      }
    }
  </style>
`

if (!html.includes('margin-left: 250px')) {
  html = html.replace('</head>', `${layoutFix}</head>`)
}

fs.writeFileSync(indexPath, html)

const cssPath = path.join('public', 'apidoc', 'assets', 'main.css')
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8')
  const cssFix = `
@media (min-width: 768px) {
  #sidenav,
  #scrollingNav {
    width: 250px;
  }
  #content {
    margin-left: 250px !important;
    width: auto !important;
    max-width: calc(100% - 250px);
    float: none !important;
    padding-left: 24px;
    padding-right: 24px;
  }
}
`
  if (!css.includes('margin-left: 250px')) {
    fs.writeFileSync(cssPath, css + cssFix)
  }
}

console.log('Patched public/apidoc/index.html for /apidoc asset paths and layout.')

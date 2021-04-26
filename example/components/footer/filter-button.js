const html = require('nanohtml')

module.exports = filterButton

function filterButton (name, filter, currentFilter, emit) {
  const filterClass = filter === currentFilter
    ? 'selected'
    : ''

  let uri = '#' + name.toLowerCase()
  if (uri === '#all') uri = '/'

  return html`<li>
    <a href=${uri} class=${filterClass}>
      ${name}
    </a>
  </li>`
}

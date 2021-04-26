const html = require('nanohtml') // cannot require choo/html because it's a nested repo

const Header = require('../components/header')
const Footer = require('../components/footer')
const Todos = require('../components/todos')
const Info = require('../components/info')

module.exports = mainView

function mainView (state, emit) {
  return html`
    <body>
      <section class="todoapp">
        ${state.cache(Header, 'header').render()}
        ${state.cache(Todos, 'todos').render()}
        ${state.cache(Footer, 'footer').render()}
      </section>
      ${state.cache(Info, 'info').render()}
    </body>
  `
}

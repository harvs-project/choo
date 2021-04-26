const css = require('sheetify')
const choo = require('../')

css('todomvc-common/base.css')
css('todomvc-app-css/index.css')

const app = choo()
if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')())
}
app.use(require('./stores/todos'))

app.route('/', require('./views/main'))
app.route('#active', require('./views/main'))
app.route('#completed', require('./views/main'))
app.route('*', require('./views/main'))

module.exports = app.mount('body')

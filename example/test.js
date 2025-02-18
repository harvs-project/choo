const EventEmitter = require('events').EventEmitter
const spok = require('spok')
const tape = require('tape')

const todoStore = require('./stores/todos')

tape('should initialize empty state', function (t) {
  const emitter = new EventEmitter()
  const state = {}
  todoStore(state, emitter)
  spok(t, state, {
    todos: {
      idCounter: 0,
      active: spok.arrayElements(0),
      done: spok.arrayElements(0),
      all: spok.arrayElements(0)
    }
  })
  t.end()
})

tape('todos:create', function (t) {
  const emitter = new EventEmitter()
  const state = {}
  todoStore(state, emitter)
  emitter.emit('DOMContentLoaded')

  emitter.emit('todos:create', 'same as it ever was')
  spok(t, state.todos, {
    all: spok.arrayElements(1),
    active: spok.arrayElements(1),
    done: spok.arrayElements(0)
  })
  spok(t, state.todos.all[0], {
    name: 'same as it ever was',
    editing: false,
    done: false,
    id: 0
  })

  emitter.emit('todos:create', 'and another one down')
  spok(t, state.todos, {
    all: spok.arrayElements(2),
    active: spok.arrayElements(2),
    done: spok.arrayElements(0)
  })
  spok(t, state.todos.all[1], {
    name: 'and another one down',
    editing: false,
    done: false,
    id: 1
  })

  t.end()
})

tape('todos:update', function (t) {
  const emitter = new EventEmitter()
  const state = {}
  todoStore(state, emitter)
  emitter.emit('DOMContentLoaded')

  emitter.emit('todos:create', 'same as it ever was')
  emitter.emit('todos:create', 'and another one down')

  emitter.emit('todos:update', {
    id: 0,
    editing: true,
    name: 'been here all along'
  })
  spok(t, state.todos.all[0], {
    name: 'been here all along',
    editing: true,
    done: false,
    id: 0
  })

  emitter.emit('todos:update', {
    done: true,
    id: 1
  })
  spok(t, state.todos, {
    all: spok.arrayElements(2),
    active: spok.arrayElements(1),
    done: spok.arrayElements(1)
  })

  emitter.emit('todos:update', {
    done: false,
    id: 1
  })
  spok(t, state.todos, {
    all: spok.arrayElements(2),
    active: spok.arrayElements(2),
    done: spok.arrayElements(0)
  })

  t.end()
})

// tape('todos:delete')
// tape('todos:edit')
// tape('todos:unedit')
// tape('todos:toggle')
// tape('todos:toggleAll')
// tape('todos:deleteCompleted')

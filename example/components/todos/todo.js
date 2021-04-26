const html = require('nanohtml')

module.exports = Todo

function Todo (todo, emit) {
  const clx = classList({ completed: todo.done, editing: todo.editing })
  return html`
    <li id=${todo.id} class=${clx}>
      <div class="view">
        <input
          type="checkbox"
          class="toggle"
          checked="${todo.done}"
          onchange=${toggle} />
        <label ondblclick=${edit}>${todo.name}</label>
        <button
          class="destroy"
          onclick=${destroy}
        ></button>
      </div>
      <input
        class="edit"
        value=${todo.name}
        onkeydown=${handleEditKeydown}
        onblur=${update} />
    </li>
  `

  function toggle (e) {
    emit('todos:toggle', todo.id)
  }

  function edit (e) {
    emit('todos:edit', todo.id)
  }

  function destroy (e) {
    emit('todos:delete', todo.id)
  }

  function update (e) {
    emit('todos:update', {
      id: todo.id,
      editing: false,
      name: e.target.value
    })
  }

  function handleEditKeydown (e) {
    if (e.keyCode === 13) update(e) // Enter
    else if (e.code === 27) emit('todos:unedit') // Escape
  }

  function classList (classes) {
    let str = ''
    const keys = Object.keys(classes)
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i]
      const val = classes[key]
      if (val) str += (key + ' ')
    }
    return str
  }
}

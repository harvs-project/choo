const scrollToAnchor = require('scroll-to-anchor')
const documentReady = require('document-ready')
const nanotiming = require('nanotiming')
const nanorouter = require('nanorouter')
const nanomorph = require('nanomorph')
const nanoquery = require('nanoquery')
const nanohref = require('nanohref')
const nanoraf = require('nanoraf')
const nanobus = require('nanobus')
const assert = require('assert')

const Cache = require('./component/cache')

/** TODO: improve type
 * @typedef {{ nodeName: string
 *           ; outerHTML: unknown }} Tree
 */

/** TODO: improve type
 * @typedef {Partial<{ events:     object
 *                   ; components: object
 *                   ; href:       string
 *                   ; title:      string
 *                   ; query:      unknown
 *                   ; route:      unknown
 *                   ; params:     unknown
 *                   ; cache:      unknown}>} State
 */

/** TODO: improve type
 * @typedef {{ href: string
 *           ; hash: string }} Location
 */

/** TODO: improve type
 * @typedef {(state: State) => unknown} Store
 */

module.exports = class choo {
  /** TODO: improve type
   * @private
   */
  HISTORY_OBJECT

  /** TODO: improve type
   * @private
   * @readonly
   * @type {nanotiming}
   */
  timing

  /**
   * @private
   * @type {object}
   * @readonly
   */
  _events

  /**
   * @private
   * @readonly
   * @type {boolean}
   */
  _historyEnabled

  /**
   * @private
   * @readonly
   * @type {boolean}
   */
  _hrefEnabled

  /**
   * @private
   * @readonly
   * @type {boolean}
   */
  _hashEnabled

  /**
   * @private
   * @readonly
   * @type {boolean}
   */
  _hasWindow

  /** TODO: improve type
   * @private
   * @type {unknown}
   */
  _cache

  /**
   * @private
   * @type {boolean}
   */
  _loaded

  /**
   * @private
   * @type {Array<Store>}
   */
  _stores

  /**
   * @private
   * @type {Tree}
   */
  _tree

  /**
   * @private
   * @type {State}
   */
  state

  /**
   * @public
   * @readonly
   * @type {nanorouter}
   */
  router

  /**
   * @public
   * @readonly
   * @type nanobus
   */
  emitter

  /**
   * @public
   * @readonly
   * @type unknown
   */
  emit

  /**
   * @param {{ history?: boolean
   *         ; href?:    boolean
   *         ; hash?:    boolean
   *         ; cache?:   object }} opts
   */
  constructor(opts = {}) {
    this.timing = new nanotiming('Picochoo.constructor')

    this.HISTORY_OBJECT = {}

    // define events used by choo
    this._events = {
      DOMCONTENTLOADED: 'DOMContentLoaded',
      DOMTITLECHANGE: 'DOMTitleChange',
      REPLACESTATE: 'replaceState',
      PUSHSTATE: 'pushState',
      NAVIGATE: 'navigate',
      POPSTATE: 'popState',
      RENDER: 'render'
    }

    this._historyEnabled = opts.history === undefined ? true : opts.history
    this._hrefEnabled = opts.href === undefined ? true : opts.href
    this._hashEnabled = opts.hash === undefined ? false : opts.hash
    this._hasWindow = typeof window !== 'undefined'

    const ondomtitlechange = (/** @type {State} */state) => {
      this.emitter.prependListener(this._events.DOMTITLECHANGE, (/** @type {string} */title) => {
        assert.equal(typeof title, 'string', 'events.DOMTitleChange: title should be type string')
        state.title = title
        if (this._hasWindow) document.title = title
      })
    }

    this._cache = opts.cache
    this._loaded = false
    this._stores = [ondomtitlechange]
    this._tree = null

    const _state = {
      events: this._events,
      components: {}
    };

    if (this._hasWindow) {
      this.state = window?.['initialState']
        ? Object.assign({}, window['initialState'], _state)
        : _state
      delete window['initialState']
    } else {
      this.state = _state
    }

    // properties that are part of the API
    this.router = nanorouter({ curry: true })
    this.emitter = new nanobus('choo.emit')
    this.emit = this.emitter.emit.bind(this.emitter)

    // listen for title changes; available even when calling .toString()
    if (this._hasWindow) this.state.title = document.title

    this.timing()
  }

  /**
   * @public
   * @param {string} route
   * @param {function} handler
   * @return void
   */
  route(route, handler) {
    const timing = nanotiming("choo.route('" + route + "')")
    this.router.on(route, handler)
    timing()
  }

  /**
    * @pbulic
    * @param {{ storeName: string } & Function} cb
    * @return void
    */
  use(cb) {
    this._stores.push((state) => {
      let msg = 'choo.use'
      msg = cb.storeName ? msg + '(' + cb.storeName + ')' : msg
      const timing = nanotiming(msg)
      cb(state, this.emitter, this)
      timing()
    })
  }

  /**
   * @return {Tree}
   */
  start() {
    const timing = nanotiming('choo.start')

    if (this._historyEnabled) {
      this.emitter.prependListener(this._events.NAVIGATE, () => {
        this._matchRoute(this.state)
        if (this._loaded) {
          this.emitter.emit(this._events.RENDER)
          setTimeout(scrollToAnchor.bind(null, window.location.hash), 0)
        }
      })

      this.emitter.prependListener(this._events.POPSTATE, function () {
        this.emitter.emit(this._events.NAVIGATE)
      })

      this.emitter.prependListener(this._events.PUSHSTATE, (/** @type {string} */href) => {
        window.history.pushState(this.HISTORY_OBJECT, null, href)
        this.emitter.emit(this._events.NAVIGATE)
      })

      this.emitter.prependListener(this._events.REPLACESTATE, (/** @type {string} */href) => {
        window.history.replaceState(this.HISTORY_OBJECT, null, href)
        this.emitter.emit(this._events.NAVIGATE)
      })

      window.onpopstate = () => {
        this.emitter.emit(this._events.POPSTATE)
      }

      if (this._hrefEnabled) {
        nanohref((/** @type {Location} */location) => {
          const href = location.href
          const hash = location.hash
          if (href === window.location.href) {
            if (!this._hashEnabled && hash) scrollToAnchor(hash)
            return
          }
          this.emitter.emit(this._events.PUSHSTATE, href)
        })
      }
    }

    this._setCache(this.state)
    this._matchRoute(this.state)
    this._stores.forEach((/** @type {Function} */initStore) => {
      initStore(this.state)
    })

    this._tree = this._prerender(this.state)
    assert.ok(this._tree, 'choo.start: no valid DOM node returned for location ' + this.state.href)

    this.emitter.prependListener(this._events.RENDER, nanoraf(() => {
      const renderTiming = nanotiming('choo.render')
      const newTree = this._prerender(this.state)
      assert.ok(newTree, 'choo.render: no valid DOM node returned for location ' + this.state.href)

      assert.equal(this._tree.nodeName, newTree.nodeName, 'choo.render: The target node <' +
                   this._tree.nodeName.toLowerCase() + '> is not the same type as the new node <' +
      newTree.nodeName.toLowerCase() + '>.')

      const morphTiming = nanotiming('choo.morph')
      nanomorph(this._tree, newTree)
      morphTiming()

      renderTiming()
    }))

    documentReady(() => {
      this.emitter.emit(this._events.DOMCONTENTLOADED)
      this._loaded = true
    })

    timing()
    return this._tree
  }

  /**
   * @param {string | object} selector
   */
  mount(selector) {
    const timing = nanotiming("choo.mount('" + selector + "')")
    if (typeof window !== 'object') {
      assert.ok(typeof selector === 'string', 'choo.mount: selector should be type String')
      this.selector = selector
      timing()
      return this
    }

    assert.ok(typeof selector === 'string' || typeof selector === 'object', 'choo.mount: selector should be type String or HTMLElement')

    documentReady(() => {
      const timing = nanotiming('choo.render')
      const newTree = this.start()
      if (typeof selector === 'string') {
        this._tree = document.querySelector(selector)
      } else {
        this._tree = selector
      }

      assert.ok(this._tree, 'choo.mount: could not query selector: ' + selector)
      assert.equal(this._tree.nodeName, newTree.nodeName, 'choo.mount: The target node <' +
                   this._tree.nodeName.toLowerCase() + '> is not the same type as the new node <' +
      newTree.nodeName.toLowerCase() + '>.')

      const morphTiming = nanotiming('choo.morph')
      nanomorph(this._tree, newTree)
      morphTiming()

      timing()
    })

    documentReady(() => {
      const timing = nanotiming('choo.render')
      const newTree = this.start()

      if (typeof selector === 'string') {
        this._tree = document.querySelector(selector)
      } else {
        this._tree = selector
      }

      assert.ok(this._tree, 'choo.mount: could not query selector: ' + selector)
      assert.equal(this._tree.nodeName, newTree.nodeName, 'choo.mount: The target node <' +
                   this._tree.nodeName.toLowerCase() + '> is not the same type as the new node <' +
                   newTree.nodeName.toLowerCase() + '>.')

      const morphTiming = nanotiming('choo.morph')
      nanomorph(this._tree, newTree)
      morphTiming()

      timing()
    })

    timing()
  }

  /**
   * @param {string} location
   * @param {Partial<State>} state
   */
  toString(location, state) {
    state = state || {}
    state.components = state.components || {}
    state.events = Object.assign({}, state.events, this._events)

    assert.notEqual(typeof window, 'object', 'choo.mount: window was found. .toString() must be called in Node, use .start() or .mount() if running in the browser')
    assert.equal(typeof location, 'string', 'choo.toString: location should be type string')
    assert.equal(typeof state, 'object', 'choo.toString: state should be type object')

    this._setCache(state)
    this._matchRoute(state, location)
    this.emitter.removeAllListeners()
    this._stores.forEach((/** @type {Function}*/initStore) => {
      initStore(state)
    })

    const html = this._prerender(state)
    assert.ok(html, 'choo.toString: no valid value returned for the route ' + location)
    assert(!Array.isArray(html), 'choo.toString: return value was an array for the route ' + location)
    return typeof html.outerHTML === 'string' ? html.outerHTML : html.toString()
  }

  /**
   * @private
   * @param {State} state
   * @param {string | undefined} locationOverride
   * @return {void}
   */
  _matchRoute(state, locationOverride = void 0) {
    let location, queryString
    if (locationOverride) {
      location = locationOverride.replace(/\?.+$/, '').replace(/\/$/, '')
      if (!this._hashEnabled) location = location.replace(/#.+$/, '')
      queryString = locationOverride
    } else {
      location = window.location.pathname.replace(/\/$/, '')
      if (this._hashEnabled) location += window.location.hash.replace(/^#/, '/')
      queryString = window.location.search
    }

    const matched = this.router.match(location)

    this._handler = matched.cb
    state.href = location
    state.query = nanoquery(queryString)
    state.route = matched.route
    state.params = matched.params
  }

  /**
   * @private
   * @param {State} state
   * @return {Tree}
   */
  _prerender(state) {
    const timing = nanotiming("choo.prerender('" + state.route + "')")
    const res = this._handler(state, this.emit)
    timing()
    return res
  }

  /**
   * @oruvate
   * @return {void}
   */
  _setCache(/** @type {State} */state) {
    const cache = new Cache(state, this.emitter.emit.bind(this.emitter), this._cache)
    state.cache = renderComponent

    function renderComponent (/** @type {Function} */Component, /** @type {string} */id) {
      assert.equal(typeof Component, 'function', 'choo.state.cache: Component should be type function')
      let args = []
      for (let i = 0, len = arguments.length; i < len; i++) {
        args.push(arguments[i])
      }
      return cache.render.apply(cache, args)
    }

    // When the state gets stringified, make sure `state.cache` isn't
    // stringified too.
    renderComponent.toJSON = function () {
      return null
    }

  }
}

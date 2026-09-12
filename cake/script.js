class Camera {
	constructor() {
		this.element = document.querySelector('[data-camera]')
		this.scene = this.element.querySelector('[data-scene]')
		this.rotation = { x: 46, z: 0 }
		this.zoom = 1
		this.dragging = false
		this.lastPoint = { x: 0, y: 0 }
		this.pointers = new Map()
		this.options = { rotate: { speed: 1 } }
		this.galaxy = new GalaxyTransition(this)
	}

	setOptimalPerspective() {
		const size = Math.min(window.innerWidth, window.innerHeight)
		document.documentElement.style.setProperty('--px', `${size / 700}px`)
		return this
	}

	with(options) {
		this.options = { ...this.options, ...options, rotate: { ...this.options.rotate, ...options.rotate } }
		return this
	}

	init() {
		this.updateScene()
		this.element.addEventListener('pointerdown', (event) => {
			if (this.galaxy.open || this.galaxy.animating) return
			this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
			this.dragging = true
			this.lastPoint = { x: event.clientX, y: event.clientY }
			this.element.setPointerCapture(event.pointerId)
		})
		this.element.addEventListener('pointermove', (event) => {
			if (this.pointers.has(event.pointerId)) {
				this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
			}
			if (this.pointers.size > 1) {
				const points = [...this.pointers.values()]
				const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
				const previous = this.pinchDistance || distance
				this.setZoom(this.zoom + (distance - previous) * 0.004)
				this.pinchDistance = distance
				return
			}
			if (!this.dragging) return
			this.rotation.z += (event.clientX - this.lastPoint.x) * this.options.rotate.speed * 0.35
			this.rotation.x += (event.clientY - this.lastPoint.y) * this.options.rotate.speed * 0.35
			this.rotation.x = Math.max(-80, Math.min(140, this.rotation.x))
			this.lastPoint = { x: event.clientX, y: event.clientY }
			this.updateScene()
		})
		this.element.addEventListener('pointerup', (event) => {
			this.pointers.delete(event.pointerId)
			this.pinchDistance = null
			this.dragging = this.pointers.size > 0
			if (!this.dragging) this.galaxy.settle()
		})
		this.element.addEventListener('pointercancel', (event) => {
			this.pointers.delete(event.pointerId)
			this.pinchDistance = null
			this.dragging = this.pointers.size > 0
			if (!this.dragging) this.galaxy.settle(true)
		})
		this.element.addEventListener('wheel', (event) => {
			event.preventDefault()
			this.setZoom(this.zoom - event.deltaY * 0.0015)
		}, { passive: false })
		window.addEventListener('keydown', (event) => {
			if (event.key === '+' || event.key === '=') this.setZoom(this.zoom + 0.15)
			if (event.key === '-' || event.key === '_') this.setZoom(this.zoom - 0.15)
		})
		window.addEventListener('resize', () => this.setOptimalPerspective().updateScene())
		document.querySelector('[data-close]').addEventListener('click', () => {
			document.querySelector('#howto').removeAttribute('data-open')
		})
		document.querySelector('[data-howto]').addEventListener('click', () => {
			document.querySelector('#howto').setAttribute('data-open', '')
		})
		return this
	}

	updateScene() {
		this.scene.style.transform = `translate(-50%, -50%) translateZ(calc(var(--translateZ) * 1px)) rotateX(${Math.min(80, this.rotation.x)}deg) rotateZ(${this.rotation.z}deg) scale(${this.zoom})`
		this.galaxy.followTilt(this.rotation.x)
	}

	setZoom(value) {
		this.zoom = Math.max(0.7, Math.min(2.2, value))
		this.updateScene()
	}
}

class GalaxyTransition {
	constructor(camera) {
		this.camera = camera
		this.frame = document.querySelector('#galaxy-frame')
		this.reveal = document.querySelector('#galaxy-reveal')
		this.back = document.querySelector('#return-to-cake')
		this.progress = 0
		this.ready = false
		this.open = false
		this.animating = false
		this.active = false
		this.back.addEventListener('click', () => this.animateTo(0))
		window.addEventListener('keydown', event => {
			if (event.key === 'Escape' && this.progress > 0) this.animateTo(0)
		})
		window.addEventListener('message', event => {
			if (event.source !== this.frame.contentWindow) return
			if (event.data?.type === 'kenny-galaxy-ready') {
				this.ready = true
				this.followTilt(this.camera.rotation.x)
				if (!this.camera.dragging && this.progress > 0) this.settle()
			}
			if (event.data?.type === 'kenny-galaxy-back') this.animateTo(0)
		})
		this.frame.contentWindow.postMessage({ type: 'kenny-galaxy-check' }, '*')
	}

	followTilt(angle) {
		if (!this.ready || this.open || this.animating) return
		// El giro normal permanece hasta 58 grados; después revela la galaxia.
		this.render(Math.max(0, Math.min(1, (angle - 58) / 72)))
	}

	render(progress) {
		this.progress = progress
		document.body.style.setProperty('--galaxy-progress', progress)
		document.body.classList.toggle('galaxy-transition', progress > 0)
		this.back.hidden = progress === 0
		const active = progress > 0
		if (active !== this.active) {
			this.active = active
			this.frame.contentWindow.postMessage({ type: 'kenny-galaxy-visibility', active }, '*')
		}
	}

	settle(cancelled = false) {
		if (this.open || this.animating) return
		if (!this.ready || this.progress === 0) {
			if (this.camera.rotation.x > 58) {
				this.camera.rotation.x = 46
				this.camera.updateScene()
			}
			return
		}
		this.animateTo(!cancelled && this.progress >= .5 ? 1 : 0)
	}

	animateTo(destination) {
		if (this.animating) return
		this.animating = true
		this.open = false
		document.body.classList.remove('galaxy-open')
		this.reveal.setAttribute('aria-hidden', 'true')
		this.frame.tabIndex = -1
		const from = this.progress
		const angleFrom = this.camera.rotation.x
		const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 460
		const start = performance.now()
		const step = now => {
			const t = Math.min(1, (now - start) / duration)
			const eased = 1 - (1 - t) ** 3
			this.render(from + (destination - from) * eased)
			if (destination === 0) {
				this.camera.rotation.x = angleFrom + (46 - angleFrom) * eased
				this.camera.updateScene()
			}
			if (t < 1) return requestAnimationFrame(step)
			this.animating = false
			this.open = destination === 1
			document.body.classList.toggle('galaxy-open', this.open)
			this.reveal.setAttribute('aria-hidden', String(!this.open))
			this.frame.tabIndex = this.open ? 0 : -1
			if (this.open) this.back.focus({ preventScroll: true })
			else {
				this.camera.element.tabIndex = -1
				this.camera.element.focus({ preventScroll: true })
			}
		}
		requestAnimationFrame(step)
	}
}

function initBirthdayCelebration() {
	const candle = document.querySelector('.candle')
	const wick = candle.querySelector('.candle-wick')
	const button = document.querySelector('#light-candle')
	const music = document.querySelector('#birthday-music')
	const hint = document.querySelector('#lighter-hint')
	let hintTimer
	function showHint() {
		if (button.disabled || button.classList.contains('is-dragging')) return
		window.clearTimeout(hintTimer)
		hint.classList.add('is-visible')
		hintTimer = window.setTimeout(() => hint.classList.remove('is-visible'), 5000)
	}
	function hideHint() {
		window.clearTimeout(hintTimer)
		hint.classList.remove('is-visible')
	}
	showHint()
	button.addEventListener('pointerenter', showHint)
	button.addEventListener('focus', showHint)
	button.addEventListener('pointerdown', hideHint)
	const target = document.createElement('div')
	target.className = 'wick-target'
	target.setAttribute('aria-hidden', 'true')
	document.body.appendChild(target)
	let started = false
	let drag = null
	let frame = 0
	let musicAttempt = 0
	let musicReady = false
	let musicFailed = false
	let candleReady = false

	function revealMusic() {
		if (!candleReady) return
		music.hidden = false
		if (musicReady) music.currentTime = 0
		if (musicReady || musicFailed) music.muted = false
	}

	function prepareMusic() {
		const attempt = ++musicAttempt
		musicReady = false
		musicFailed = false
		music.muted = true
		// El gesto inicial permite preparar el audio sin que se oiga aún.
		music.play().then(() => {
			if (attempt !== musicAttempt) return
			musicReady = true
			revealMusic()
		}).catch(() => {
			if (attempt !== musicAttempt) return
			musicFailed = true
			revealMusic()
		})
	}

	function finishDrag() {
		if (!drag) return
		const previous = drag
		drag = null
		cancelAnimationFrame(frame)
		target.classList.remove('is-visible', 'is-near')
		target.style.setProperty('--progress', '0deg')
		button.classList.remove('is-dragging')
		if (button.hasPointerCapture(previous.id)) button.releasePointerCapture(previous.id)
		if (started) {
			previous.ghost.classList.add('is-finished')
			window.setTimeout(() => previous.ghost.remove(), 350)
		} else {
			previous.ghost.remove()
			musicAttempt++
			music.pause()
			music.muted = true
		}
	}

	function ignite() {
		if (started) return
		started = true
		candle.classList.add('is-lit')
		finishDrag()
		button.disabled = true
		button.hidden = true
		hideHint()
		window.setTimeout(() => {
			candleReady = true
			revealMusic()
		}, 450)
	}

	function updateDrag(now) {
		if (!drag) return
		const bounds = wick.getBoundingClientRect()
		const x = bounds.left + bounds.width / 2
		const y = bounds.top + bounds.height / 2
		target.style.left = `${x}px`
		target.style.top = `${y}px`
		const near = Math.hypot(drag.left + 37 - x, drag.top + 8 - y) < drag.radius
		target.classList.toggle('is-near', near)
		drag.ghost.classList.toggle('is-near', near)
		if (!near) drag.nearSince = null
		else if (drag.nearSince === null) drag.nearSince = now
		const progress = near ? Math.min((now - drag.nearSince) / 500, 1) : 0
		target.style.setProperty('--progress', `${progress * 360}deg`)
		if (progress === 1) return ignite()
		frame = requestAnimationFrame(updateDrag)
	}

	button.addEventListener('pointerdown', event => {
		if (started || drag || !event.isPrimary || event.button !== 0) return
		event.preventDefault()
		const bounds = button.getBoundingClientRect()
		const ghost = document.createElement('div')
		ghost.className = 'drag-lighter'
		ghost.setAttribute('aria-hidden', 'true')
		ghost.appendChild(button.querySelector('img').cloneNode(true))
		const flame = document.createElement('span')
		flame.className = 'drag-lighter-flame'
		ghost.appendChild(flame)
		document.body.appendChild(ghost)
		drag = { id: event.pointerId, ghost, left: bounds.left, top: bounds.top,
			offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top,
			radius: event.pointerType === 'touch' ? 46 : 34, nearSince: null }
		ghost.style.left = `${drag.left}px`
		ghost.style.top = `${drag.top}px`
		button.setPointerCapture(event.pointerId)
		button.classList.add('is-dragging')
		target.classList.add('is-visible')
		prepareMusic()
		frame = requestAnimationFrame(updateDrag)
	})
	button.addEventListener('pointermove', event => {
		if (!drag || drag.id !== event.pointerId) return
		drag.left = event.clientX - drag.offsetX
		drag.top = event.clientY - drag.offsetY
		drag.ghost.style.left = `${drag.left}px`
		drag.ghost.style.top = `${drag.top}px`
	})
	for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
		button.addEventListener(name, event => {
			if (drag && drag.id === event.pointerId) finishDrag()
		})
	}
	window.addEventListener('blur', finishDrag)
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) finishDrag()
	})
	// Alternativa accesible para teclado; un clic de ratón no enciende la vela.
	button.addEventListener('click', event => {
		if (event.detail !== 0 || started || drag) return
		prepareMusic()
		ignite()
	})
	music.addEventListener('error', () => {
		musicFailed = true
		revealMusic()
	})
}

window.addEventListener('DOMContentLoaded', () => {
	initBirthdayCelebration()
	// Capas reales en profundidad para el relieve del letrero.
	const lettering = document.querySelector('.birthday-lettering')
	const front = lettering.querySelector('.birthday-text-front')
	for (let depth = 0; depth < 8; depth++) {
		const layer = front.cloneNode(true)
		layer.className = 'birthday-text birthday-text-depth'
		layer.style.setProperty('--text-depth', `${depth}`)
		lettering.insertBefore(layer, front)
	}
	// Caras tangentes de un cilindro; el eje Z es la altura del pastel.
	const candleBody = document.querySelector('.candle-body')
	for (let i = 0; i < 16; i++) {
		const face = document.createElement('span')
		face.style.setProperty('--face-angle', `${i * 22.5}deg`)
		face.style.setProperty('--face-shade', (0.08 + 0.22 * (1 + Math.cos(i * Math.PI / 8)) / 2).toFixed(3))
		candleBody.appendChild(face)
	}
	new Camera()
		.setOptimalPerspective()
		.with({
			debug: true,
			rotate: {
				speed: 1.2
			}
		})
		.init()
})


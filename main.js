const attendance = 75,
	width = 30,
	depth = 20,
	height = 12,
	placardCount = 8,
	gravity = -1.5 / 10000,
	maxPower = 0.075,
	powerSpeed = maxPower / 1500;
let lastFrame = Date.now();

document.addEventListener('DOMContentLoaded', e => {

	const scene = document.getElementById('scene'),
		hud = document.getElementById('hud'),
		angleSpan = document.getElementById('angle'),
		powerDiv = document.getElementById('power-meter'),
		crowd = [],
		placards = [],
		fash = new Fash(),
		milkshake = new Milkshake(fash);
	let angle = 0,
		power = 0,
		mouseDown, mouseUp, reset = 0, aiming = true;

	for (let i = 0; i < attendance; ++i) {
		const attendee = new Attendee();
		crowd.push(attendee);
		attendee.addToScene(scene);
	}
	for (let i = 0; i < placardCount; ++i) {
		const placard = new Placard();
		crowd.push(placard);
		placard.addToScene(scene);
	}
	milkshake.addToScene(scene);
	fash.addToScene(scene);

	hud.addEventListener('mousemove', e => {
		if (!aiming) return;
		const y = 1 - e.layerY / hud.clientHeight,
			x = e.layerX / hud.clientWidth;
		angle = y * 60;
		angleSpan.innerHTML = `Angle: ${Math.round(angle)}°`;
		milkshake.x = (0.5 + (x - 0.5) * 0.4) * width;
	});

	hud.addEventListener('mousedown', e => {
		if (!aiming) return;
		if (lastFrame > reset + 250)
		mouseDown = lastFrame;
	});
	hud.addEventListener('mouseup', e => {
		if (!aiming) return;
		milkshake.launch(angle, Math.min(power, 2));
		mouseDown = null;
		mouseUp = lastFrame;
		aiming = false;
	});
	hud.addEventListener('click', e => {
		if (aiming) return;
		if (lastFrame > mouseUp + 500) {
			milkshake.reset();
			mouseup = null;
			reset = lastFrame;
			aiming = true;
		}
	});

	requestAnimationFrame(update);

	function update(timestamp) {
		for (const attendee of crowd) attendee.update(timestamp);
		for (const placard of placards) placard.update(timestamp);
		milkshake.update(timestamp);
		fash.update(timestamp);
		lastFrame = timestamp;
		if (mouseDown) {
			power = Math.min(
				(timestamp - mouseDown) * powerSpeed,
				maxPower);
			powerDiv.style.transform = `scale(1, ${power / maxPower})`;
		}
		requestAnimationFrame(update);
	}
});

class Thing {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.el = document.createElement('div');
		this.el.style.background = `hsla(${Math.random() * 360}deg, 50%, 50%, 100%)`;
		this.el.classList.add('thing');
	}

	addToScene(scene) {
		scene.appendChild(this.el);
	}

	update(timestamp) {
		this.el.style.transform =
			`translate3d(${this.x - width / 2}em,
				${height / 2 - this.y}em,
				${this.z - depth / 2}em)`;
		this.el.style.zIndex = ~~(this.z * 10000);
	}
}

class Attendee extends Thing {
	constructor() {
		super(Math.random() * width, 0, Math.random() * depth);
		this.el.classList.add('attendee');
		this.centralX = this.x;
		this.phase = Math.random() * Math.PI * 2;
	}

	update(timestamp) {
		this.x = this.centralX +
			0.5 * Math.cos(timestamp * 0.002 + this.phase);
		super.update(timestamp);
	}
}

class Placard extends Thing {
	constructor() {
		super(Math.random() * width, 5, (Math.random() * 0.8 + 0.1) * depth);
		this.el.classList.add('placard');
		this.phase = Math.random() * Math.PI * 2;
		this.speed = Math.random() * 0.0008 + 0.0005;
		const board = document.createElement('div');
		if (Math.random() < 0.3) {
			board.appendChild(document.createTextNode(
				'i am a racist'));
			this.el.classList.add('racist');
		} else {
			board.appendChild(document.createTextNode(
				'go away, nigel'));
		}
		this.el.appendChild(board);
		this.el.style.background = 'none';
	}

	update(timestamp) {
		super.update(timestamp);
		this.el.style.transform += `rotate(${
			35 * Math.cos(timestamp * this.speed + this.phase)
		}deg)`;
	}
}

class Milkshake extends Thing {
	constructor(target) {
		super();
		this.splat = new Splat();
		this.el.classList.add('milkshake');
		this.reset();
		this.target = target;
	}

	launch(angle, power) {
		this.launched = true;
		const radians = angle * Math.PI / 180;
		this.vy = Math.sin(radians) * power;
		this.vz = -Math.cos(radians) * power;
		// angle it so it hits the fash
		const flightTime = (this.target.z - this.z) / this.vz,
			targetX = this.target.xAt(lastFrame + flightTime);
		this.vx = this.vz * (this.x - targetX) / this.z;
		this.splat.stop();
	}

	reset() {
		this.launched = false;
		this.z = depth;
		this.x = width / 2;
		this.y = 3;
		this.vx = 0;
		this.vy = 0;
		this.vz = 0;
	}

	update(timestamp) {
		if (this.launched) {
			const t = timestamp - lastFrame;
			this.x += this.vx * t;
			this.y += this.vy * t;
			this.z += this.vz * t;
			this.vy += gravity * t;
		}
		super.update(timestamp);
		this.splat.update(timestamp);
	}

	addToScene(scene) {
		this.splat.addToScene(scene);
		super.addToScene(scene);
	}

	splat() {
		this.splat.splat(this.x, this.y, this.z);
	}
}

class Splat extends Thing {
	constructor() {
		super();
		this.el.classList.add('splat');
	}

	splat(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.el.classList.add('go');
	}

	stop() {
		this.el.classList.remove('go');
	}
}

class Fash extends Thing {
	constructor() {
		super(width / 2, 8, 0);
		this.el.classList.add('fash');
	}

	xAt(timestamp) {
		return width * (0.5 + 0.4 * Math.sin(timestamp * 0.0006));
	}

	update(timestamp) {
		this.x = this.xAt(timestamp);
		super.update(timestamp);
	}
}

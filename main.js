const attendance = 75,
	width = 30,
	depth = 20,
	height = 12,
	placardCount = 7,
	gravity = -1.4 / 10000,
	maxPower = 0.07,
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
		mouseDown, mouseUp, lastReset = 0, aiming = true, done = false;

	for (let i = 0; i < attendance; ++i) {
		const attendee = new Attendee();
		crowd.push(attendee);
		attendee.addToScene(scene);
	}
	for (let i = 0; i < placardCount; ++i) {
		const placard = new Placard();
		placards.push(placard);
		placard.addToScene(scene);
	}
	milkshake.addToScene(scene);
	fash.addToScene(scene);

	hud.addEventListener('mousemove', e => {
		if (!aiming || done) return;
		const y = 1 - e.layerY / hud.clientHeight,
			x = e.layerX / hud.clientWidth;
		angle = y * 60;
		angleSpan.innerHTML = `Angle: ${Math.round(angle)}°`;
		milkshake.x = (0.5 + (x - 0.5) * 0.4) * width;
	});

	hud.addEventListener('mousedown', e => {
		if (!aiming || done) return;
		if (lastFrame > lastReset + 250)
			mouseDown = lastFrame;
	});
	hud.addEventListener('mouseup', e => {
		if (!aiming || done) return;
		milkshake.launch(angle, Math.min(power, 2));
		mouseDown = null;
		mouseUp = lastFrame;
		aiming = false;
	});
	hud.addEventListener('click', e => {
		if (aiming || done) return;
		if (lastFrame > mouseUp + 500) reset();
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
		if (!done) checkCollisions();
		requestAnimationFrame(update);
	}

	function checkCollisions(timestamp) {
		if (milkshake.launched) {
			if (milkshake.y < 0) {
				console.log('You hit a spectator.');
				miss();
				return;
			}
			if (milkshake.z < -1) {
				console.log('You hit the stage.');
				miss();
				return;
			}
			// check if we hit a placard
			// console.log('Moved from', milkshake.lastZ, 'to', milkshake.z);
			for (const placard of placards) {
				// console.log('Placard is at', placard.z);
				if (milkshake.z > placard.z || milkshake.lastZ < placard.z)
					continue;
				// we passed a placard!
				let { x, y } = milkshake;
				console.log('Placard passing coords:', { x, y });
				// adjust for centre of placard rotation
				x -= placard.x;
				y -= placard.y - 2.5;
				console.log('Relative to base:', { x, y });
				// now rotate into placard-space
				const placardRadians = -placard.angle * Math.PI / 180,
					sin = Math.sin(placardRadians),
					cos = Math.cos(placardRadians);
				[ x, y ] = [ x * cos + y * sin, y * cos - x * sin ];
				console.log('Placard-space coords:', { x, y });
				// now check the collission
				if ((Math.abs(x) < 2.5) && (y > 3) && (y < 7)) {
					console.log('You hit a placard.');
					miss();
					const stain = document.createElement('div');
					stain.classList.add('stain');
					stain.style.left = `${2.5 + x}em`;
					stain.style.top = `${7 - y}em`;
					placard.board.appendChild(stain);
					return;
				}
			}
			// check if we hit the fash
			if (milkshake.z < fash.z && milkshake.lastZ > fash.z
				&& Math.abs(milkshake.x - fash.x) < 2.5
				&& Math.abs(milkshake.y - fash.y) < 7.5)
			{
				console.log('You splashed the fash!');
				done = true;
				milkshake.splat();
				milkshake.el.style.display = 'none';
			}
		}
	}

	function miss() {
		milkshake.splat();
		milkshake.reset();
		mouseup = null;
		lastReset = lastFrame;
		aiming = true;
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
		// super(width / 2, 5, depth * 0.8); // (debug placard)
		this.el.classList.add('placard');
		this.phase = Math.random() * Math.PI * 2;
		this.speed = Math.random() * 0.0008 + 0.0005;
		this.board = document.createElement('div');
		if (Math.random() < 0.3) {
			this.board.appendChild(document.createTextNode(
				'i am a racist'));
			this.el.classList.add('racist');
		} else {
			this.board.appendChild(document.createTextNode(
				'go away, nigel'));
		}
		this.el.appendChild(this.board);
		this.el.style.background = 'none';
	}

	update(timestamp) {
		this.angle = 35 * Math.cos(timestamp * this.speed + this.phase);
		super.update(timestamp);
		this.el.style.transform += `rotate(${ this.angle }deg)`;
	}
}

class Milkshake extends Thing {
	constructor(target) {
		super();
		this.kersplat = new Splat();
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
		this.kersplat.stop();
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
			this.lastX = this.x;
			this.lastY = this.y;
			this.lastZ = this.z;
			this.x += this.vx * t;
			this.y += this.vy * t;
			this.z += this.vz * t;
			this.vy += gravity * t;
		}
		super.update(timestamp);
		this.kersplat.update(timestamp);
	}

	addToScene(scene) {
		this.kersplat.addToScene(scene);
		super.addToScene(scene);
	}

	splat() {
		this.kersplat.splat(this.lastX, this.lastY, this.lastZ);
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

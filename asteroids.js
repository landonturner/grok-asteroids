// asteroids.js

// Virtual game dimensions for consistent logic
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

// Game constants
const ROTATION_SPEED = 0.1; // radians per frame
const THRUST_POWER = 0.1; // acceleration per frame
const LASER_SPEED = 5; // pixels per frame
const LASER_LIFESPAN = 60; // frames
const SHOOT_INTERVAL = 15; // frames between shots

// Vector class for position and velocity
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

// Base class for game objects
class GameObject {
    constructor(x, y) {
        this.position = new Vector(x, y);
        this.velocity = new Vector(0, 0);
        this.radius = 0; // Set by subclasses
    }

    update() {
        this.position = this.position.add(this.velocity);
    }

    draw(context) {
        // Implemented by subclasses
    }

    collidesWith(other) {
        const distance = this.position.subtract(other.position).magnitude();
        return distance < this.radius + other.radius;
    }
}

// Spaceship class with corrected thrust and shoot directions
class Spaceship extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.angle = 0; // Facing up
        this.thrusting = false;
        this.shootCooldown = 0;
        this.radius = 15;
    }

    rotateLeft() {
        this.angle -= ROTATION_SPEED;
    }

    rotateRight() {
        this.angle += ROTATION_SPEED;
    }

    thrust() {
        this.thrusting = true;
        // Acceleration uses sin for x and -cos for y to match facing direction
        const acceleration = new Vector(Math.sin(this.angle), -Math.cos(this.angle)).multiply(THRUST_POWER);
        this.velocity = this.velocity.add(acceleration);
    }

    shoot() {
        if (this.shootCooldown > 0) return null;
        this.shootCooldown = SHOOT_INTERVAL;
        // Laser velocity uses sin for x and -cos for y to match facing direction
        const laserVelocity = new Vector(Math.sin(this.angle), -Math.cos(this.angle)).multiply(LASER_SPEED);
        return new Laser(this.position.x, this.position.y, laserVelocity);
    }

    update() {
        super.update();
        this.thrusting = false;
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    draw(context) {
        context.save();
        context.translate(this.position.x, this.position.y);
        context.rotate(this.angle);
        context.beginPath();
        context.moveTo(0, -10); // Tip
        context.lineTo(5, 10);  // Right base
        context.lineTo(-5, 10); // Left base
        context.closePath();
        context.strokeStyle = 'white';
        context.stroke();
        if (this.thrusting) {
            context.beginPath();
            context.moveTo(-3, 10);
            context.lineTo(0, 15);
            context.lineTo(3, 10);
            context.stroke();
        }
        context.restore();
    }
}

// Laser class
class Laser extends GameObject {
    constructor(x, y, velocity) {
        super(x, y);
        this.velocity = velocity;
        this.lifespan = LASER_LIFESPAN;
        this.hasHit = false;
        this.radius = 2;
    }

    update() {
        super.update();
        this.lifespan--;
        if (this.lifespan <= 0 || 
            this.position.x < 0 || this.position.x > VIRTUAL_WIDTH || 
            this.position.y < 0 || this.position.y > VIRTUAL_HEIGHT) {
            this.hasHit = true;
        }
    }

    draw(context) {
        context.beginPath();
        context.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
        context.fillStyle = 'white';
        context.fill();
    }
}

// Asteroid class
class Asteroid extends GameObject {
    constructor(x, y, size) {
        super(x, y);
        this.size = size;
        this.radius = size === 'large' ? 40 : size === 'medium' ? 20 : 10;
        this.points = [];
        for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI * 2 / 10;
            const r = this.radius + Math.random() * 10 - 5;
            this.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        this.velocity = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }

    update() {
        super.update();
    }

    draw(context) {
        context.save();
        context.translate(this.position.x, this.position.y);
        context.beginPath();
        this.points.forEach((p, i) => {
            i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y);
        });
        context.closePath();
        context.strokeStyle = 'white';
        context.stroke();
        context.restore();
    }

    split() {
        if (this.size === 'large') {
            const a1 = new Asteroid(this.position.x, this.position.y, 'medium');
            const a2 = new Asteroid(this.position.x, this.position.y, 'medium');
            a1.velocity = new Vector(Math.random() * 4 - 2, Math.random() * 4 - 2);
            a2.velocity = new Vector(Math.random() * 4 - 2, Math.random() * 4 - 2);
            return [a1, a2];
        } else if (this.size === 'medium') {
            const a1 = new Asteroid(this.position.x, this.position.y, 'small');
            const a2 = new Asteroid(this.position.x, this.position.y, 'small');
            a1.velocity = new Vector(Math.random() * 4 - 2, Math.random() * 4 - 2);
            a2.velocity = new Vector(Math.random() * 4 - 2, Math.random() * 4 - 2);
            return [a1, a2];
        }
        return [];
    }
}

// Main Game class
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.virtualWidth = VIRTUAL_WIDTH;
        this.virtualHeight = VIRTUAL_HEIGHT;
        this.spaceship = new Spaceship(this.virtualWidth / 2, this.virtualHeight / 2);
        this.asteroids = [];
        this.lasers = [];
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.level = 1;
        this.spawnAsteroids();

        // Event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        this.pressedKeys = new Set();

        // Initial canvas resize
        this.handleResize();
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    spawnAsteroids() {
        for (let i = 0; i < this.level + 3; i++) {
            let x, y, distance;
            do {
                x = Math.random() * this.virtualWidth;
                y = Math.random() * this.virtualHeight;
                distance = Math.sqrt(
                    (x - this.spaceship.position.x) ** 2 + 
                    (y - this.spaceship.position.y) ** 2
                );
            } while (distance < 100); // Ensure asteroids spawn away from spaceship
            this.asteroids.push(new Asteroid(x, y, 'large'));
        }
    }

    start() {
        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameOver) {
            this.update();
            this.render();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    update() {
        // Handle input
        if (this.pressedKeys.has('ArrowLeft')) this.spaceship.rotateLeft();
        if (this.pressedKeys.has('ArrowRight')) this.spaceship.rotateRight();
        if (this.pressedKeys.has('ArrowUp')) this.spaceship.thrust();
        if (this.pressedKeys.has('Space')) {
            const laser = this.spaceship.shoot();
            if (laser) this.lasers.push(laser);
        }

        // Update objects
        this.spaceship.update();
        this.asteroids.forEach(a => a.update());
        this.lasers.forEach(l => l.update());

        // Wrap objects around virtual screen
        this.wrapObject(this.spaceship);
        this.asteroids.forEach(a => this.wrapObject(a));

        // Collision detection
        if (this.asteroids.some(a => this.spaceship.collidesWith(a))) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver = true;
            } else {
                this.spaceship.position = new Vector(this.virtualWidth / 2, this.virtualHeight / 2);
                this.spaceship.velocity = new Vector(0, 0);
                this.spaceship.angle = 0;
            }
        }

        this.lasers.forEach(laser => {
            this.asteroids.forEach((asteroid, index) => {
                if (laser.collidesWith(asteroid)) {
                    laser.hasHit = true;
                    const newAsteroids = asteroid.split();
                    this.asteroids.splice(index, 1);
                    this.asteroids.push(...newAsteroids);
                    this.score += asteroid.size === 'small' ? 100 : asteroid.size === 'medium' ? 50 : 20;
                }
            });
        });

        this.lasers = this.lasers.filter(laser => !laser.hasHit);

        // Level progression
        if (this.asteroids.length === 0) {
            this.level++;
            this.spawnAsteroids();
        }
    }

    wrapObject(obj) {
        if (obj.position.x < 0) obj.position.x += this.virtualWidth;
        if (obj.position.x > this.virtualWidth) obj.position.x -= this.virtualWidth;
        if (obj.position.y < 0) obj.position.y += this.virtualHeight;
        if (obj.position.y > this.virtualHeight) obj.position.y -= this.virtualHeight;
    }

    render() {
        // Clear the canvas
        this.context.clearRect(0, 0, this.width, this.height);

        // Scale the context for game objects
        this.context.save();
        this.context.scale(this.width / this.virtualWidth, this.height / this.virtualHeight);
        this.spaceship.draw(this.context);
        this.asteroids.forEach(a => a.draw(this.context));
        this.lasers.forEach(l => l.draw(this.context));
        this.context.restore();

        // Draw UI in actual pixels
        this.context.fillStyle = 'white';
        this.context.font = '20px Arial';
        this.context.fillText(`Score: ${this.score}`, 10, 30);
        this.context.fillText(`Lives: ${this.lives}`, this.width - 100, 30);
        if (this.gameOver) {
            this.context.fillText("Game Over", this.width / 2 - 50, this.height / 2);
            this.context.fillText(`Final Score: ${this.score}`, this.width / 2 - 50, this.height / 2 + 30);
        }
    }

    handleKeyDown(event) {
        this.pressedKeys.add(event.code);
    }

    handleKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }
}

// Initialize and start the game
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.start();

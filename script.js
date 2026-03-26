const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- VERDENSINNSTILLINGER ---
const WORLD_SIZE = 3000;
let camera = { x: 0, y: 0 };
let difficulty = 1.0;

let player, enemies, projectiles, particles, obstacles;
let score = 0, wave = 1, gameActive = false;
const keys = {};

// --- INITIALISERING ---
function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player = new Player(WORLD_SIZE / 2, WORLD_SIZE / 2);
    enemies = [];
    projectiles = [];
    particles = [];
    score = 0;
    wave = 1;
    generateEnvironment();
}

function generateEnvironment() {
    obstacles = [];
    for (let i = 0; i < 25; i++) {
        obstacles.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            w: Math.random() * 150 + 50,
            h: Math.random() * 150 + 50,
            color: Math.random() > 0.5 ? '#00ffff11' : '#ff00ff11'
        });
    }
}

// --- MENY-KONTROLL ---
function startGame(diff) {
    difficulty = diff;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('ui').classList.remove('hidden');
    gameActive = true;
    init();
    spawnWave();
    animate();
}

function resetGame() {
    document.getElementById('death-screen').classList.add('hidden');
    init();
    gameActive = true;
    animate();
}

function gameOver() {
    gameActive = false;
    document.getElementById('death-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = "SCORE: " + String(score).padStart(6, '0');
}

// --- SPILLER KLASSE ---
class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.angle = 0;
        this.size = 25;
    }

    update() {
        if (keys['KeyW']) this.vy -= 1.2;
        if (keys['KeyS']) this.vy += 1.2;
        if (keys['KeyA']) this.vx -= 1.2;
        if (keys['KeyD']) this.vx += 1.2;

        this.vx *= 0.94; this.vy *= 0.94;
        this.x += this.vx; this.y += this.vy;

        // Hold spillere innenfor verdenen
        this.x = Math.max(0, Math.min(WORLD_SIZE, this.x));
        this.y = Math.max(0, Math.min(WORLD_SIZE, this.y));
    }

    draw() {
        ctx.save();
        // Oversett fra verden til skjerm
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);
        
        // Enkel robot-tegning
        ctx.fillStyle = "#00ffff";
        ctx.shadowBlur = 15; ctx.shadowColor = "#00ffff";
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(-15, 15); ctx.lineTo(-15, -15);
        ctx.fill();
        ctx.restore();
    }
}

// --- HOVED-LØKKE ---
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Oppdater kamera (sentrer på spiller)
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // Tegn bakgrunn
    ctx.fillStyle = "#020205";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tegn "World Grid" (beveger seg med kamera)
    ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
    const gridSize = 100;
    const startX = -camera.x % gridSize;
    const startY = -camera.y % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Tegne hindringer og spill-objekter
    obstacles.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.fillRect(o.x - camera.x, o.y - camera.y, o.w, o.h);
    });

    player.update();
    player.draw();

    // Sjekk kollisjon med fiender (forenklet eksempel)
    enemies.forEach((e, i) => {
        e.update(player);
        e.draw();
        let dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < 40) gameOver();
    });
}

// --- INPUTS ---
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousemove', (e) => {
    player.angle = Math.atan2(e.clientY - (player.y - camera.y), e.clientX - (player.x - camera.x));
});

// For iPad skyting
window.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    // Her kan du legge til skyte-logikken din
});

// --- ENEMY KLASSE (Forenklet for demo) ---
class Enemy {
    constructor(x, y, s) { this.x = x; this.y = y; this.s = s; this.radius = 25; }
    update(p) {
        let ang = Math.atan2(p.y - this.y, p.x - this.x);
        this.x += Math.cos(ang) * this.s;
        this.y += Math.sin(ang) * this.s;
    }
    draw() {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI*2);
        ctx.fill();
    }
}

function spawnWave() {
    if (!gameActive) return;
    for (let i = 0; i < 5 * wave; i++) {
        let x = Math.random() * WORLD_SIZE;
        let y = Math.random() * WORLD_SIZE;
        // Ikke spawn oppå spilleren
        if (Math.hypot(x - player.x, y - player.y) > 400) {
            enemies.push(new Enemy(x, y, 2 * difficulty));
        }
    }
}

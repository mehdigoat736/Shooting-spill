// --- SCRIPT.JS: Cyber-Grid Overhaul med Bølgesystem og Pulse Nova ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const waveElement = document.getElementById('wave');
const ultimateElement = document.getElementById('ultimate-status');

// Fullskjerm håndtering
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateArena(); // Regenererer hindringer ved resize
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


// --- KONFIGURASJON ---
const PLAYER_CONFIG = { size: 23, accel: 1.3, friction: 0.93, maxSpeed: 9 };
const BULT_CONFIG = { size: 4, speed: 20, damage: 1 };
const ULTIMATE_CONFIG = { cooldown: 15, radius: 250 }; // 15 sekunder

// --- SPILLSTATE ---
let gameState = {
    score: 0,
    wave: 1,
    enemiesInWave: 0,
    enemiesSpawned: 0,
    active: true,
    isWavePaused: false,
    ultimateReady: true,
    lastTouchStart: 0 // For dobbelttap-deteksjon på iPad
};

let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let isPointerActive = false;
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };

// Objekt Arrays
let particles = [];
let projectiles = [];
let enemies = [];
let gridObstacles = [];


// --- PROSEDURAL ARENA GENERERING ---
function generateArena() {
    gridObstacles = [];
    const numObstacles = 10;
    for (let i = 0; i < numObstacles; i++) {
        gridObstacles.push({
            x: Math.random() * (canvas.width - 250) + 125,
            y: Math.random() * (canvas.height - 250) + 125,
            width: Math.random() * 110 + 60,
            height: Math.random() * 110 + 60,
            color: Math.random() < 0.2 ? '#ff00ff' : '#00ffff' 
        });
    }
}
generateArena();


// --- PARTIKKEL SYSTEM (Strukturert) ---
class Particle {
    constructor(x, y, color, speedX, speedY, size, life, type = 'splinter') {
        this.x = x; this.y = y;
        this.color = color;
        this.speedX = speedX; this.speedY = speedY;
        this.size = size;
        this.maxLife = life; this.life = life;
        this.type = type; // 'splinter' er rask, 'smoke' er treg
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife); 
        ctx.fillStyle = this.color;
        
        if (this.type === 'splinter') {
            ctx.shadowBlur = 12; ctx.shadowColor = this.color;
        } else if (this.type === 'pulse') {
            ctx.shadowBlur = 30; ctx.shadowColor = '#ffffff';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.speedX; this.y += this.speedY;
        this.life--;
        // Fysikk basert på type
        if(this.type === 'splinter') {
            this.speedX *= 0.98; this.speedY *= 0.98;
            if(this.size > 0.1) this.size -= 0.05;
        } else if (this.type === 'smoke') {
            this.speedX *= 0.95; this.speedY *= 0.95; // Bremser raskere
            this.size += 0.03; // Røyk ekspanderer
        } else if (this.type === 'pulse') {
            this.speedX *= 0.99; this.speedY *= 0.99;
            if(this.size > 1) this.size -= 0.3; // Ring krymper
        }
    }
}

// Hjelpefunksjon for structured explosion
function createExplosion(x, y, color, count = 20) {
    // 1. Splinter partikler (Raske, krymper)
    for(let i=0; i < count*0.7; i++) {
        const speed = Math.random() * 12 + 4;
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(x, y, color, Math.cos(angle)*speed, Math.sin(angle)*speed, Math.random()*3 + 1, 35, 'splinter'));
    }
    // 2. Røyk partikler (Trege, ekspanderer)
    for(let i=0; i < count*0.3; i++) {
        const speed = Math.random() * 2 + 0.5;
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(x, y, '#222', Math.cos(angle)*speed, Math.sin(angle)*speed, Math.random()*2 + 1, 50, 'smoke'));
    }
}


// --- ULTIMATE: PULSE NOVA ---
function triggerUltimate() {
    if (!gameState.ultimateReady || !gameState.active) return;
    
    gameState.ultimateReady = false;
    ultimateElement.classList.add('ultimate-charging');
    ultimateElement.classList.remove('ultimate-ready');
    ultimateElement.innerHTML = `ULTIMATE: CHARGING...`;

    // 1. Visuell Puls Ring (Masse partikler)
    for(let i=0; i<150; i++) {
        const angle = (i / 150) * Math.PI * 2;
        const speed = 15;
        particles.push(new Particle(
            player.x, player.y, '#ffffff',
            Math.cos(angle) * speed, Math.sin(angle) * speed,
            12, 40, 'pulse'
        ));
    }

    // 2. Ødelegg alle fiender i radius
    enemies.forEach((enemy, index) => {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist - enemy.radius < ULTIMATE_CONFIG.radius) {
            setTimeout(() => enemies.splice(index, 1), 0);
            gameState.enemiesInWave--;
            
            gameState.score += 500;
            scoreElement.innerHTML = String(gameState.score).padStart(6, '0');
            
            // "Ouch" effekt for de som poppes av pulsen
            for(let i=0; i<8; i++) {
                particles.push(new Particle(enemy.x, enemy.y, '#ffffff', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 2, 15, 'splinter'));
            }
        }
    });

    // 3. Start Cooldown
    let remaining = ULTIMATE_CONFIG.cooldown;
    const cooldownInterval = setInterval(() => {
        if(!gameState.active) { clearInterval(cooldownInterval); return; }
        remaining--;
        ultimateElement.innerHTML = `ULTIMATE: CHARGING (${remaining}s)`;
        
        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            gameState.ultimateReady = true;
            ultimateElement.classList.add('ultimate-ready');
            ultimateElement.classList.remove('ultimate-charging');
            ultimateElement.innerHTML = `ULTIMATE: READY (E)`;
        }
    }, 1000);
}


// --- BØLGE SYSTEM LOGIKK ---

// Starter en ny bølge
function startNextWave() {
    gameState.isWavePaused = true;
    gameState.enemiesInWave = Math.floor(5 + (gameState.wave * 2.5)); // Flere fiender per bølge
    gameState.enemiesSpawned = 0;
    
    // Vis "Bølge X Starter" UI? (Her kutter vi det for enkelhet, bare oppdaterer teller)
    waveElement.innerHTML = gameState.wave;
    waveElement.parentNode.classList.add('new-wave-flash'); // Enkel blink effekt i CSS (må legges til)
    setTimeout(() => waveElement.parentNode.classList.remove('new-wave-flash'), 1000);

    // 3 sekunders pause før fiender kommer
    setTimeout(() => {
        gameState.isWavePaused = false;
    }, 3000);
}

// Spawner en bølge
function spawnWaveEnemies() {
    if(!gameState.active || gameState.isWavePaused || gameState.enemiesSpawned >= gameState.enemiesInWave) return;
    
    gameState.enemiesSpawned++;

    const radius = 30; 
    let enemyX, enemyY;
    if (Math.random() < 0.5) {
        enemyX = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        enemyY = Math.random() * canvas.height;
    } else {
        enemyX = Math.random() * canvas.width;
        enemyY = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    // Øker helse og fart over bølgene
    const health = 2 + Math.floor(gameState.wave / 3); // UFOer tåler mer etter bølge 3
    const speed = Math.random() * (2.0 + (gameState.wave / 5)) + 1.2;
    enemies.push(new Enemy(enemyX, enemyY, radius, speed, health));
    
    // Spawner raskere for hver fiende som dør i bølgen (pacing)
    let spawnDelay = Math.max(300, 1500 - (gameState.wave * 100));
    setTimeout(spawnWaveEnemies, spawnDelay);
}


// --- INPUT HÅNDTERING (Oppgradert) ---

// Tastatur (WASD og Ultimate 'E')
window.addEventListener('keydown', (e) => { 
    if (e.code in keys) keys[e.code] = true; 
    if (e.code === 'KeyE') triggerUltimate();
});
window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

// Mus/Touch posisjon
function updatePointerPos(x, y) { mousePos.x = x; mousePos.y = y; isPointerActive = true; }
window.addEventListener('mousemove', (e) => updatePointerPos(e.clientX, e.clientY));

// Touch for iPad (Move)
window.addEventListener('touchmove', (e) => {
    e.preventDefault(); const touch = e.touches[0];
    updatePointerPos(touch.clientX, touch.clientY);
}, { passive: false });


// SKYTING OG ULTIMATE (Touch/Klikk Robust)

function handleInputTrigger(x, y) {
    updatePointerPos(x, y);
    
    // 1. Regner vinkel
    const angle = Math.atan2(y - player.y, x - player.x);
    const speed = BULT_CONFIG.speed; 
    const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    const spawnX = player.x + Math.cos(angle) * player.size * 1.2;
    const spawnY = player.y + Math.sin(angle) * player.size * 1.2;

    // 2. Skyter kulen
    projectiles.push(new Projectile(spawnX, spawnY, BULT_CONFIG.size, velocity));
    
    // Muzzle flash partikler (Hvit/Cyan)
    for(let i=0; i<3; i++) {
        particles.push(new Particle(
            spawnX, spawnY, '#ffffff', 
            (Math.random()-0.5)*5 + velocity.x*0.1, 
            (Math.random()-0.5)*5 + velocity.y*0.1, 
            2, 10, 'splinter'
        ));
    }
}

// Musklikk (PC)
canvas.addEventListener('mousedown', (e) => handleInputTrigger(e.clientX, e.clientY));

// Touch-tap (iPad) med Dobbelttap-deteksjon
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Hindrer double events
    const touch = e.touches[0];
    const now = Date.now();
    
    // Sjekker for dobbelttap (tap innenfor 300ms)
    if (now - gameState.lastTouchStart < 300) {
        triggerUltimate();
    } else {
        handleInputTrigger(touch.clientX, touch.clientY);
    }
    
    gameState.lastTouchStart = now;
}, { passive: false });


// --- KLASSER (Oppgradert) ---

class Player {
    constructor(x, y, size) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.config = PLAYER_CONFIG;
        this.size = size;
        this.angle = 0;
        this.targetAngle = 0; // For wobble
        this.wobble = 0; // Banking animasjon
    }

    draw() {
        // Wobble animasjon (banking)
        this.targetAngle = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);
        // Regner vinkelforskjell
        const angleDiff = Math.atan2(Math.sin(this.targetAngle - this.angle), Math.cos(this.targetAngle - this.angle));
        
        // Jo større sving, jo mer wobble
        this.angle += angleDiff * 0.2; // Smooth rotation
        this.wobble = angleDiff * 10; // Wobble intensitet
        this.wobble = Math.max(-15, Math.min(15, this.wobble)); // Maks wobble

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Neon Glød
        ctx.shadowBlur = 25; ctx.shadowColor = '#00ffff';

        // Avansert Prosedural Robot-form (Wobble Lagt Til)
        // 1. Metall-kropp (Justert for Wobble)
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Spissere front, vugger litt
        ctx.moveTo(this.size * 1.0, 0);
        ctx.lineTo(-this.size * 0.7, this.size * 0.8 + this.wobble*0.2); // Wobble på vinger
        ctx.lineTo(-this.size * 0.5, this.wobble*0.1); // Wobble på midtkropp
        ctx.lineTo(-this.size * 0.7, -this.size * 0.8 - this.wobble*0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Glødende Reaktor
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-this.size*0.2, 0, this.size*0.3, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    update() {
        // Swift Bevegelse
        if (keys.KeyW) this.vy -= this.config.accel;
        if (keys.KeyS) this.vy += this.config.accel;
        if (keys.KeyA) this.vx -= this.config.accel;
        if (keys.KeyD) this.vx += this.config.accel;

        this.vx *= this.config.friction;
        this.vy *= this.config.friction;

        // Max Speed
        this.vx = Math.max(-this.config.maxSpeed, Math.min(this.config.maxSpeed, this.vx));
        this.vy = Math.max(-this.config.maxSpeed, Math.min(this.config.maxSpeed, this.vy));

        this.x += this.vx; this.y += this.vy;

        // Cool Trail (Cyan partikler)
        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            const backAngle = this.angle + Math.PI;
            const trailX = this.x + Math.cos(backAngle) * this.size * 0.8;
            const trailY = this.y + Math.sin(backAngle) * this.size * 0.8;
            particles.push(new Particle(
                trailX, trailY, '#00ffff', 
                -this.vx * 0.15 + (Math.random()-0.5)*1.5, 
                -this.vy * 0.15 + (Math.random()-0.5)*1.5, 
                Math.random()*2 + 0.8, 
                30, 'smoke' // Bruker 'smoke' for trail
            ));
        }

        // Kanter
        if (this.x < this.size) { this.x = this.size; this.vx *= -0.3; }
        if (this.x > canvas.width - this.size) { this.x = canvas.width - this.size; this.vx *= -0.3; }
        if (this.y < this.size) { this.y = this.size; this.vy *= -0.3; }
        if (this.y > canvas.height - this.size) { this.y = canvas.height - this.size; this.vy *= -0.3; }

        this.draw();
    }
}

class Projectile {
    constructor(x, y, radius, velocity) {
        this.x = x; this.y = y;
        this.radius = radius;
        this.velocity = velocity;
        this.angle = Math.atan2(velocity.y, velocity.x);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff3333';
        ctx.fillStyle = 'white'; 
        ctx.beginPath();
        // Slank laserstråle
        ctx.moveTo(this.radius * 7, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    update() { this.draw(); this.x += this.velocity.x; this.y += this.velocity.y; }
}

class Enemy {
    constructor(x, y, radius, speed, health) {
        this.x = x; this.y = y;
        this.radius = radius; this.speed = speed;
        this.health = health; this.maxHealth = health;
        this.pulse = 0; 
        this.hitTimer = 0; // For hit flash animasjon
    }
    draw() {
        this.pulse += 0.1;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Neon Grønn glød
        ctx.shadowBlur = 20; ctx.shadowColor = '#00ff00';

        // Hit Flash Animasjon
        if (this.hitTimer > 0) {
            this.hitTimer--;
            // Blinker Magenta/Hvit når truffet
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 30;
            ctx.fillStyle = `rgba(255, ${255 * (this.hitTimer / 8)}, 255, ${this.hitTimer / 8})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius + 5, this.radius * 0.7 + 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Avansert UFO-form
        // 1. Metall-disk (Grå)
        ctx.fillStyle = '#333'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 2. Grønn Dome (Topp)
        // Farge basert på helse (Grønn -> Gul -> Rød)
        const hpPerc = this.health / this.maxHealth;
        ctx.fillStyle = `rgb(${255 * (1-hpPerc)}, ${255 * hpPerc}, 0)`;
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.1, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Blinkende lys
        const numLights = 6;
        const pulseInt = Math.abs(Math.sin(this.pulse)); 
        for (let i = 0; i < numLights; i++) {
            const lAngle = (i / numLights) * Math.PI * 2;
            const lx = Math.cos(lAngle) * this.radius * 0.8;
            const ly = Math.sin(lAngle) * this.radius * 0.35;
            ctx.fillStyle = `rgba(255, ${150 + 105*hpPerc}, 0, ${0.4 + pulseInt * 0.5})`;
            ctx.beginPath();
            ctx.arc(lx, ly, this.radius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    update() {
        this.draw();
        // Enkel AI, jakter spilleren
        const ang = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(ang) * this.speed;
        this.y += Math.sin(ang) * this.speed;
    }
}


// --- HOVED-LOOPEN (ANIME) ---

let player = new Player(canvas.width / 2, canvas.height / 2, PLAYER_CONFIG.size);

function animate() {
    if(!gameState.active) return;
    requestAnimationFrame(animate);
    
    // Tegner Cyber-Grid
    ctx.fillStyle = '#030307';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.06)'; ctx.lineWidth = 1;
    const gs = 80;
    for (let x = 0; x < canvas.width; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    // 2. Hindringer
    gridObstacles.forEach(obs => {
        ctx.save();
        ctx.fillStyle = '#050505'; ctx.strokeStyle = obs.color; ctx.lineWidth = 3;
        ctx.shadowBlur = 25; ctx.shadowColor = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.restore();
    });
    
    // 3. Partikler
    particles.forEach((p, index) => {
        p.update(); p.draw();
        if (p.life <= 0) setTimeout(() => particles.splice(index, 1), 0);
    });
    
    // 4. Spilleren
    player.update();

    // 5. Kuler
    projectiles.forEach((p, index) => {
        p.update();
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            setTimeout(() => projectiles.splice(index, 1), 0);
        }
        
        gridObstacles.forEach(obs => {
            if (p.x > obs.x && p.x < obs.x + obs.width && p.y > obs.y && p.y < obs.y + obs.height) {
                setTimeout(() => projectiles.splice(index, 1), 0);
                for(let i=0; i<3; i++) particles.push(new Particle(p.x, p.y, obs.color, (Math.random()-0.5)*4, (Math.random()-0.5)*4, 2, 10, 'splinter'));
            }
        });
    });

    // 6. Fiender
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();

        // Game Over
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distPlayer - enemy.radius - player.size < 1) {
                gameState.active = false;
                cancelAnimationFrame(animate);
                let fs = String(gameState.score).padStart(6, '0');
                alert(`SYSTEM FAILURE!\nBølge: ${gameState.wave} • Score: ${fs}`);
                location.reload(); // Restarter
        }

        // Kule treffer fiende
        projectiles.forEach((projectile, projectileIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (dist - enemy.radius - projectile.radius < 1) {
                setTimeout(() => {
                    projectiles.splice(projectileIndex, 1);
                    
                    // Skade-logikk
                    enemy.health--;
                    enemy.hitTimer = 8; // Start hit flash
                    
                    if (enemy.health <= 0) {
                        enemies.splice(enemyIndex, 1);
                        gameState.score += 500; // Poeng
                        scoreElement.innerHTML = String(gameState.score).padStart(6, '0');
                        
                        // Structured Eksplosjon V2
                        createExplosion(enemy.x, enemy.y, '#00ff00', 25);
                        
                        gameState.enemiesInWave--;
                        
                        // Sjekker om bølgen er ferdig
                        if(gameState.enemiesSpawned >= gameState.enemiesInWave && gameState.enemiesInWave <= 0) {
                            gameState.wave++;
                            startNextWave();
                        }

                    } else {
                        // Bare skade (Røde splinter)
                        for(let i=0; i<4; i++) particles.push(new Particle(enemy.x, enemy.y, '#ff3333', (Math.random()-0.5)*6, (Math.random()-0.5)*6, 2, 15, 'splinter'));
                    }
                }, 0);
            }
        });
        
        // UFO Kollisjon Avoidance
        gridObstacles.forEach(obs => {
            if (enemy.x > obs.x - enemy.radius && enemy.x < obs.x + obs.width + enemy.radius &&
                enemy.y > obs.y - enemy.radius && enemy.y < obs.y + obs.height + enemy.radius) {
                const dx = enemy.x - (obs.x + obs.width/2);
                const dy = enemy.y - (obs.y + obs.height/2);
                enemy.x += dx * 0.03; enemy.y += dy * 0.03;
            }
        });
    
    });
}

// START ALT
animate();
startNextWave(); // Starter bølge 1
spawnWaveEnemies(); // Starter spawningen

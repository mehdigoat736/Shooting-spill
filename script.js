// --- SCRIPT.JS: Kjernen i Cyber-Grid Annihilator ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Fullskjerm håndtering
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


// --- SPILLVARIABLER ---
let score = 0;
let mouseX = canvas.width / 2; // Startposisjon for mus
let mouseY = canvas.height / 2;
let isMovingMouse = false; // Sjekker om mus/touch faktisk flyttes

// Input-tilstander
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };

// Partikkel/Objekt arrays
let particles = [];
let projectiles = [];
let enemies = [];
let gridObstacles = [];


// --- PROSEDURAL ARENA GENERERING ---
// Lager glødende neon-hindringer
function generateArena() {
    gridObstacles = [];
    const numObstacles = 10;
    for (let i = 0; i < numObstacles; i++) {
        gridObstacles.push({
            x: Math.random() * (canvas.width - 200) + 100,
            y: Math.random() * (canvas.height - 200) + 100,
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            color: Math.random() < 0.2 ? '#ff00ff' : '#00ffff' // Cyan eller Magenta
        });
    }
}
generateArena();


// --- PARTIKKEL SYSTEM (for Trail og Eksplosjoner) ---
class Particle {
    constructor(x, y, color, speedX, speedY, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.size = size;
        this.maxLife = life;
        this.life = life;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife; // Fader ut over tid
        ctx.fillStyle = this.color;
        
        // Neon glød
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        // Bremser partikkelen litt
        this.speedX *= 0.98;
        this.speedY *= 0.98;
        // Krymper partikkelen
        if(this.size > 0.1) this.size -= 0.05;
    }
}


// --- INPUT HÅNDTERING (Tastatur, Mus og Touch) ---

// Tastatur (for WASD)
window.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

// Mus/Touch posisjon (for Sikting)
function updatePointerPos(x, y) {
    mouseX = x;
    mouseY = y;
    isMovingMouse = true;
}

window.addEventListener('mousemove', (e) => updatePointerPos(e.clientX, e.clientY));
// Touch-move for iPad
window.addEventListener('touchmove', (e) => {
    // Forhindrer scrolling
    e.preventDefault(); 
    const touch = e.touches[0];
    updatePointerPos(touch.clientX, touch.clientY);
}, { passive: false });


// SKYTING (Fikset for både Mus og Touch)
function handleShooting(x, y) {
    updatePointerPos(x, y); // Sikrer at vi skyter dit vi tapper
    
    // Regner ut vinkelen fra spiller til tappe-punkt
    const angle = Math.atan2(y - player.y, x - player.x);
    const speed = 20; // Raskere kuler
    const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    
    // Spawner kulen foran roboten
    const spawnX = player.x + Math.cos(angle) * player.size * 1.2;
    const spawnY = player.y + Math.sin(angle) * player.size * 1.2;

    projectiles.push(new Projectile(spawnX, spawnY, 4, velocity));
    
    // Liten "muzzle flash" effekt (partikler)
    for(let i=0; i<3; i++) {
        particles.push(new Particle(
            spawnX, spawnY, '#ffffff', 
            (Math.random()-0.5)*5 + velocity.x*0.2, 
            (Math.random()-0.5)*5 + velocity.y*0.2, 
            2, 10
        ));
    }
}

// Musklikk (PC)
canvas.addEventListener('mousedown', (e) => handleShooting(e.clientX, e.clientY));

// Touch-tap (iPad) - Fikset
canvas.addEventListener('touchstart', (e) => {
    // Forhindrer 'mousedown' i å trigge etterpå (double events)
    e.preventDefault(); 
    const touch = e.touches[0];
    handleShooting(touch.clientX, touch.clientY);
}, { passive: false });


// --- KLASSER (Oppgradert) ---

class Player {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.vx = 0; // Velocity X
        this.vy = 0; // Velocity Y
        this.accel = 1.2; // Hvor raskt den akselererer
        this.friction = 0.94; // Hvor mye den "glir" (friksjon)
        this.maxSpeed = 10;
        this.size = size;
        this.angle = 0;
    }

    draw() {
        // Roterer kun hvis musa flyttes
        if(isMovingMouse) {
            this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Neon Glød på spilleren
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';

        // Avansert Prosedural Robot-form
        // 1. Metall-kropp
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Spissere front
        ctx.moveTo(this.size * 1.0, 0);
        ctx.lineTo(-this.size * 0.7, this.size * 0.8);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size * 0.7, -this.size * 0.8);
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
        // Swift Bevegelse (Akselerasjon basert på WASD)
        if (keys.KeyW) this.vy -= this.accel;
        if (keys.KeyS) this.vy += this.accel;
        if (keys.KeyA) this.vx -= this.accel;
        if (keys.KeyD) this.vx += this.accel;

        // Bruker friksjon (Viktig for "smooth" feel)
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Hastighetsbegrensning (Max Speed)
        this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
        this.vy = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vy));

        // Oppdaterer posisjon
        this.x += this.vx;
        this.y += this.vy;

        // Cool Trail (Spawner partikler bak skipet)
        if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
            // Regner ut posisjonen bak roboten
            const backAngle = this.angle + Math.PI;
            const trailX = this.x + Math.cos(backAngle) * this.size * 0.8;
            const trailY = this.y + Math.sin(backAngle) * this.size * 0.8;
            
            // Fargen pulserer dyp cyan
            const trailColor = `hsl(180, 100%, ${50 + Math.random()*20}%)`;
            particles.push(new Particle(
                trailX, trailY, trailColor, 
                -this.vx * 0.2 + (Math.random()-0.5)*2, 
                -this.vy * 0.2 + (Math.random()-0.5)*2, 
                Math.random()*3 + 1, 
                25
            ));
        }

        // Kollisjon med arenakanter
        if (this.x < this.size) { this.x = this.size; this.vx *= -0.5; }
        if (this.x > canvas.width - this.size) { this.x = canvas.width - this.size; this.vx *= -0.5; }
        if (this.y < this.size) { this.y = this.size; this.vy *= -0.5; }
        if (this.y > canvas.height - this.size) { this.y = canvas.height - this.size; this.vy *= -0.5; }

        this.draw();
    }
}

class Projectile {
    constructor(x, y, radius, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocity = velocity;
        this.angle = Math.atan2(velocity.y, velocity.x);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Sterk neon-rød laser glød
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff3333';
        
        ctx.fillStyle = 'white'; // Hvit kjerne for intensitet
        ctx.beginPath();
        // Slankere og lengre kule (laserstråle)
        ctx.moveTo(this.radius * 6, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Enemy {
    constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
        this.health = 3; // UFOene tåler nå 3 skudd!
        this.pulse = 0; 
    }
    draw() {
        this.pulse += 0.1;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Neon Grønn glød
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';

        // Avansert UFO-form
        // 1. Metall-disk
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Grønn Dome (Topp)
        // Endrer farge basert på helse
        const healthPercent = this.health / 3;
        ctx.fillStyle = `rgb(${255 * (1-healthPercent)}, ${255 * healthPercent}, 0)`;
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.1, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Blinkende lys (Proseduralt)
        const numLights = 6;
        const pulseInt = Math.abs(Math.sin(this.pulse)); 
        for (let i = 0; i < numLights; i++) {
            const lightAngle = (i / numLights) * Math.PI * 2;
            const lx = Math.cos(lightAngle) * this.radius * 0.8;
            const ly = Math.sin(lightAngle) * this.radius * 0.35;
            ctx.fillStyle = `rgba(255, 100, 0, ${pulseInt * 0.8})`; // Oransje glød
            ctx.beginPath();
            ctx.arc(lx, ly, this.radius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    update() {
        this.draw();
        // Jakter spilleren
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
}


// --- TEGNE CYBER-GRID ARENA ---
function drawArena() {
    // 1. Bakgrunns-grid (for dybdefølelse)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 2. Glødende Hindringer
    gridObstacles.forEach(obs => {
        ctx.save();
        ctx.fillStyle = '#050505'; // Veldig mørk innside
        ctx.strokeStyle = obs.color; // Cyan eller Magenta ramme
        ctx.lineWidth = 3;
        // Kraftig glød
        ctx.shadowBlur = 25;
        ctx.shadowColor = obs.color;
        
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        
        ctx.restore();
    });
}


// --- HOVED-LOOPEN (ANIME) ---

let player = new Player(canvas.width / 2, canvas.height / 2, 25);
let gameActive = true;

function spawnEnemies() {
    if(!gameActive) return;
    const radius = 30; 
    let enemyX, enemyY;
    if (Math.random() < 0.5) {
        enemyX = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        enemyY = Math.random() * canvas.height;
    } else {
        enemyX = Math.random() * canvas.width;
        enemyY = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }
    // Øker farten over tid basert på score
    const speed = Math.random() * 2 + 1.0 + (score/10000);
    enemies.push(new Enemy(enemyX, enemyY, radius, speed));
    
    // Spawner raskere jo høyere score
    let spawnRate = Math.max(200, 1000 - (score/50));
    setTimeout(spawnEnemies, spawnRate);
}

let animationId;
function animate() {
    if(!gameActive) return;
    animationId = requestAnimationFrame(animate);
    
    // Tegner Cyber-Grid Bakgrunn
    ctx.fillStyle = '#030307';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawArena();
    
    // Oppdaterer partikler
    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.life <= 0) setTimeout(() => particles.splice(index, 1), 0);
    });
    
    // Oppdaterer spilleren
    player.update();

    // Håndterer kuler
    projectiles.forEach((p, index) => {
        p.update();
        // Fjerner kuler utenfor
        if (p.x + p.radius * 6 < 0 || p.x - p.radius * 6 > canvas.width || 
            p.y + p.radius * 6 < 0 || p.y - p.radius * 6 > canvas.height) {
            setTimeout(() => projectiles.splice(index, 1), 0);
        }
        
        // Kollisjon med hindringer
        gridObstacles.forEach(obs => {
            if (p.x > obs.x && p.x < obs.x + obs.width &&
                p.y > obs.y && p.y < obs.y + obs.height) {
                    setTimeout(() => projectiles.splice(index, 1), 0);
                    // Liten kollisjon-effekt
                    for(let i=0; i<2; i++) {
                        particles.push(new Particle(p.x, p.y, obs.color, (Math.random()-0.5)*3, (Math.random()-0.5)*3, 2, 10));
                    }
                }
        });
    });

    // Håndterer fiender
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();

        // Game Over Kollisjon (Sirkel mot Sirkel)
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distPlayer - enemy.radius - player.size < 1) {
                gameActive = false;
                cancelAnimationFrame(animationId);
                // Lagre scoren din
                let finalScore = String(score).padStart(6, '0');
                alert(`SYSTEM FAILURE!\nUFO overvant roboten.\nEndelig SCORE: ${finalScore}`);
                location.reload(); // Restarter
        }

        // Kule treffer fiende
        projectiles.forEach((projectile, projectileIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (dist - enemy.radius - projectile.radius < 1) {
                setTimeout(() => {
                    projectiles.splice(projectileIndex, 1);
                    
                    // Fienden tåler skade
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        enemies.splice(enemyIndex, 1);
                        score += 500; // Mer poeng for UFO
                        scoreElement.innerHTML = String(score).padStart(6, '0');
                        
                        // EKTE EKSPLOSJON (Masse partikler)
                        for(let i=0; i<15; i++) {
                            particles.push(new Particle(
                                enemy.x, enemy.y, '#00ff00', // Grønn
                                (Math.random()-0.5)*15, (Math.random()-0.5)*15, 
                                Math.random()*5+2, 40
                            ));
                        }
                    } else {
                        // Bare skade-effekt (Røde partikler)
                        for(let i=0; i<4; i++) {
                            particles.push(new Particle(enemy.x, enemy.y, '#ff3333', (Math.random()-0.5)*5, (Math.random()-0.5)*5, 2, 15));
                        }
                    }
                }, 0);
            }
        });
        
        // UFO Kollisjon med hindringer (Enkel avoidance)
        gridObstacles.forEach(obs => {
            if (enemy.x > obs.x - enemy.radius && enemy.x < obs.x + obs.width + enemy.radius &&
                enemy.y > obs.y - enemy.radius && enemy.y < obs.y + obs.height + enemy.radius) {
                // Skubber UFOen bort fra hindringen
                const dx = enemy.x - (obs.x + obs.width/2);
                const dy = enemy.y - (obs.y + obs.height/2);
                enemy.x += dx * 0.05;
                enemy.y += dy * 0.05;
            }
        });
    
    });
}

// START ALT
animate();
setTimeout(spawnEnemies, 1000);

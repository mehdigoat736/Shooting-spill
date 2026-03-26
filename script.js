// --- JAVASCRIPT: Hjernen bak spillet ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Setter riktig størrelse med en gang
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let score = 0;
let mouseX = 0;
let mouseY = 0;

// --- BAKGRUNN (STJERNER) ---
const stars = [];
for (let i = 0; i < 250; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5,
        opacity: Math.random()
    });
}

function drawBackground() {
    // Svart verdensrom
    ctx.fillStyle = '#010101';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tegner stjerner
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}


// --- INPUT HÅNDTERING (Fikset for iPad/Safari) ---
// Vi bruker 'KeyW', 'KeyA', etc., det er mer stabilt enn bare 'w', 'a'
const keys = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false
};

window.addEventListener('keydown', (e) => {
    // Sjekker om nøkkelen finnes i objektet vårt
    if (e.code in keys) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});


// --- KLASSER (Spill-objekter) ---

class Player {
    constructor(x, y, size, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.angle = 0;
    }

    // Tegner roboten ved hjelp av matematikk (proseduralt)
    draw() {
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 1. Kropp (Mørk grå)
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.size * 0.8, 0);
        ctx.lineTo(this.size * 0.5, this.size * 0.5);
        ctx.lineTo(-this.size * 0.3, this.size * 0.8);
        ctx.lineTo(-this.size * 0.8, this.size * 0.3);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.3);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.8);
        ctx.lineTo(this.size * 0.5, -this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Glødende Kjerne (Cyan)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Skrur av glød

        // 3. Side-kanoner
        ctx.fillStyle = '#666';
        ctx.fillRect(this.size * 0.4, this.size * 0.4, this.size * 0.5, this.size * 0.2);
        ctx.fillRect(this.size * 0.4, -this.size * 0.6, this.size * 0.5, this.size * 0.2);
        
        // 4. Neon-linjer på rustningen
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size * 0.2, this.size * 0.3);
        ctx.lineTo(-this.size * 0.5, this.size * 0.3);
        ctx.moveTo(this.size * 0.2, -this.size * 0.3);
        ctx.lineTo(-this.size * 0.5, -this.size * 0.3);
        ctx.stroke();

        ctx.restore();
    }

    update() {
        // Bruker e.code flaggene for bevegelse
        if (keys.KeyW && this.y > this.size) this.y -= this.speed;
        if (keys.KeyS && this.y < canvas.height - this.size) this.y += this.speed;
        if (keys.KeyA && this.x > this.size) this.x -= this.speed;
        if (keys.KeyD && this.x < canvas.width - this.size) this.x += this.speed;
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

        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff3333';
        
        ctx.fillStyle = 'white'; // Hvit kjerne for intensitet
        ctx.beginPath();
        ctx.moveTo(this.radius * 3, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff3333'; // Ytre flammende rød farge
        ctx.beginPath();
        ctx.moveTo(this.radius * 2.5, 0);
        ctx.lineTo(-this.radius * 1.5, this.radius * 1.5);
        ctx.lineTo(-this.radius * 1.5, -this.radius * 1.5);
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
        this.pulse = 0; 
    }
    draw() {
        this.pulse += 0.1;
        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. UFO-disk
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Bruker ellipse i stedet for sirkel for flattrykt UFO
        ctx.ellipse(0, 0, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Grønn Dome (Topp)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.2, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 3. Pulserende lys rundt kanten
        const numLights = 8;
        const pulseIntensity = Math.abs(Math.sin(this.pulse)); 
        for (let i = 0; i < numLights; i++) {
            const lightAngle = (i / numLights) * Math.PI * 2;
            const lx = Math.cos(lightAngle) * this.radius * 0.8;
            const ly = Math.sin(lightAngle) * this.radius * 0.45;
            
            ctx.fillStyle = `rgba(255, ${Math.floor(255 * pulseIntensity)}, 0, 0.8)`;
            ctx.beginPath();
            ctx.arc(lx, ly, this.radius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    update() {
        this.draw();
        // Enkel AI som jakter spilleren
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
}


// --- SPILL LOOPEN ---
// Oppretter spilleren i midten
let player = new Player(canvas.width / 2, canvas.height / 2, 30, 7);
let projectiles = [];
let enemies = [];

function spawnEnemies() {
    // Spawner en ny UFO hvert sekund
    setInterval(() => {
        const radius = 35; 
        let enemyX, enemyY;
        if (Math.random() < 0.5) {
            enemyX = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            enemyY = Math.random() * canvas.height;
        } else {
            enemyX = Math.random() * canvas.width;
            enemyY = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }
        const speed = Math.random() * (2.8 - 1.0) + 1.0;
        enemies.push(new Enemy(enemyX, enemyY, radius, speed));
    }, 1000); 
}

let animationId;
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Tegner bakgrunnen FØRST
    drawBackground();
    
    // Lager en liten "trail" effekt
    ctx.fillStyle = 'rgba(1, 1, 1, 0.15)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Oppdaterer spilleren (Tegner den FØR enemies)
    player.update();

    // Håndterer kuler
    projectiles.forEach((projectile, index) => {
        projectile.update();
        // Fjerner kuler som går utenfor skjermen
        if (projectile.x + projectile.radius * 3 < 0 || projectile.x - projectile.radius * 3 > canvas.width || 
            projectile.y + projectile.radius * 3 < 0 || projectile.y - projectile.radius * 3 > canvas.height) {
            setTimeout(() => projectiles.splice(index, 1), 0);
        }
    });

    // Håndterer fiender
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();

        // Game Over (Sjekker kollisjon med sirkler)
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distPlayer - enemy.radius - player.size < 1) {
                cancelAnimationFrame(animationId);
                alert("FORSVAR MISLYKTES! Robotens power core er ødelagt.\nDin poengsum: " + score);
                location.reload(); // Restarter automatisk
        }

        // Kule treffer fiende
        projectiles.forEach((projectile, projectileIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (dist - enemy.radius - projectile.radius < 1) {
                setTimeout(() => {
                    enemies.splice(enemyIndex, 1);
                    projectiles.splice(projectileIndex, 1);
                    score += 100;
                    scoreElement.innerHTML = score;
                }, 0);
            }
        });
    });
}

// Skyting
window.addEventListener('mousedown', (event) => {
    // Siden vi bruker prosedural grafikk, spawner vi foran roboten
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    const speed = 15;
    const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    
    const spawnX = player.x + Math.cos(angle) * player.size * 0.9;
    const spawnY = player.y + Math.sin(angle) * player.size * 0.9;

    projectiles.push(new Projectile(spawnX, spawnY, 6, velocity));
});

// START SPILLEREN
animate();
spawnEnemies();

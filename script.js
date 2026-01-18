const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const memeImg = document.getElementById("meme-overlay");

// --- IMPROVED ASSET LOADING START ---
// Images
const pipeImg = new Image(); pipeImg.src = "pipe.png";
const birdImg = new Image(); birdImg.src = "bird.png";
const bgImg = new Image();   bgImg.src = "bg.png";
// Game Sounds
const flapSound = new Audio("flap.mp3");
flapSound.load();
const tripleSound = new Audio("triple.mp3"); // Name your file triple.mp3
tripleSound.load();
const surgeSound = new Audio("surge.mp3"); // Name your file surge.mp3
surgeSound.load();
let surgePlayed = false; // This prevents the sound from looping forever at score 15


// Meme Sounds Pre-loading
const memeFiles = ["meme1.gif","meme2.gif","meme3.gif","meme4.gif","meme5.gif"];
const sounds = memeFiles.map((_, i) => {
    let a = new Audio(`sound${i+1}.mp3`);
    a.load(); // This is the secret to removing the delay!
    return a;
});
const winSound = new Audio("win.mp3");
winSound.load();

// Game Variables
let birdX = 50, birdY = 250, birdV = 0;
let score = 0, frame = 0, bgX = 0, hp = 200; 
let tapCount = 0;
let lastTapTime = 0;
let pipes = [], meteors = [], gameStarted = false, gameOver = false, gameWon = false;
let gamePhase = 1, showScoreboard = false, endTriggered = false, showSkip = false;
let particles = [];
let damageTexts = [];
let boss = { active: false, x: 380, y: 100, targetY: 100, shootTimer: 0 };
let arrows = [];
let potions = [];
let shields = [];
let hasShield = false;
let transitionParticles = [];
let isTransitioning = false;
let transitionZoom = 1;
let flashAlpha = 0; // For the white screen flash
let transitionTimer = 0; 


class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = 50;  // Where the Dino starts
        this.targetY = 425; // The ground
        this.size = Math.random() * 5 + 2;
        this.speed = Math.random() * 0.1 + 0.05; // How fast they "fly"
        this.color = "yellow"; // Match your bird's color
    }
    update() {
        // Move toward the ground target
        this.x += (this.targetX - this.x) * this.speed;
        this.y += (this.targetY - this.y) * this.speed;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}



// Storage
let highScore = localStorage.getItem("highScore") || 0;
let deaths = localStorage.getItem("totalDeaths") || 0;
let shakeTime = 0;

function doTap() {
    if (gameOver || gameWon) {
        // RESET BOSS SYSTEM BEFORE RESTART
        shields = [];
        hasShield = false;
        arrows = [];         // Clears any arrows on screen
        boss.active = false;  // Disables the boss entity
        boss.x = 400;  // Moves him back to the right-side starting position
        potions = [];
        if (showScoreboard) location.reload(); 
        else if (showSkip) showScoreboard = true;
        return;
    }

    let currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
        tapCount++;
    } else {
        tapCount = 1;
    }
    lastTapTime = currentTime;

    // 1. CHOOSE COLOR
    let effectColor = "";
    if (tapCount === 2) {
        effectColor = "rgba(144, 238, 144, 0.7)"; // Gas
    } else if (tapCount === 4) {
        effectColor = "rgba(255, 69, 0, 0.9)";   // Fire
    }

    // 2. SPAWN PARTICLES (Add the 'size' property here!)
    if (effectColor !== "") {
        for(let i=0; i<10; i++) {
            particles.push({
                x: birdX - 5, 
                y: birdY, 
                xv: -Math.random() * 5 - 1,
                yv: (Math.random() - 0.5) * 3, 
                life: 1.0,
                color: effectColor,
                size: (tapCount === 4 ? 12 : 6) // Fire particles are bigger
            });
        }
    }

    // 3. SOUNDS & RESETS
    if (tapCount === 3) {
        tripleSound.currentTime = 0;
        tripleSound.play().catch(e => {});
        shakeTime = 10;
        // DON'T reset tapCount to 0 here, let it reach 4!
    } else if (tapCount === 4) {
        tapCount = 0; // Reset ONLY after the 4th tap
    }

    // --- REST OF YOUR GAME LOGIC ---
    if (!gameStarted) { 
        gameStarted = true; 
        let t = Math.random() * 200 + 50;
        pipes.push({x: 400, top: t, bot: t + 180, type: 'f', passed: false});
        return; 
    }
    
    flapSound.currentTime = 0; 
    flapSound.play().catch(()=>{});
    
    if (gamePhase === 1) {
        // Boost jump power from -5.2 to -6.2 when the heavy gravity (score 15) kicks in
        birdV = (score >= 15) ? -6.2 : -5.2;
    } else {
        if (birdY >= 420) birdV = -10.0;
    }
}

window.addEventListener("touchstart", (e) => { e.preventDefault(); doTap(); }, {passive: false});
window.addEventListener("mousedown", doTap);

function spawnShieldBreak() {
    for(let i=0; i<15; i++) {
        particles.push({
            x: birdX, 
            y: birdY, 
            xv: (Math.random() - 0.5) * 8, // Burst in all directions
            yv: (Math.random() - 0.5) * 8, 
            life: 1.0,
            color: "#3498db", // Shield Blue
            size: 4 + Math.random() * 4
        });
    }
}

function loop() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen Shake Effect
    if (shakeTime > 0) {
        let intensity = 7; // Increase this number for crazier shaking
        ctx.translate(Math.random() * intensity - intensity/2, Math.random() * intensity - intensity/2);
        shakeTime--;
    }

    // Phase 1 Visual Surge
    if (gamePhase === 1 && score >= 15) {
        canvas.style.filter = "invert(1) hue-rotate(180deg)";
        if (!surgePlayed) {
            surgeSound.currentTime = 0;
            surgeSound.play().catch(e => console.log("Surge sound blocked:", e));
            surgePlayed = true; 
            shakeTime = 20; // This makes the effect feel powerful
        }
    } else {
        canvas.style.filter = "invert(0)";
    }

    // Background Scroll
    if (bgImg.complete && bgImg.width > 0) {
        if (gameStarted && !gameOver && !gameWon) bgX -= (gamePhase === 1 ? 1 : 2.5);
        if (bgX <= -360) bgX = 0;
        ctx.drawImage(bgImg, bgX, 0, 360, 500);
        ctx.drawImage(bgImg, bgX + 360, 0, 360, 500);
    }
            if (isTransitioning) {
        transitionTimer++; // Count frames

        // 1. Force background to draw and scroll
        bgX -= 2;
        if (bgX <= -360) bgX = 0;
        ctx.drawImage(bgImg, bgX, 0, 360, 500);
        ctx.drawImage(bgImg, bgX + 360, 0, 360, 500);

        // 2. Draw Particles
        transitionParticles.forEach(p => {
            p.update();
            p.draw();
        });

        // 3. THE UNFREEZER: Landing Logic
        let finished = false;
        
        // If particles reach the ground
        if (transitionParticles.length > 0) {
            let p = transitionParticles[0];
            if (p.y > 410) finished = true; 
        }

        // FAIL-SAFE: If it takes longer than 1.5 seconds, just start the game!
        if (transitionTimer > 100) finished = true;

        if (finished) {
            console.log("Transition Finished - Starting Phase 2");
            isTransitioning = false;
            transitionTimer = 0; 
            gamePhase = 2;
            birdY = 425; // Put Dino on ground
            birdV = 0;
            pipes = []; 
            flashAlpha = 1.0; // Trigger the white flash
        }

        ctx.restore(); 
        return; // This is the 'Freeze' - if 'finished' never becomes true, we stay here.
    }




    if (!gameStarted) {
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0,0,360,500);
        ctx.fillStyle = "white"; ctx.font = "bold 25px Arial"; ctx.textAlign="center";
        ctx.fillText("TAP TO START", 180, 250);
        birdY = 250 + Math.sin(Date.now()/200)*10;
    } else if (!gameOver && !gameWon) {
        
        frame++;
        // Phase 1 Timer Scoring
        if (frame % 60 === 0 && gamePhase === 1) {
            score++;
            // TRIGGER TRANSITION INSTEAD OF INSTANT SWITCH
        if (score === 20 && !isTransitioning) { 
        console.log("Starting Transition at birdY: " + birdY);
        isTransitioning = true;
        transitionTimer = 0; // Reset the fail-safe
        
        // CREATE PARTICLES FIRST
        for (let i = 0; i < 30; i++) {
            transitionParticles.push(new Particle(birdX, birdY));
        }
        
        // HIDE BIRD SECOND
        birdY = -1000; 
    }

        }

        // Gravity & Physics
        let gravityVal = 0.26; // Default Phase 1 gravity
        if (gamePhase === 1 && score >= 15) {
            gravityVal = 0.42; // HARD MODE: Fall faster, tap rapidly!
        } else if (gamePhase === 2) {
            gravityVal = 0.45; // Dino phase gravity
        }

        birdV += gravityVal;
        birdY += birdV;

        if (gamePhase === 1) {
            if (!isTransitioning && (birdY > 500 || birdY < 0)) { gameOver = true; shakeTime = 15; }
        } else {
            if (birdY > 425) { birdY = 425; birdV = 0; }
            ctx.fillStyle = "#333"; ctx.fillRect(0, 460, 360, 40); // Ground
        }

        // Difficulty Tuning
        let moveSpeed;
        let spawnRate;

if (gamePhase === 1) {
    if (score < 15) {
        moveSpeed = 2.2 + (score * 0.12);
        // This formula keeps the gap constant: 
        // Higher speed = lower spawn frames (spawns sooner)
        spawnRate = Math.floor(250 / moveSpeed * 1.2); 
    } else {
        moveSpeed = 5.0; // The "Crazy" Speed
        spawnRate = 45;  // Tight, uniform gap for hard mode
    }
} else {
    moveSpeed = 2.5;
    spawnRate = 100;
}

        // Obstacle Spawning
        if (frame > 20 && frame % spawnRate === 0) {
            if (gamePhase === 1) {
                // Gap is between 50 and 250
                let t = Math.random() * 200 + 50; 
                // Using 'bot' to match your existing logic
                pipes.push({x: 380, top: t, bot: t + 180, type: 'f', passed: false});
            } else {
                // Dino obstacles (Phase 2)
                let h = Math.random() * 40 + 50;
                pipes.push({x: 380, top: 460 - h, type: 'd', passed: false});
            }
        }

        // Meteor Spawning
if (gamePhase === 2 && score >= 20 && frame % 145 === 0) {
    let dynamicSpeed = 4.2 + (score - 20) * 0.2; // Adds 0.2 speed for every point past 20
    meteors.push({ 
        x: 380, 
        y: 345, 
        speed: dynamicSpeed // We save the speed INSIDE the meteor object
    }); 
}
        

        // Collisions: Pipes & Cactuses
        pipes.forEach(p => {
            p.x -= moveSpeed;
            let birdR = 8; // Precise Hitbox
            let pipeW = 40;

            if (gamePhase === 1) {
                if (birdX + birdR > p.x && birdX - birdR < p.x + pipeW && birdY - birdR < p.top) { gameOver = true; shakeTime = 15; }
                if (birdX + birdR > p.x && birdX - birdR < p.x + pipeW && birdY + birdR > p.bot) { gameOver = true; shakeTime = 15; }
            } else {
                if (birdX + birdR > p.x + 10 && birdX - birdR < (p.x + pipeW) - 10 && birdY + birdR > p.top + 5) { damageTexts.push({ x: birdX, y: birdY, val: "-200", life: 1.2 , size: 28 }); hp = 0; gameOver = true; shakeTime = 40; }
                // Phase 2 Skill-based Scoring
                if (!p.passed && p.x + pipeW < birdX) {
                    score++; p.passed = true;
                    if (score >= 40) gameWon = true;
                }
            }
        });

        // Collisions: Meteors
        meteors.forEach((m, idx) => {
            m.x -= m.speed; 
            m.y += 0.7; // Diagonally towards dinosaur
            if (Math.hypot(birdX - m.x, birdY - m.y) < 22) {
                if (hasShield) {
                    hasShield = false; // Shield breaks, HP stays safe
                    spawnShieldBreak();
                    shakeTime = 10;
                    damageTexts.push({ x: birdX, y: birdY, val: "BLOCK!", life: 1.0, size: 22, color: "#3498db" });
                } else {
                    damageTexts.push({ x: birdX, y: birdY, val: "-50", life: 0.8 , size: 20 });
                    hp -= 50;
                    if (hp <= 0) { hp = 0; gameOver = true; shakeTime = 45; }
                }
                shakeTime = 15; 
                meteors.splice(idx, 1);
            }
        });

                // --- HEALTH POTION LOGIC ---
        if (gamePhase === 2 && frame % 400 === 0) {
            // Math.random() * (MaxHeight - MinHeight) + MinHeight
    // 350 is the ground level, so 150 to 300 keeps it reachable
    let spawnY = Math.random() * 30 + 350; 
    potions.push({ x: 380, y: spawnY, speed: 2.5 });
        }

        for (let i = potions.length - 1; i >= 0; i--) {
            let p = potions[i];
            p.x -= p.speed;
            p.y += 0.3;
            if (p.y > 330) p.y = 330;

            // Draw the Potion
            ctx.fillStyle = "#2ecc71"; // Green
            ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "white"; // The "+" sign
            ctx.fillRect(p.x - 2, p.y - 6, 4, 12);
            ctx.fillRect(p.x - 6, p.y - 2, 12, 4);

            // Collision with Bird
            if (Math.hypot(birdX - p.x, birdY - p.y) < 20) {
                hp = Math.min(200, hp + 50); // Heals 50, but caps at 200
                damageTexts.push({ x: birdX, y: birdY, val: "+50 HP", life: 1.0, size: 22 });
                potions.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (p.x < -20) potions.splice(i, 1);
        }

                // --- SHIELD SPAWNING ---
        if (gamePhase === 2 && frame % 600 === 0 && !hasShield) {
            let spawnY = Math.random() * 30 + 350; // Keeps shield within reach
    shields.push({ x: 380, y: spawnY, speed: 2.2 });
        }

        for (let i = shields.length - 1; i >= 0; i--) {
            let s = shields[i];
            s.x -= s.speed;
            s.y += 0.3;
            if (s.y > 330) s.y = 330;
            
            // Draw Shield Item
            ctx.fillStyle = "#3498db"; // Blue
            ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
            
            // Collision with Bird
            if (Math.hypot(birdX - s.x, birdY - s.y) < 20) {
                hasShield = true;
                damageTexts.push({ x: birdX, y: birdY, val: "SHIELD UP!", life: 1.0, size: 20, color: "#3498db" });
                shields.splice(i, 1);
                continue;
            }
            if (s.x < -20) shields.splice(i, 1);
        }
        
        

        pipes = pipes.filter(p => p.x > -100);
        meteors = meteors.filter(m => m.y < 520);
    }

            // --- BOSS & ARROW LOGIC ---
       if (gamePhase === 2 && score >= 30) {
    boss.active = true;
    
    // Boss moves faster as you get closer to 40
    let difficultyMult = 1 + (score - 30) * 0.1; 
    if (boss.x > 280) boss.x -= (1.5 * difficultyMult); 
    
    let targetY = birdY - 10;
    boss.y += (targetY - boss.y) * (0.05 * difficultyMult);

    boss.shootTimer++;
    // Shooting speed increases as score goes up
    if (boss.shootTimer > (90 / difficultyMult)) {
        let dx = birdX - boss.x;
        let dy = birdY - boss.y;
        let angle = Math.atan2(dy, dx);
        
        // Arrows fly faster as you near score 40
        let arrowSpeed = 6 * difficultyMult; 

        arrows.push({ 
            x: boss.x, 
            y: boss.y, 
            vx: Math.cos(angle) * arrowSpeed, 
            vy: Math.sin(angle) * arrowSpeed,
            angle: angle 
        });
        boss.shootTimer = 0;
    }
} 
 
        // Arrow Movement & Collision
        for (let i = arrows.length - 1; i >= 0; i--) {
            let a = arrows[i];
            a.x += a.vx; // Move towards bird X
            a.y += a.vy; // Move towards bird Y

            // Collision check
            if (Math.hypot(birdX - a.x, birdY - a.y) < 20) {
                if (hasShield) {
                    hasShield = false; // Shield absorbs the hit
                    spawnShieldBreak();
                    shakeTime = 5;
                    damageTexts.push({ x: birdX, y: birdY, val: "BLOCK!", life: 1.0, size: 22, color: "#3498db" });
                } else {
                    damageTexts.push({ x: birdX, y: birdY, val: "-20", life: 0.8, size: 20 });
                    hp -= 20;
                    if (hp <= 0) { hp = 0; gameOver = true; shakeTime = 40; }
                }
                shakeTime = 10;
                arrows.splice(i, 1);
                continue;
            }
            if (a.x < -50 || a.x > 400 || a.y < -50 || a.y > 600) arrows.splice(i, 1);
        }
    

    // DRAWING SECTION
    pipes.forEach(p => {
        if (pipeImg.complete) {
            if (p.type === 'f') {
                ctx.save(); ctx.translate(p.x+30, p.top); ctx.scale(1,-1);
                ctx.drawImage(pipeImg, -30, 0, 60, p.top); ctx.restore();
                ctx.drawImage(pipeImg, p.x, p.bot, 60, 500-p.bot);
            } else {
                ctx.drawImage(pipeImg, p.x, p.top, 60, 460-p.top);
            }
        }
    });

    meteors.forEach(m => {
        ctx.fillStyle = "orange"; ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, Math.PI*2); ctx.fill();
    });

        // --- DRAW ARROWS ---
    arrows.forEach(a => {
        ctx.save();
        // 1. Move the "drawing paper" to where the arrow is
        ctx.translate(a.x, a.y);
        
        // 2. Spin the paper to the angle we calculated when it was fired
        ctx.rotate(a.angle); 
        
        // 3. Draw the arrow at (0,0) because we translated the context
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, -1.5, 12, 3); // Arrow body
        
        ctx.fillStyle = "red";
        ctx.beginPath(); // Arrow head
        ctx.moveTo(0, -5);
        ctx.lineTo(-10, 0); // Points toward the bird
        ctx.lineTo(0, 5);
        ctx.fill();
        
        // 4. Reset the paper so other things don't draw crooked
        ctx.restore();
    });

    // --- DRAW BOSS ---
    if (boss.active) {
        ctx.fillStyle = "purple";
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y - 15);
        ctx.lineTo(boss.x + 15, boss.y);
        ctx.lineTo(boss.x, boss.y + 15);
        ctx.lineTo(boss.x - 15, boss.y);
        ctx.fill();
        // Eye
        ctx.fillStyle = "cyan";
        ctx.beginPath(); ctx.arc(boss.x - 4, boss.y, 4, 0, Math.PI*2); ctx.fill();
    }
    

    // >>> PASTE THE WARNING LOGIC HERE <<<
    if (gamePhase === 1 && (score === 18 || score === 19)) {
        if (Math.floor(frame / 20) % 2 === 0) {
            ctx.fillStyle = "red";
            ctx.font = "bold 30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("PHASE 2 INCOMING!", 180, 150);
            
            ctx.strokeStyle = "red";
            ctx.lineWidth = 5;
            ctx.strokeRect(5, 5, 350, 490);
        }
    }


    // Health Bar Phase 2
    if (gamePhase === 2 && !gameOver) {
        ctx.fillStyle = "black"; ctx.fillRect(100, 15, 160, 12);
        ctx.fillStyle = hp > 60 ? "#2ecc71" : "#e74c3c";
        ctx.fillRect(100, 15, (hp/200)*160, 12);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.xv;
        p.y += p.yv;
        p.life -= 0.03; 

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0;
    for (let i = damageTexts.length - 1; i >= 0; i--) {
    let dt = damageTexts[i];
    dt.y -= 1.2;    // Make it float up
    dt.life -= 0.02; // Fade out speed

    if (dt.life <= 0) {
            damageTexts.splice(i, 1);
        } else {
            ctx.save();
            ctx.globalAlpha = dt.life;
            ctx.fillStyle = "#ff0000"; 
            ctx.font = `bold ${dt.size}px Arial`;
            ctx.textAlign = "center";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.strokeText(dt.val, dt.x, dt.y);
            ctx.fillText(dt.val, dt.x, dt.y);
            ctx.restore();
        }
    }
    ctx.globalAlpha = 1.0;

           // --- DRAW BIRD/DINO + PULSING SHIELD ---
    ctx.save(); 
    ctx.translate(birdX, birdY);
    
    // Rotate bird only in Phase 1
    if (gamePhase === 1) ctx.rotate(birdV * 0.1);
    
    // 1. Draw the Bird/Dino Image
    if (birdImg.complete) ctx.drawImage(birdImg, -25, -25, 50, 50);

    // 2. DRAW THE PULSING SHIELD
    if (hasShield) {
        // This math creates a pulse between 30 and 36 pixels
        let pulse = 33 + Math.sin(Date.now() / 150) * 4;
        
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        
        // Outer Glow Line
        ctx.strokeStyle = "rgba(52, 152, 219, 0.8)"; 
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner Transparent Glow
        ctx.fillStyle = "rgba(52, 152, 219, 0.2)";
        ctx.fill();
        
        // OPTIONAL: Add a white "shimmer" line
        ctx.beginPath();
        ctx.arc(0, 0, pulse - 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    ctx.restore();
 
    

    ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.textAlign="left";
    ctx.fillText("Score: "+score, 20, 40);
    
    if (gameOver || gameWon) runEndSequence();
    // --- Screen Flash Effect ---
if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashAlpha -= 0.05; // Fade the flash out slowly
}
    
    ctx.restore();
    requestAnimationFrame(loop);
}

// 2. UPDATED END SEQUENCE
function runEndSequence() {
    canvas.style.filter = "invert(0)";
    if (!endTriggered) {
        endTriggered = true;
        let win = score >= 40;
        let r = Math.floor(Math.random() * 5);

        // Prepare the meme and sound
        memeImg.src = win ? "win.gif" : memeFiles[r];
        let activeSound = win ? winSound : sounds[r];

        // Play sound immediately
        activeSound.currentTime = 0; 
        activeSound.play().catch(e => console.log("Audio play failed:", e));

        memeImg.style.display = "block";
        
        deaths++; 
        localStorage.setItem("totalDeaths", deaths);
        if (score > highScore) { 
            highScore = score; 
            localStorage.setItem("highScore", highScore); 
        }

        setTimeout(() => { showSkip = true; }, 1500);
        setTimeout(() => { showScoreboard = true; }, 5000);
    }
    
    
    if (showScoreboard) {
        memeImg.style.display = "none";
        ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fillRect(40,100,280,300);
        ctx.fillStyle = "white"; ctx.textAlign="center";
        ctx.font = "bold 24px Arial"; ctx.fillText(score>=40?"WINNER!":"GAME OVER", 180, 150);
        ctx.font = "18px Arial"; 
        ctx.fillText("Score: "+score, 180, 200);
        ctx.fillText("High Score: "+highScore, 180, 240);
        ctx.fillText("Total Deaths: "+deaths, 180, 280);
        ctx.fillStyle = "#70c5ce"; ctx.fillText("Tap to Restart", 180, 360);
    }
}

loop();
                    

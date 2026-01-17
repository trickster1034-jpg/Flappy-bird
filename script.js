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


// Storage
let highScore = localStorage.getItem("highScore") || 0;
let deaths = localStorage.getItem("totalDeaths") || 0;
let shakeTime = 0;

function doTap() {
    if (gameOver || gameWon) {
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
    
    if (gamePhase === 1) birdV = -5.2;
    else if (birdY >= 420) birdV = -10.0;
}

window.addEventListener("touchstart", (e) => { e.preventDefault(); doTap(); }, {passive: false});
window.addEventListener("mousedown", doTap);

function loop() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen Shake Effect
    if (shakeTime > 0) {
        ctx.translate(Math.random() * 6 - 3, Math.random() * 6 - 3);
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
            if (score === 20) { 
                gamePhase = 2; 
                pipes = []; 
                birdY = 425; 
                birdV = 0; 
            }
        }

        // Gravity & Physics
        birdV += (gamePhase === 1 ? 0.26 : 0.45);
        birdY += birdV;

        if (gamePhase === 1) {
            if (birdY > 500 || birdY < 0) { gameOver = true; shakeTime = 15; }
        } else {
            if (birdY > 425) { birdY = 425; birdV = 0; }
            ctx.fillStyle = "#333"; ctx.fillRect(0, 460, 360, 40); // Ground
        }

        // Difficulty Tuning
        let moveSpeed = (gamePhase === 1 && score >= 15) ? 3.8 : 2.2;
        let spawnRate = (gamePhase === 1) ? (score >= 15 ? 85 : 145) : 90;

        // Obstacle Spawning
        if (frame > 20 && frame % spawnRate === 0) {
            if (gamePhase === 1) {
                let t = Math.random() * 200 + 50;
                // Vertical Gap tuned to 180px
                pipes.push({x: 380, top: t, bot: t + 180, type: 'f', passed: false});
            } else {
                let h = Math.random() * 40 + 50;
                pipes.push({x: 380, top: 460 - h, type: 'd', passed: false});
            }
        }

        // Jumpable Meteor Logic
        if (gamePhase === 2 && score >= 30 && frame % 145 === 0) {
            meteors.push({ x: 380, y: 345 }); 
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
            m.x -= 4.2; 
            m.y += 0.7; // Diagonally towards dinosaur
            if (Math.hypot(birdX - m.x, birdY - m.y) < 22) {
                damageTexts.push({ x: birdX, y: birdY, val: "-50", life: 0.8 , size: 20 });
                hp -= 50; shakeTime = 15; meteors.splice(idx, 1);
                if (hp <= 0) { hp = 0; gameOver = true; shakeTime = 45; }
            }
        });

        pipes = pipes.filter(p => p.x > -100);
        meteors = meteors.filter(m => m.y < 520);
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

    // Draw Bird/Dino
    ctx.save(); ctx.translate(birdX, birdY);
    if (gamePhase === 1) ctx.rotate(birdV * 0.1);
    if (birdImg.complete) ctx.drawImage(birdImg, -25, -25, 50, 50);
    ctx.restore();

    ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.textAlign="left";
    ctx.fillText("Score: "+score, 20, 40);
    
    if (gameOver || gameWon) runEndSequence();
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
                    

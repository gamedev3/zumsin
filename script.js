// Get the canvas and set its dimensions
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 360; // Default size
canvas.height = 640;

let gameRunning = false;
let player, zombies, score, level, boss;
let gameOver = false;
let maxLevels = 10;
let isBossLevel = false;

let keys = {};
let bullets = [];
let lastShot = 0; // To limit the rate of shooting
let shootDelay = 300; // Delay between shots in milliseconds

// Preload images and sounds
let zombieImage = new Image();
zombieImage.src = 'zombie.pic.png'; 

let playerImage = new Image();
playerImage.src = 'hero.png'; 

let bulletImage = new Image();
bulletImage.src = 'bullet.pic.png';

let backgroundMusic = new Audio('dont need');
let attackSound = new Audio('attack sound.mp3');
let zombieDeathSound = new Audio('dead-sound.mp3');
let gameOversound = new Audio('game-over-sound.mp3');

// Function to add event listeners to buttons
function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('retry-button').addEventListener('click', restartGame);
    document.getElementById('fullscreen-button').addEventListener('click', toggleFullScreen);
}

// Call setupEventListeners initially and also on game restart
setupEventListeners();

// Function to ensure proper fullscreen handling
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.webkitRequestFullscreen) { /* Safari */
            canvas.webkitRequestFullscreen();
        } else if (canvas.msRequestFullscreen) { /* IE11 */
            canvas.msRequestFullscreen();
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        canvas.width = 360; // Reset to default when exiting full-screen
        canvas.height = 640;
    }
}

// Adjust canvas size on window resize (for responsiveness)
window.addEventListener('resize', () => {
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 360;
        canvas.height = 640;
    }
});

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // Add shooting mechanic for "g"
    if (e.key === 'g' && gameRunning && Date.now() - lastShot > shootDelay) {
        shootBullet();
        lastShot = Date.now(); // Record time of the shot
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Separate controls for mobile and desktop
if (isMobile()) {
    // Touch-based controls for mobile
    canvas.addEventListener('touchmove', function(e) {
        let touchX = e.touches[0].clientX;
        let touchY = e.touches[0].clientY;

        // Move player based on touch position
        player.x = touchX - player.width / 2;  // Center player on touch
        player.y = touchY - player.height / 2; // Center player on touch
    });

    canvas.addEventListener('touchstart', function(e) {
        shootBullet();  // Shoot bullet on touch
    });
}

function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function startGame() {
    document.getElementById('start-menu').style.display = 'none';
    canvas.style.display = 'block';
    gameRunning = true;
    playBackgroundMusic();
    initializeGame();

     // Automatically enter fullscreen mode
     if (!document.fullscreenElement) {
        toggleFullScreen();
    }
}

function restartGame() {
    document.getElementById('retry-menu').style.display = 'none';
    canvas.style.display = 'block';
    gameRunning = true;
    gameOver = false;
    initializeGame();
    setupEventListeners(); // Reattach event listeners on restart
    // Automatically enter fullscreen mode
    if (!document.fullscreenElement) {
        toggleFullScreen();
    }
}

// Game initialization
function initializeGame() {
    player = { 
        x: 160, 
        y: 580, 
        width: 70,  // Adjust size to match my image
        height: 70, // Adjust size to match my image
        speed: 5, 
        health: 100 
    };
    zombies = [];
    score = 0;
    level = 1;
    isBossLevel = false;
    spawnZombies(level);
    gameLoop();
}

function gameLoop() {
    if (!gameRunning || gameOver) return;
    updateGame();
    updateBullets(); // Move bullets
    renderGame();
    drawBullets(); // Draw bullets on canvas
    requestAnimationFrame(gameLoop); // Run at 60 FPS
}

// Update game state
function updateGame() {
    movePlayer();
    updateZombies();

    if (isBossLevel) {
        updateBoss();
    }

    if (zombies.length === 0 && !isBossLevel) {
        levelUp();
    }

    if (level > maxLevels && !isBossLevel) {
        startBossLevel();
    }

    if (player.health <= 0) {
        gameOver = true;
        endGame();
    }
}

// Render game on canvas
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    drawPlayer();

    // Draw zombies
    drawZombies();

    // Draw boss if in boss level
    if (isBossLevel) {
        drawBoss();
    }

    // Draw score and level
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${score}`, 10, 20);
    ctx.fillText(`Level: ${level}`, 10, 50);
}

// Function to reset fullscreen mode when game ends
function endGame() {
    canvas.style.display = 'none';
    document.getElementById('final-score').innerText = `Your score: ${score}`;
    document.getElementById('retry-menu').style.display = 'block';
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0; // Reset background music
    // Exit fullscreen if necessary
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
    }
}
// Player movement
function movePlayer() {
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
}

// Spawn zombies with a larger fixed size across all levels
function spawnZombies(level) {
    zombies = [];
    let zombieCount = level * 5;
    let fixedZombieWidth = 100;  // Set the larger fixed width for all zombies
    let fixedZombieHeight = 100; // Set the larger fixed height for all zombies

    for (let i = 0; i < zombieCount; i++) {
        zombies.push({
            x: Math.random() * (canvas.width - fixedZombieWidth), // Ensure zombies spawn within the canvas width
            y: Math.random() * -100,
            width: fixedZombieWidth,  // Use fixed larger width
            height: fixedZombieHeight, // Use fixed larger height
            speed: 1 + (level * 0.2),
            health: 20 + (level * 5),
            image: zombieImage // Assign the preloaded image
        });
    }
}

// Update zombies
function updateZombies() {
    zombies.forEach((zombie, index) => {
        zombie.y += zombie.speed;
        if (zombie.y > canvas.height) {
            zombie.y = Math.random() * -100;
            zombie.x = Math.random() * canvas.width;
        }
        if (checkCollision(player, zombie)) {
            player.health -= 10;
        }

        if (zombie.health <= 0) {
            zombies.splice(index, 1);
            score += 10;
            playZombieDeathSound();
        }
    });
}

// Draw zombies
function drawZombies() {
    zombies.forEach(zombie => {
        if (zombie.image.complete) {  // Check if the image is loaded
            ctx.drawImage(zombie.image, zombie.x, zombie.y, zombie.width, zombie.height);
        } else {
            // Fallback in case the image isn't ready yet
            ctx.fillStyle = 'green';
            ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
        }
    });
}

// Draw player
function drawPlayer() {
    if (playerImage.complete) {  // Ensure the image is loaded
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
        // Fallback if the image isn't ready yet
        ctx.fillStyle = 'blue';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

// Draw bullets
function drawBullets() {
    bullets.forEach(bullet => {
        if (bulletImage.complete) {  // Ensure the image is loaded
            ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
            // Fallback if the image isn't ready yet
            ctx.fillStyle = 'red';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    });
}

// Update bullets
function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;

        zombies.forEach(zombie => {
            if (checkCollision(bullet, zombie)) {
                zombie.health -= 20;
                bullets.splice(index, 1);
            }
        });

        // Remove bullet if off screen
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });
}

// Shoot bullet
function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 5,  // Adjust bullet spawn position
        y: player.y,
        width: 40,
        height: 40,
        speed: 7,
    });

    playAttackSound();
}

// Check for collisions between two objects
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Level up
function levelUp() {
    level++;
    spawnZombies(level);
}

// Start boss level
function startBossLevel() {
    isBossLevel = true;
    boss = {
        x: canvas.width / 2 - 100,
        y: 50,
        width: 200,
        height: 200,
        health: 500,
        speed: 2,
    };
}

// Draw boss
function drawBoss() {
    ctx.fillStyle = 'purple';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(`Boss Health: ${boss.health}`, 10, 80);
}

// Update boss
function updateBoss() {
    boss.y += boss.speed;
    if (boss.y > canvas.height - boss.height || boss.y < 0) {
        boss.speed *= -1;
    }

    if (checkCollision(player, boss)) {
        player.health -= 20;
    }

    bullets.forEach((bullet, index) => {
        if (checkCollision(bullet, boss)) {
            boss.health -= 10;
            bullets.splice(index, 1);
        }
    });

    if (boss.health <= 0) {
        isBossLevel = false;
        levelUp();
    }
}

// Play background music
function playBackgroundMusic() {
    backgroundMusic.loop = true;
    backgroundMusic.play();
}

// Play attack sound
function playAttackSound() {
    attackSound.play();
}

// Play zombie death sound
function playZombieDeathSound() {
    zombieDeathSound.play();
}

// Sample code to display a banner ad
function showBannerAd() {
    const bannerAd = document.createElement('div');
    bannerAd.id = 'bannerAd';
    bannerAd.style.position = 'fixed';
    bannerAd.style.width = '100%';
    bannerAd.style.height = '60px'; // adjust as needed
    bannerAd.style.bottom = '0'; // or 'top' for top placement
    bannerAd.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // semi-transparent
    bannerAd.innerHTML = '<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkUU_xWvEtjqjMN1PPYO3xEmmsS-KGJ-6J9Q&s" alt="Banner Ad" style="width: 100%; height: auto;">';
    document.body.appendChild(bannerAd);

    // Optionally, add an event listener for clicks
    bannerAd.addEventListener('click', () => {
        window.open('https://advertiser.com', '_blank');
    });
}

// Call this function when the game starts
showBannerAd();
function showInterstitialAd() {
    // Assuming you've already loaded the ad in advance
    const interstitialAd = document.createElement('div');
    interstitialAd.id = 'interstitialAd';
    interstitialAd.style.position = 'fixed';
    interstitialAd.style.top = '-50';
    interstitialAd.style.left = '60';
    interstitialAd.style.width = '50%';
    interstitialAd.style.height = '50%';
    interstitialAd.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    interstitialAd.innerHTML = '<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkUU_xWvEtjqjMN1PPYO3xEmmsS-KGJ-6J9Q&s" alt="Interstitial Ad" style="width: 100%; height: auto;">';

    document.body.appendChild(interstitialAd);

    // Close ad on click
    interstitialAd.addEventListener('click', () => {
        document.body.removeChild(interstitialAd);
    });

    // Optionally, set a timer to auto-close after a few seconds
    setTimeout(() => {
        if (document.body.contains(interstitialAd)) {
            document.body.removeChild(interstitialAd);
        }
    }, 3000); // adjust timing as needed
}


// Call this function at strategic points, e.g., at game over or level transition
showInterstitialAd();
function showPopunderAd() {
    // This should be triggered by an event, like clicking a button or after completing a level
    window.open('https://advertiser.com', '_blank');
}

// Call this function when the player performs a specific action, like clicking a button
someButton.addEventListener('click', showPopunderAd);

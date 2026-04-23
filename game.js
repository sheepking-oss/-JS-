// 游戏配置
const GAME_CONFIG = {
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 600,
    GRAVITY: 0.35,
    FRICTION: 0.98,
    BOUNCE: 0.3,
    INITIAL_TIME: 60,
    INITIAL_LIVES: 3,
    MERGE_SCORE_BASE: 10,
    MERGE_SCORE_MULTIPLIER: 1.5,
    COMBO_MULTIPLIER_BASE: 1,
    COMBO_MULTIPLIER_INCREMENT: 0.5,
    MAX_COMBO: 5,
    POWER_UP_SPAWN_CHANCE: 0.1,
    SLOW_DOWN_DURATION: 5000,
    SHIELD_DURATION: 10000,
    SPAWN_DELAY: 800,
    DROP_AREA_HEIGHT: 120,
};

// 水果类型定义
const FRUIT_TYPES = [
    { level: 0, name: '🍒', radius: 20, color: '#ff6b6b', score: 10 },
    { level: 1, name: '🍋', radius: 25, color: '#feca57', score: 20 },
    { level: 2, name: '🍊', radius: 30, color: '#ff9f43', score: 30 },
    { level: 3, name: '🍑', radius: 35, color: '#ff6b9d', score: 40 },
    { level: 4, name: '🍉', radius: 40, color: '#48dbfb', score: 50 },
    { level: 5, name: '🥝', radius: 45, color: '#a8e6cf', score: 60 },
    { level: 6, name: '🍇', radius: 50, color: '#9b59b6', score: 70 },
    { level: 7, name: '🍓', radius: 55, color: '#e74c3c', score: 80 },
    { level: 8, name: '🍎', radius: 60, color: '#e84393', score: 90 },
    { level: 9, name: '🥥', radius: 65, color: '#dfe6e9', score: 100 },
    { level: 10, name: '🍈', radius: 70, color: '#74b9ff', score: 200 },
];

// 主题列表
const THEMES = ['theme-default', 'theme-dark', 'theme-fresh', 'theme-ocean'];

// 游戏状态
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.score = 0;
        this.highScore = this.getHighScore();
        this.time = GAME_CONFIG.INITIAL_TIME;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.combo = 0;
        this.currentTheme = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.gameOver = false;
        this.canSpawn = true;
        
        this.powerUps = {
            slowDown: 0,
            shield: 0,
            clear: 0
        };
        
        this.activePowerUps = {
            slowDown: false,
            shield: false
        };
        
        this.powerUpTimers = {
            slowDown: null,
            shield: null
        };
    }

    getHighScore() {
        const saved = localStorage.getItem('watermelonMergeHighScore');
        return saved ? parseInt(saved) : 0;
    }

    setHighScore(score) {
        if (score > this.highScore) {
            this.highScore = score;
            localStorage.setItem('watermelonMergeHighScore', score.toString());
        }
    }
}

// 水果类
class Fruit {
    constructor(type, x, y, game) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = type.radius;
        this.isDropped = false;
        this.game = game;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.scale = 1;
        this.opacity = 1;
        this.id = Math.random().toString(36).substr(2, 9);
    }

    update(activePowerUps) {
        if (!this.isDropped) {
            this.rotation += this.rotationSpeed * 0.5;
            return;
        }

        const gravity = activePowerUps.slowDown ? GAME_CONFIG.GRAVITY * 0.3 : GAME_CONFIG.GRAVITY;
        this.vy += gravity;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.vx *= GAME_CONFIG.FRICTION;
        this.vy *= GAME_CONFIG.FRICTION;
        
        this.rotation += this.rotationSpeed;
        
        this.checkBoundaries();
    }

    checkBoundaries() {
        const canvas = this.game.canvas;
        
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx) * GAME_CONFIG.BOUNCE;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx = -Math.abs(this.vx) * GAME_CONFIG.BOUNCE;
        }
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy = -Math.abs(this.vy) * GAME_CONFIG.BOUNCE;
            if (Math.abs(this.vy) < 0.5) {
                this.vy = 0;
            }
        }
    }

    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    resolveCollision(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            const angle = Math.random() * Math.PI * 2;
            const moveDistance = 1;
            this.x -= Math.cos(angle) * moveDistance;
            this.y -= Math.sin(angle) * moveDistance;
            other.x += Math.cos(angle) * moveDistance;
            other.y += Math.sin(angle) * moveDistance;
            return;
        }
        
        const overlap = (this.radius + other.radius) - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        
        const totalMass = this.radius + other.radius;
        const ratio1 = other.radius / totalMass;
        const ratio2 = this.radius / totalMass;
        
        this.x -= nx * overlap * ratio1;
        this.y -= ny * overlap * ratio1;
        other.x += nx * overlap * ratio2;
        other.y += ny * overlap * ratio2;
        
        const dvx = other.vx - this.vx;
        const dvy = other.vy - this.vy;
        
        const dvn = dvx * nx + dvy * ny;
        
        if (dvn > 0) return;
        
        const restitution = GAME_CONFIG.BOUNCE;
        const impulse = -(1 + restitution) * dvn / 2;
        
        this.vx -= impulse * nx;
        this.vy -= impulse * ny;
        other.vx += impulse * nx;
        other.vy += impulse * ny;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        
        const gradient = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, 0,
            0, 0, this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, this.type.color);
        gradient.addColorStop(1, this.darkenColor(this.type.color, 0.3));
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = this.darkenColor(this.type.color, 0.5);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = `${this.radius * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.name, 0, 0);
        
        ctx.restore();
    }

    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor));
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor));
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor));
        return `rgb(${r}, ${g}, ${b})`;
    }

    checkTopBoundary() {
        return this.y - this.radius < 0;
    }
}

// 道具类
class PowerUp {
    constructor(type, x, y, game) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.vy = 2;
        this.game = game;
        this.rotation = 0;
        this.lifetime = 300;
        
        switch (type) {
            case 'slowDown':
                this.name = '🐌';
                this.color = '#9b59b6';
                break;
            case 'shield':
                this.name = '🛡️';
                this.color = '#3498db';
                break;
            case 'clear':
                this.name = '🧹';
                this.color = '#e74c3c';
                break;
        }
    }

    update() {
        this.y += this.vy;
        this.rotation += 0.05;
        this.lifetime--;
        
        if (this.y + this.radius > this.game.canvas.height) {
            this.y = this.game.canvas.height - this.radius;
            this.vy = 0;
        }
        
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const alpha = Math.min(1, this.lifetime / 60);
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.font = `${this.radius * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, 0, 0);
        
        ctx.restore();
    }

    checkCollision(fruit) {
        const dx = this.x - fruit.x;
        const dy = this.y - fruit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + fruit.radius;
    }
}

// 得分弹出效果
class ScorePopup {
    constructor(x, y, score, game) {
        this.x = x;
        this.y = y;
        this.score = score;
        this.game = game;
        this.lifetime = 60;
        this.scale = 0.5;
    }

    update() {
        this.y -= 2;
        this.scale += 0.02;
        this.lifetime--;
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        const alpha = this.lifetime / 60;
        ctx.globalAlpha = alpha;
        
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff6b6b';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeText(`+${this.score}`, 0, 0);
        ctx.fillText(`+${this.score}`, 0, 0);
        
        ctx.restore();
    }
}

// 游戏主类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new GameState();
        
        this.fruits = [];
        this.powerUps = [];
        this.scorePopups = [];
        
        this.currentFruit = null;
        this.nextFruitType = null;
        
        this.gameLoop = null;
        this.timerInterval = null;
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.fruitStartX = 0;
        this.fruitStartY = 0;
        this.fruitOriginalX = 0;
        this.fruitOriginalY = 0;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadTheme();
        this.updateUI();
        this.generateNextFruit();
        this.showStartModal();
    }

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        
        const resizeCanvas = () => {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            const ratio = GAME_CONFIG.CANVAS_HEIGHT / GAME_CONFIG.CANVAS_WIDTH;
            
            if (containerHeight / containerWidth > ratio) {
                this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
                this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
                this.canvas.style.width = '100%';
                this.canvas.style.height = 'auto';
            } else {
                this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
                this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
                this.canvas.style.width = 'auto';
                this.canvas.style.height = '100%';
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('themeBtn').addEventListener('click', () => this.switchTheme());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('modalStartBtn').addEventListener('click', () => {
            document.getElementById('startModal').style.display = 'none';
            this.startGame();
        });
        
        document.getElementById('slowDownItem').addEventListener('click', () => this.usePowerUp('slowDown'));
        document.getElementById('shieldItem').addEventListener('click', () => this.usePowerUp('shield'));
        document.getElementById('clearItem').addEventListener('click', () => this.usePowerUp('clear'));
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let clientX = e.clientX;
        let clientY = e.clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            rawX: clientX - rect.left,
            rawY: clientY - rect.top
        };
    }

    handleMouseDown(e) {
        if (!this.state.isPlaying || this.state.isPaused || this.state.gameOver) return;
        if (!this.currentFruit || this.currentFruit.isDropped) return;
        if (!this.state.canSpawn) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        const dx = coords.x - this.currentFruit.x;
        const dy = coords.y - this.currentFruit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const clickThreshold = this.currentFruit.radius + 60;
        
        if (distance < clickThreshold) {
            this.isDragging = true;
            this.dragOffsetX = dx;
            this.dragOffsetY = dy;
            this.dragStartX = coords.x;
            this.dragStartY = coords.y;
            this.fruitOriginalX = this.currentFruit.x;
            this.fruitOriginalY = this.currentFruit.y;
        } else if (coords.y < GAME_CONFIG.DROP_AREA_HEIGHT + 100) {
            this.isDragging = true;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.dragStartX = coords.x;
            this.dragStartY = coords.y;
            this.fruitOriginalX = this.currentFruit.x;
            this.fruitOriginalY = this.currentFruit.y;
            
            this.updateFruitPosition(coords);
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.currentFruit) return;
        
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e);
        
        this.updateFruitPosition(coords);
    }

    updateFruitPosition(coords) {
        if (!this.currentFruit) return;
        
        let targetX = coords.x - this.dragOffsetX;
        let targetY = coords.y - this.dragOffsetY;
        
        const minX = this.currentFruit.radius;
        const maxX = this.canvas.width - this.currentFruit.radius;
        
        const minY = this.currentFruit.radius;
        const maxY = GAME_CONFIG.DROP_AREA_HEIGHT + this.currentFruit.radius;
        
        this.currentFruit.x = Math.max(minX, Math.min(maxX, targetX));
        this.currentFruit.y = Math.max(minY, Math.min(maxY, targetY));
    }

    handleMouseUp(e) {
        if (!this.isDragging || !this.currentFruit) return;
        
        this.isDragging = false;
        this.dropCurrentFruit();
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.handleMouseDown(e);
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.handleMouseMove(e);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp(e);
    }

    dropCurrentFruit() {
        if (!this.currentFruit || this.currentFruit.isDropped) return;
        
        this.currentFruit.isDropped = true;
        this.state.canSpawn = false;
        
        setTimeout(() => {
            if (this.state.isPlaying && !this.state.gameOver && !this.state.isPaused) {
                this.spawnNewFruit();
            }
        }, GAME_CONFIG.SPAWN_DELAY);
    }

    startGame() {
        this.state.reset();
        this.fruits = [];
        this.powerUps = [];
        this.scorePopups = [];
        
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.gameOver = false;
        this.state.canSpawn = true;
        this.isDragging = false;
        
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'block';
        document.getElementById('gameOverModal').style.display = 'none';
        
        this.generateNextFruit();
        this.spawnNewFruit();
        this.startGameLoop();
        this.startTimer();
        this.updateUI();
    }

    restartGame() {
        this.stopGameLoop();
        this.stopTimer();
        this.clearAllPowerUpTimers();
        this.startGame();
    }

    togglePause() {
        if (!this.state.isPlaying || this.state.gameOver) return;
        
        this.state.isPaused = !this.state.isPaused;
        document.getElementById('pauseBtn').textContent = this.state.isPaused ? '继续' : '暂停';
        
        if (!this.state.isPaused) {
            this.startGameLoop();
            this.startTimer();
        } else {
            this.stopGameLoop();
            this.stopTimer();
        }
    }

    startGameLoop() {
        if (this.gameLoop) return;
        
        const loop = () => {
            this.update();
            this.render();
            this.gameLoop = requestAnimationFrame(loop);
        };
        
        this.gameLoop = requestAnimationFrame(loop);
    }

    stopGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
    }

    startTimer() {
        if (this.timerInterval) return;
        
        this.timerInterval = setInterval(() => {
            this.state.time--;
            this.updateUI();
            
            if (this.state.time <= 0) {
                this.gameOver();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    generateNextFruit() {
        const maxLevel = Math.min(3, Math.floor(this.state.score / 500));
        const level = Math.floor(Math.random() * (maxLevel + 1));
        this.nextFruitType = FRUIT_TYPES[level];
        this.updateNextFruitPreview();
    }

    spawnNewFruit() {
        if (!this.nextFruitType) {
            this.generateNextFruit();
        }
        
        const x = this.canvas.width / 2;
        const y = this.nextFruitType.radius + 30;
        
        this.currentFruit = new Fruit(this.nextFruitType, x, y, this);
        this.fruits.push(this.currentFruit);
        this.state.canSpawn = true;
        
        this.generateNextFruit();
    }

    update() {
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            fruit.update(this.state.activePowerUps);
        }
        
        this.handleCollisions();
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            const active = powerUp.update();
            
            if (!active) {
                this.powerUps.splice(i, 1);
                continue;
            }
            
            for (const fruit of this.fruits) {
                if (fruit.isDropped && powerUp.checkCollision(fruit)) {
                    this.collectPowerUp(powerUp);
                    this.powerUps.splice(i, 1);
                    break;
                }
            }
        }
        
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            const active = popup.update();
            
            if (!active) {
                this.scorePopups.splice(i, 1);
            }
        }
        
        this.checkTopBoundary();
    }

    handleCollisions() {
        let hasMerge = false;
        
        for (let i = 0; i < this.fruits.length; i++) {
            for (let j = i + 1; j < this.fruits.length; j++) {
                const fruit1 = this.fruits[i];
                const fruit2 = this.fruits[j];
                
                if (!fruit1.collidesWith(fruit2)) continue;
                
                const canMerge = fruit1.type.level === fruit2.type.level &&
                                fruit1.type.level < FRUIT_TYPES.length - 1 &&
                                fruit1.isDropped && fruit2.isDropped;
                
                if (canMerge) {
                    this.mergeFruits(fruit1, fruit2);
                    hasMerge = true;
                    i = -1;
                    break;
                } else {
                    fruit1.resolveCollision(fruit2);
                }
            }
        }
    }

    mergeFruits(fruit1, fruit2) {
        const newLevel = fruit1.type.level + 1;
        const newType = FRUIT_TYPES[newLevel];
        
        const newX = (fruit1.x + fruit2.x) / 2;
        const newY = (fruit1.y + fruit2.y) / 2;
        
        const index1 = this.fruits.indexOf(fruit1);
        const index2 = this.fruits.indexOf(fruit2);
        
        if (index1 > -1 && index2 > -1) {
            if (index1 > index2) {
                this.fruits.splice(index1, 1);
                this.fruits.splice(index2, 1);
            } else {
                this.fruits.splice(index2, 1);
                this.fruits.splice(index1, 1);
            }
        }
        
        const newFruit = new Fruit(newType, newX, newY, this);
        newFruit.isDropped = true;
        
        const avgVx = (fruit1.vx + fruit2.vx) / 2;
        const avgVy = (fruit1.vy + fruit2.vy) / 2;
        
        newFruit.vx = avgVx * 0.5;
        newFruit.vy = Math.min(avgVy, 2);
        
        this.fruits.push(newFruit);
        
        if (fruit1 === this.currentFruit || fruit2 === this.currentFruit) {
            this.currentFruit = null;
        }
        
        this.state.combo++;
        
        const baseScore = newType.score * GAME_CONFIG.MERGE_SCORE_BASE;
        const comboMultiplier = GAME_CONFIG.COMBO_MULTIPLIER_BASE + 
                                 (this.state.combo - 1) * GAME_CONFIG.COMBO_MULTIPLIER_INCREMENT;
        const finalScore = Math.floor(baseScore * Math.min(comboMultiplier, GAME_CONFIG.MAX_COMBO));
        
        this.state.score += finalScore;
        this.state.setHighScore(this.state.score);
        
        this.scorePopups.push(new ScorePopup(newX, newY, finalScore, this));
        
        if (this.state.combo > 1) {
            this.showCombo();
        }
        
        if (Math.random() < GAME_CONFIG.POWER_UP_SPAWN_CHANCE) {
            this.spawnPowerUp(newX, newY);
        }
        
        this.updateUI();
        
        setTimeout(() => {
            this.state.combo = 0;
            this.hideCombo();
        }, 3000);
    }

    spawnPowerUp(x, y) {
        const types = ['slowDown', 'shield', 'clear'];
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = new PowerUp(type, x, y - 50, this);
        this.powerUps.push(powerUp);
    }

    collectPowerUp(powerUp) {
        this.state.powerUps[powerUp.type]++;
        this.updatePowerUpUI();
    }

    usePowerUp(type) {
        if (this.state.powerUps[type] <= 0) return;
        
        if (type === 'slowDown' || type === 'shield') {
            if (this.state.activePowerUps[type]) return;
        }
        
        this.state.powerUps[type]--;
        
        switch (type) {
            case 'slowDown':
                this.activateSlowDown();
                break;
            case 'shield':
                this.activateShield();
                break;
            case 'clear':
                this.activateClear();
                break;
        }
        
        this.updatePowerUpUI();
    }

    activateSlowDown() {
        this.state.activePowerUps.slowDown = true;
        document.getElementById('slowDownItem').classList.add('active');
        
        if (this.state.powerUpTimers.slowDown) {
            clearTimeout(this.state.powerUpTimers.slowDown);
        }
        
        this.state.powerUpTimers.slowDown = setTimeout(() => {
            this.state.activePowerUps.slowDown = false;
            document.getElementById('slowDownItem').classList.remove('active');
        }, GAME_CONFIG.SLOW_DOWN_DURATION);
    }

    activateShield() {
        this.state.activePowerUps.shield = true;
        document.getElementById('shieldItem').classList.add('active');
        document.getElementById('shieldIndicator').style.display = 'block';
        
        if (this.state.powerUpTimers.shield) {
            clearTimeout(this.state.powerUpTimers.shield);
        }
        
        this.state.powerUpTimers.shield = setTimeout(() => {
            this.state.activePowerUps.shield = false;
            document.getElementById('shieldItem').classList.remove('active');
            document.getElementById('shieldIndicator').style.display = 'none';
        }, GAME_CONFIG.SHIELD_DURATION);
    }

    activateClear() {
        const smallFruits = this.fruits.filter(f => f.type.level <= 2 && f.isDropped);
        
        smallFruits.forEach(fruit => {
            const index = this.fruits.indexOf(fruit);
            if (index > -1) {
                this.fruits.splice(index, 1);
                this.state.score += fruit.type.score;
            }
        });
        
        this.state.setHighScore(this.state.score);
        this.updateUI();
    }

    clearAllPowerUpTimers() {
        if (this.state.powerUpTimers.slowDown) {
            clearTimeout(this.state.powerUpTimers.slowDown);
            this.state.powerUpTimers.slowDown = null;
        }
        if (this.state.powerUpTimers.shield) {
            clearTimeout(this.state.powerUpTimers.shield);
            this.state.powerUpTimers.shield = null;
        }
        
        this.state.activePowerUps.slowDown = false;
        this.state.activePowerUps.shield = false;
        
        document.getElementById('slowDownItem').classList.remove('active');
        document.getElementById('shieldItem').classList.remove('active');
        document.getElementById('shieldIndicator').style.display = 'none';
    }

    checkTopBoundary() {
        if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;
        
        let touchingTop = false;
        
        for (const fruit of this.fruits) {
            if (fruit.isDropped && fruit.checkTopBoundary()) {
                touchingTop = true;
                break;
            }
        }
        
        if (touchingTop && !this.state.activePowerUps.shield) {
            this.state.lives--;
            this.updateUI();
            
            if (this.state.lives <= 0) {
                this.gameOver();
            } else {
                this.clearFruitsAboveTop();
            }
        }
    }

    clearFruitsAboveTop() {
        const fruitsToRemove = this.fruits.filter(f => f.isDropped && f.y < 150);
        
        fruitsToRemove.forEach(fruit => {
            const index = this.fruits.indexOf(fruit);
            if (index > -1) {
                this.fruits.splice(index, 1);
            }
        });
    }

    gameOver() {
        this.state.gameOver = true;
        this.state.isPlaying = false;
        
        this.stopGameLoop();
        this.stopTimer();
        this.clearAllPowerUpTimers();
        
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('startBtn').style.display = 'block';
        
        document.getElementById('finalScore').textContent = this.state.score;
        document.getElementById('finalHighScore').textContent = this.state.highScore;
        document.getElementById('gameOverModal').style.display = 'flex';
        
        this.updateUI();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawDropArea();
        
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        
        this.fruits.forEach(fruit => fruit.draw(this.ctx));
        
        this.scorePopups.forEach(popup => popup.draw(this.ctx));
        
        if (this.currentFruit && !this.currentFruit.isDropped && this.isDragging) {
            this.drawDragLine();
        }
    }

    drawDropArea() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, GAME_CONFIG.DROP_AREA_HEIGHT);
        
        this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, GAME_CONFIG.DROP_AREA_HEIGHT);
        this.ctx.lineTo(this.canvas.width, GAME_CONFIG.DROP_AREA_HEIGHT);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawDragLine() {
        if (!this.currentFruit) return;
        
        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(this.currentFruit.x, this.currentFruit.y);
        this.ctx.lineTo(this.currentFruit.x, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    updateUI() {
        document.getElementById('score').textContent = this.state.score;
        document.getElementById('highScore').textContent = this.state.highScore;
        document.getElementById('time').textContent = this.state.time;
        document.getElementById('lives').textContent = this.state.lives;
        
        const timeElement = document.getElementById('time');
        if (this.state.time <= 10) {
            timeElement.style.color = '#e74c3c';
            timeElement.style.animation = 'pulse 0.5s ease-in-out infinite alternate';
        } else {
            timeElement.style.color = '';
            timeElement.style.animation = '';
        }
        
        const livesElement = document.getElementById('lives');
        if (this.state.lives <= 1) {
            livesElement.style.color = '#e74c3c';
        } else {
            livesElement.style.color = '';
        }
    }

    updatePowerUpUI() {
        document.getElementById('slowDownItem').querySelector('.power-up-count').textContent = 
            `x${this.state.powerUps.slowDown}`;
        document.getElementById('shieldItem').querySelector('.power-up-count').textContent = 
            `x${this.state.powerUps.shield}`;
        document.getElementById('clearItem').querySelector('.power-up-count').textContent = 
            `x${this.state.powerUps.clear}`;
    }

    showCombo() {
        const comboPanel = document.getElementById('comboPanel');
        document.getElementById('comboCount').textContent = this.state.combo;
        comboPanel.style.display = 'block';
    }

    hideCombo() {
        document.getElementById('comboPanel').style.display = 'none';
    }

    updateNextFruitPreview() {
        const preview = document.getElementById('nextFruitPreview');
        if (this.nextFruitType) {
            preview.style.backgroundColor = this.nextFruitType.color;
            preview.textContent = this.nextFruitType.name;
        }
    }

    switchTheme() {
        const body = document.body;
        
        body.classList.remove(THEMES[this.state.currentTheme]);
        
        this.state.currentTheme = (this.state.currentTheme + 1) % THEMES.length;
        
        if (this.state.currentTheme !== 0) {
            body.classList.add(THEMES[this.state.currentTheme]);
        }
        
        this.saveTheme();
    }

    saveTheme() {
        localStorage.setItem('watermelonMergeTheme', this.state.currentTheme.toString());
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('watermelonMergeTheme');
        if (savedTheme) {
            this.state.currentTheme = parseInt(savedTheme);
            const body = document.body;
            
            if (this.state.currentTheme !== 0) {
                body.classList.add(THEMES[this.state.currentTheme]);
            }
        }
    }

    showStartModal() {
        document.getElementById('startModal').style.display = 'flex';
    }
}

window.addEventListener('load', () => {
    new Game();
});

// EL HUESPED - Motor de Juego Sincronizado

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_STATES = {
    MAIN_MENU: 'MAIN_MENU',
    INTRO_TEXT: 'INTRO_TEXT',
    STREET_WALK: 'STREET_WALK',
    THREAT_DIALOG: 'THREAT_DIALOG',
    MANSION_PLAYING: 'MANSION_PLAYING',
    PUZZLE: 'PUZZLE',
    VICTORY_ENDING: 'VICTORY_ENDING'
};

let currentState = GAME_STATES.MAIN_MENU;
let threatStep = 0;
let victoryStep = 0;
let score = 0;
let lives = 3;
let timerInterval = null;
let puzzleTimeLeft = 20;

// INVENTARIO DE LLAVES DIVERSIFICADO
let inventory = {
    galleryKey: false,  // Obtenida en Biblioteca (Caja Bronce)
    kitchenKey: false,  // Obtenida en Galeria (Caja Hierro)
    bedroomKey: false,  // Obtenida en Cocina (Caja Plata)
    storageKey: false,  // Obtenida en Dormitorio (Caja Cobre)
    labKey: false,      // Obtenida en Almacen (Caja Acero)
    exitKey: false      // Obtenida en Laboratorio (Caja Oro)
};

// IA DEL ASESINO (Aparece a los 60s, radio de vista 140px)
let killerTimer = 60;
let killerActive = false;
let killerInterval = null;

// ASESINO CON MOVIMIENTO DE PATRULLAJE
const mansionEnemy = {
    x: 700,
    y: 200,
    width: 32,
    height: 32,
    speed: 1.5,
    patrolSpeed: 1.2,
    sightRadius: 140,
    isChasing: false,
    targetX: 600,
    targetY: 300,
    patrolTimer: 0
};

// EFECTOS CLIMATICOS DE LA CALLE
const rainDrops = Array.from({ length: 60 }, () => ({
    x: Math.random() * 800,
    y: Math.random() * 500,
    speed: 8 + Math.random() * 6,
    length: 12 + Math.random() * 8
}));

const lampPosts = [
    { x: 180, y: 260 },
    { x: 420, y: 260 },
    { x: 660, y: 260 }
];

let gameSettings = {
    volume: 50,
    brightness: 70,
    difficulty: 'NORMAL'
};

let currentRoom = 'room1';

const threatDialogs = [
    { speaker: "Desconocido", text: "Vaya, vaya... A donde crees que vas tan tarde por estas calles?" },
    { speaker: "Cultista", text: "El senor de la mansion necesita alguien para resolver sus cerrojos. Ven con nosotros." },
    { speaker: "Protagonista", text: "Dejenme en paz! Quienes son ustedes?" },
    { speaker: "Cultista", text: "No tienes eleccion. Te despertaremos dentro de la casa..." }
];

const victoryDialogs = [
    { speaker: "Protagonista", text: "El codigo 7391 funciono! La pesada puerta de hierro se abrio..." },
    { speaker: "Protagonista", text: "Corro libremente bajo la lluvia. Dejo atras la aterradora mansion y al culto." },
    { speaker: "Narrador", text: "FELICITACIONES! Has logrado escapar con vida de la mansion." }
];

const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    e: false
};

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k) || keys.hasOwnProperty(e.key)) {
        keys[k] = true;
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k) || keys.hasOwnProperty(e.key)) {
        keys[k] = false;
        keys[e.key] = false;
    }
});

// PROTAGONISTA
const player = {
    x: 80,
    y: 350,
    width: 32,
    height: 32,
    speed: 3,
    colorSkin: '#8D5524',
    colorShirt: '#111111',
    colorShorts: '#FF6B00',
    isHidden: false
};

const cultists = [
    { x: 550, y: 350, width: 32, height: 32 },
    { x: 600, y: 350, width: 32, height: 32 }
];

// MAPA EXPANDIDO DE 9 HABITACIONES CON CAJAS Y LLAVES
const rooms = {
    room1: {
        name: '1. Recibidor',
        furniture: [
            { id: 'armario_1', type: 'hideout', x: 100, y: 60, width: 60, height: 70, color: '#4A2810', label: 'Armario (Escondite)' },
            { id: 'estatua_1', type: 'decor', x: 600, y: 80, width: 40, height: 60, color: '#64748B', label: 'Estatua' }
        ],
        puzzles: [],
        doors: [
            { x: 740, y: 200, width: 20, height: 80, targetRoom: 'room2', targetX: 70, targetY: 200, label: 'Biblioteca', requiresKey: null, lockMessage: "" },
            { x: 360, y: 400, width: 80, height: 20, targetRoom: 'room4', targetX: 360, targetY: 80, label: 'Dormitorio', requiresKey: 'bedroomKey', lockMessage: "La puerta del Dormitorio esta cerrada con llave. Necesitas la Llave del Dormitorio (obtenida en la Cocina)." }
        ]
    },
    room2: {
        name: '2. Biblioteca',
        furniture: [
            { id: 'sofa_lib', type: 'hideout', x: 300, y: 300, width: 100, height: 50, color: '#1E3A8A', label: 'Sofa (Escondite)' },
            { id: 'estante_1', type: 'decor', x: 100, y: 60, width: 200, height: 40, color: '#451A03', label: 'Librero' }
        ],
        puzzles: [
            {
                id: 'caja_bronce',
                x: 600, y: 60, width: 50, height: 40, color: '#CD7F32',
                label: 'Caja Fuerte (Bronce)', solved: false, difficulty: 'Facil',
                question: 'Resuelve el acertijo: 18 + 24 = ?', answer: '42', rewardKey: 'galleryKey',
                rewardName: 'Llave de la Galeria',
                promptMessage: "Una caja fuerte de bronce pesada. Requiere un calculo aritmetico para abrirse."
            }
        ],
        doors: [
            { x: 40, y: 200, width: 20, height: 80, targetRoom: 'room1', targetX: 700, targetY: 200, label: 'Recibidor', requiresKey: null, lockMessage: "" },
            { x: 740, y: 200, width: 20, height: 80, targetRoom: 'room3', targetX: 70, targetY: 200, label: 'Galeria', requiresKey: 'galleryKey', lockMessage: "La puerta de la Galeria tiene un cerrojo pesado. Requieres la Llave de la Galeria (obtenida en la Biblioteca)." }
        ]
    },
    room3: {
        name: '3. Galeria de Arte',
        furniture: [
            { id: 'cuadro_big', type: 'decor', x: 250, y: 60, width: 120, height: 40, color: '#7E22CE', label: 'Obra Maestra' }
        ],
        puzzles: [
            {
                id: 'caja_hierro',
                x: 600, y: 300, width: 50, height: 40, color: '#475569',
                label: 'Caja Fuerte (Hierro)', solved: false, difficulty: 'Facil',
                question: 'Resuelve: 35 - 17 = ?', answer: '18', rewardKey: 'kitchenKey',
                rewardName: 'Llave de la Cocina',
                promptMessage: "Una caja de hierro oxidada detras del cuadro. Descifra la resta para desbloquearla."
            }
        ],
        doors: [
            { x: 40, y: 200, width: 20, height: 80, targetRoom: 'room2', targetX: 700, targetY: 200, label: 'Biblioteca', requiresKey: null, lockMessage: "" },
            { x: 360, y: 400, width: 80, height: 20, targetRoom: 'room6', targetX: 360, targetY: 80, label: 'Cocina', requiresKey: 'kitchenKey', lockMessage: "La puerta hacia la Cocina esta bloqueada. Necesitas la Llave de la Cocina (obtenida en la Galeria)." }
        ]
    },
    room4: {
        name: '4. Dormitorio Principal',
        furniture: [
            { id: 'ropero_dorm', type: 'hideout', x: 100, y: 60, width: 60, height: 70, color: '#4A2810', label: 'Ropero (Escondite)' },
            { id: 'cama_dorm', type: 'decor', x: 500, y: 60, width: 100, height: 80, color: '#1E1B4B', label: 'Cama' }
        ],
        puzzles: [
            {
                id: 'caja_cobre',
                x: 300, y: 60, width: 50, height: 40, color: '#B45309',
                label: 'Caja Fuerte (Cobre)', solved: false, difficulty: 'Intermedio',
                question: 'Ecuacion: 5x + 10 = 35. Cual es el valor de x?', answer: '5', rewardKey: 'storageKey',
                rewardName: 'Llave del Almacen',
                promptMessage: "Una caja de cobre oculta en la cabecera. Requiere resolver la ecuacion de primer grado."
            }
        ],
        doors: [
            { x: 360, y: 40, width: 80, height: 20, targetRoom: 'room1', targetX: 360, targetY: 350, label: 'Recibidor', requiresKey: null, lockMessage: "" },
            { x: 740, y: 200, width: 20, height: 80, targetRoom: 'room5', targetX: 70, targetY: 200, label: 'Pasillo', requiresKey: null, lockMessage: "" }
        ]
    },
    room5: {
        name: '5. Pasillo Central',
        furniture: [
            { id: 'planta_pas', type: 'decor', x: 100, y: 60, width: 40, height: 40, color: '#065F46', label: 'Planta' }
        ],
        puzzles: [],
        doors: [
            { x: 40, y: 200, width: 20, height: 80, targetRoom: 'room4', targetX: 700, targetY: 200, label: 'Dormitorio', requiresKey: null, lockMessage: "" },
            { x: 740, y: 200, width: 20, height: 80, targetRoom: 'room6', targetX: 70, targetY: 200, label: 'Cocina', requiresKey: null, lockMessage: "" },
            { x: 360, y: 400, width: 80, height: 20, targetRoom: 'room8', targetX: 360, targetY: 80, label: 'Almacen', requiresKey: 'storageKey', lockMessage: "El acceso al Almacen esta sellado. Se requiere la Llave del Almacen (obtenida en el Dormitorio)." }
        ]
    },
    room6: {
        name: '6. Cocina',
        furniture: [
            { id: 'alacena_coc', type: 'hideout', x: 600, y: 60, width: 60, height: 70, color: '#4A2810', label: 'Alacena (Escondite)' },
            { id: 'mesa_coc', type: 'decor', x: 300, y: 200, width: 140, height: 70, color: '#78350F', label: 'Mesa' }
        ],
        puzzles: [
            {
                id: 'caja_plata',
                x: 100, y: 60, width: 50, height: 40, color: '#C0C0C0',
                label: 'Caja Fuerte (Plata)', solved: false, difficulty: 'Intermedio',
                question: 'Resuelve la ecuacion: 2x - 4 = 20. Cuanto vale x?', answer: '12', rewardKey: 'bedroomKey',
                rewardName: 'Llave del Dormitorio',
                promptMessage: "Una pequena caja fuerte de plata en la alacena. Resuelve x para obtener la llave."
            }
        ],
        doors: [
            { x: 40, y: 200, width: 20, height: 80, targetRoom: 'room5', targetX: 700, targetY: 200, label: 'Pasillo', requiresKey: null, lockMessage: "" },
            { x: 360, y: 40, width: 80, height: 20, targetRoom: 'room3', targetX: 360, targetY: 350, label: 'Galeria', requiresKey: null, lockMessage: "" },
            { x: 360, y: 400, width: 80, height: 20, targetRoom: 'room9', targetX: 360, targetY: 80, label: 'Salida', requiresKey: null, lockMessage: "" }
        ]
    },
    room7: {
        name: '7. Laboratorio',
        furniture: [
            { id: 'mesa_lab', type: 'decor', x: 200, y: 200, width: 180, height: 60, color: '#0284C7', label: 'Mesa de Quimicos' }
        ],
        puzzles: [
            {
                id: 'caja_oro',
                x: 600, y: 60, width: 50, height: 40, color: '#FFD700',
                label: 'Caja Fuerte (Oro)', solved: false, difficulty: 'Dificil',
                question: 'Si 3x + 5 = 20, cuanto es 2x? (Pista: Pide el Codigo de Escape = 7391)', answer: '10', rewardKey: 'exitKey',
                rewardName: 'Llave de la Salida',
                promptMessage: "Caja fuerte de oro macizo. Resuelve el sistema para obtener la Llave de la Salida y la clave secreta."
            }
        ],
        doors: [
            { x: 740, y: 200, width: 20, height: 80, targetRoom: 'room8', targetX: 70, targetY: 200, label: 'Almacen', requiresKey: null, lockMessage: "" }
        ]
    },
    room8: {
        name: '8. Almacen',
        furniture: [
            { id: 'caja_alm', type: 'hideout', x: 100, y: 300, width: 80, height: 60, color: '#78350F', label: 'Caja Grande (Escondite)' }
        ],
        puzzles: [
            {
                id: 'caja_acero',
                x: 600, y: 300, width: 50, height: 40, color: '#94A3B8',
                label: 'Caja Fuerte (Acero)', solved: false, difficulty: 'Intermedio',
                question: 'Completa la serie logica: 2, 4, 8, 16, ?', answer: '32', rewardKey: 'labKey',
                rewardName: 'Llave del Laboratorio',
                promptMessage: "Una caja blindada de acero. Descubre el siguiente numero de la secuencia."
            }
        ],
        doors: [
            { x: 40, y: 200, width: 20, height: 80, targetRoom: 'room7', targetX: 700, targetY: 200, label: 'Laboratorio', requiresKey: 'labKey', lockMessage: "La compuerta del Laboratorio exige la Llave del Laboratorio (obtenida en el Almacen)." },
            { x: 360, y: 40, width: 80, height: 20, targetRoom: 'room5', targetX: 360, targetY: 350, label: 'Pasillo', requiresKey: null, lockMessage: "" }
        ]
    },
    room9: {
        name: '9. Salida Final',
        furniture: [
            { id: 'puerta_escape', type: 'decor', x: 350, y: 60, width: 100, height: 30, color: '#10B981', label: 'PUERTA BLINDADA' }
        ],
        puzzles: [
            {
                id: 'cerrojo_final',
                x: 375, y: 100, width: 50, height: 40, color: '#EF4444',
                label: 'Cerrojo Electronico', solved: false, difficulty: 'Escape Final',
                question: 'Ingresa el CODIGO SECRETO de 4 digitos anotado en el Laboratorio:', answer: '7391', isFinalPuzzle: true,
                promptMessage: "Cerrojo digital de la puerta principal. Requiere la Llave de la Salida y la Clave Secreta."
            }
        ],
        doors: [
            { x: 360, y: 400, width: 80, height: 20, targetRoom: 'room6', targetX: 360, targetY: 80, label: 'Cocina', requiresKey: null, lockMessage: "" }
        ]
    }
};

let activeInteractable = null;

// MOSTRAR DIALOGO INFERIOR
function showBottomMessage(speaker, text) {
    document.getElementById('bottom-message-speaker').textContent = speaker + ":";
    document.getElementById('bottom-message-text').textContent = text;
}

// ESCENA DE LA CALLE
function drawCityScene() {
    ctx.fillStyle = '#0F0B1E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#180E29';
    ctx.fillRect(30, 80, 100, 420);
    ctx.fillRect(150, 50, 120, 450);
    ctx.fillRect(290, 90, 140, 410);
    ctx.fillRect(450, 40, 110, 460);
    ctx.fillRect(580, 70, 150, 430);

    ctx.fillStyle = '#F59E0B';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(170 + (i % 2) * 40, 80 + Math.floor(i / 2) * 50, 20, 20);
        ctx.fillRect(470 + (i % 2) * 40, 70 + Math.floor(i / 2) * 50, 20, 20);
    }

    ctx.fillStyle = '#080410';
    ctx.fillRect(0, 380, canvas.width, 120);

    ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
    ctx.beginPath(); ctx.ellipse(200, 430, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(520, 440, 80, 14, 0, 0, Math.PI * 2); ctx.fill();

    for (let lamp of lampPosts) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(lamp.x, lamp.y, 8, 120);
        ctx.fillRect(lamp.x - 10, lamp.y, 28, 8);

        const grad = ctx.createRadialGradient(lamp.x + 4, lamp.y + 8, 5, lamp.x + 4, lamp.y + 8, 90);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(lamp.x + 4, lamp.y + 8);
        ctx.lineTo(lamp.x - 50, lamp.y + 120);
        ctx.lineTo(lamp.x + 58, lamp.y + 120);
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = 1.5;
    for (let drop of rainDrops) {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.5;
        if (drop.y > 500) {
            drop.y = -10;
            drop.x = Math.random() * 800;
        }
    }

    if (currentState !== GAME_STATES.VICTORY_ENDING) {
        for (let cultist of cultists) {
            ctx.fillStyle = '#4C1D95';
            ctx.fillRect(cultist.x, cultist.y, cultist.width, cultist.height);
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(cultist.x + 8, cultist.y + 8, 4, 4);
            ctx.fillRect(cultist.x + 18, cultist.y + 8, 4, 4);
        }
    }

    drawPlayer();
}

function drawPlayer() {
    if (player.isHidden) return;

    ctx.fillStyle = player.colorSkin;
    ctx.fillRect(player.x + 8, player.y, 16, 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(player.x + 8, player.y, 16, 4);
    ctx.fillStyle = player.colorShirt;
    ctx.fillRect(player.x + 6, player.y + 12, 20, 12);
    ctx.fillStyle = player.colorShorts;
    ctx.fillRect(player.x + 8, player.y + 24, 16, 8);
}

function gameLoop() {
    if (currentState === GAME_STATES.MAIN_MENU) {
        // Menu principal
    } else if (currentState === GAME_STATES.INTRO_TEXT || currentState === GAME_STATES.STREET_WALK || currentState === GAME_STATES.THREAT_DIALOG || currentState === GAME_STATES.VICTORY_ENDING) {
        if (currentState === GAME_STATES.STREET_WALK) updateStreetWalk();
        drawCityScene();
    } else {
        updateMansion();
        renderMansion();
    }
    requestAnimationFrame(gameLoop);
}

// EVENTOS DE INTERFAZ
document.getElementById('btn-start-game').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('story-overlay').classList.remove('hidden');
    currentState = GAME_STATES.INTRO_TEXT;
});

document.getElementById('btn-open-settings-main').addEventListener('click', openSettings);
document.getElementById('btn-in-game-settings').addEventListener('click', openSettings);

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

document.getElementById('btn-menu-back').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('ui-overlay').classList.add('hidden');
    currentState = GAME_STATES.MAIN_MENU;
});

document.getElementById('btn-settings-continue').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
});

document.getElementById('slider-volume').addEventListener('input', (e) => {
    gameSettings.volume = e.target.value;
    document.getElementById('val-volume').textContent = e.target.value + '%';
});

document.getElementById('slider-brightness').addEventListener('input', (e) => {
    gameSettings.brightness = e.target.value;
    document.getElementById('val-brightness').textContent = e.target.value + '%';
    document.getElementById('game-container').style.filter = `brightness(${e.target.value}%)`;
});

document.querySelectorAll('.btn-diff').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        gameSettings.difficulty = e.target.getAttribute('data-diff');
    });
});

function updateStreetWalk() {
    let dx = 0;
    if (keys.a || keys.ArrowLeft) dx -= player.speed;
    if (keys.d || keys.ArrowRight) dx += player.speed;

    const newX = player.x + dx;
    if (newX >= 10 && newX <= canvas.width - player.width) player.x = newX;

    if (player.x > 450) {
        currentState = GAME_STATES.THREAT_DIALOG;
        threatStep = 0;
        showThreatDialog();
    }
}

function showThreatDialog() {
    const overlay = document.getElementById('story-overlay');
    const speaker = document.getElementById('speaker-name');
    const text = document.getElementById('story-text');

    overlay.classList.remove('hidden');
    speaker.textContent = threatDialogs[threatStep].speaker;
    text.textContent = threatDialogs[threatStep].text;
}

document.getElementById('btn-next-story').addEventListener('click', () => {
    if (currentState === GAME_STATES.INTRO_TEXT) {
        document.getElementById('story-overlay').classList.add('hidden');
        currentState = GAME_STATES.STREET_WALK;
    } else if (currentState === GAME_STATES.THREAT_DIALOG) {
        threatStep++;
        if (threatStep < threatDialogs.length) {
            showThreatDialog();
        } else {
            document.getElementById('story-overlay').classList.add('hidden');
            document.getElementById('ui-overlay').classList.remove('hidden');
            startMansionGame();
        }
    } else if (currentState === GAME_STATES.VICTORY_ENDING) {
        victoryStep++;
        if (victoryStep < victoryDialogs.length) {
            showVictoryDialog();
        } else {
            alert("Felicidades por completar El Huesped!");
            location.reload();
        }
    }
});

function startMansionGame() {
    player.x = 80;
    player.y = 220;
    currentRoom = 'room1';
    currentState = GAME_STATES.MANSION_PLAYING;

    showBottomMessage("SISTEMA", "Explora las habitaciones. Resuelve las cajas fuertes para obtener llaves.");

    killerTimer = 60;
    killerActive = false;
    document.getElementById('killer-timer').textContent = killerTimer + 's';

    if (killerInterval) clearInterval(killerInterval);
    killerInterval = setInterval(() => {
        if (currentState === GAME_STATES.MANSION_PLAYING) {
            killerTimer--;
            if (killerTimer <= 0) {
                killerActive = true;
                document.getElementById('killer-timer').textContent = "CUIDADO!";
            } else {
                document.getElementById('killer-timer').textContent = killerTimer + 's';
            }
        }
    }, 1000);
}

// LOGICA DE LA MANSION
function updateMansion() {
    if (currentState !== GAME_STATES.MANSION_PLAYING) return;

    const room = rooms[currentRoom];

    // Movimiento Jugador
    if (!player.isHidden) {
        let dx = 0, dy = 0;
        if (keys.w || keys.ArrowUp) dy -= player.speed;
        if (keys.s || keys.ArrowDown) dy += player.speed;
        if (keys.a || keys.ArrowLeft) dx -= player.speed;
        if (keys.d || keys.ArrowRight) dx += player.speed;

        const newX = player.x + dx;
        const newY = player.y + dy;

        if (newX > 40 && newX < canvas.width - 40 - player.width) player.x = newX;
        if (newY > 40 && newY < canvas.height - 40 - player.height) player.y = newY;
    }

    // IA DEL ASESINO (Deteccion y Patrullaje)
    if (killerActive) {
        if (player.isHidden) {
            mansionEnemy.isChasing = false;
        } else {
            const distToPlayer = Math.hypot((player.x + 16) - (mansionEnemy.x + 16), (player.y + 16) - (mansionEnemy.y + 16));
            if (distToPlayer <= mansionEnemy.sightRadius) {
                mansionEnemy.isChasing = true;
            } else {
                mansionEnemy.isChasing = false;
            }
        }

        if (mansionEnemy.isChasing && !player.isHidden) {
            // Persecucion directa al jugador
            const angle = Math.atan2((player.y) - mansionEnemy.y, (player.x) - mansionEnemy.x);
            mansionEnemy.x += Math.cos(angle) * mansionEnemy.speed;
            mansionEnemy.y += Math.sin(angle) * mansionEnemy.speed;

            const currentDist = Math.hypot((player.x + 16) - (mansionEnemy.x + 16), (player.y + 16) - (mansionEnemy.y + 16));
            if (currentDist < 30) {
                handleWrongAnswer("El asesino te atrapó!");
                player.x = 80;
                player.y = 220;
            }
        } else {
            // Patrullaje continuo caminando por todo el escenario
            mansionEnemy.patrolTimer--;
            if (mansionEnemy.patrolTimer <= 0) {
                // Selecciona un nuevo destino aleatorio dentro de la habitacion cada cierto tiempo
                mansionEnemy.targetX = 60 + Math.random() * (canvas.width - 120);
                mansionEnemy.targetY = 60 + Math.random() * (canvas.height - 120);
                mansionEnemy.patrolTimer = 120 + Math.floor(Math.random() * 100);
            }

            const distToTarget = Math.hypot(mansionEnemy.targetX - mansionEnemy.x, mansionEnemy.targetY - mansionEnemy.y);
            if (distToTarget > 5) {
                const angle = Math.atan2(mansionEnemy.targetY - mansionEnemy.y, mansionEnemy.targetX - mansionEnemy.x);
                mansionEnemy.x += Math.cos(angle) * mansionEnemy.patrolSpeed;
                mansionEnemy.y += Math.sin(angle) * mansionEnemy.patrolSpeed;
            }
        }
    }

    // Comprobacion de Puertas
    for (let door of room.doors) {
        if (Math.hypot((player.x + 16) - (door.x + door.width / 2), (player.y + 16) - (door.y + door.height / 2)) < 40) {
            if (door.requiresKey && !inventory[door.requiresKey]) {
                showBottomMessage("PUERTA BLOQUEADA", door.lockMessage);
                player.x -= (player.x < door.x) ? 10 : -10;
                player.y -= (player.y < door.y) ? 10 : -10;
                return;
            }
            currentRoom = door.targetRoom;
            player.x = door.targetX;
            player.y = door.targetY;
            document.getElementById('room-name').textContent = rooms[currentRoom].name;
            showBottomMessage("PROTAGONISTA", "Has entrado a: " + rooms[currentRoom].name);
            return;
        }
    }

    // Interacciones (Cajas Fuertes y Escondites)
    activeInteractable = null;
    const promptEl = document.getElementById('interaction-prompt');

    for (let furn of room.furniture) {
        if (furn.type !== 'hideout') continue;
        const dist = Math.hypot((player.x + 16) - (furn.x + furn.width / 2), (player.y + 16) - (furn.y + furn.height / 2));
        if (dist < 50) {
            activeInteractable = { type: 'hideout', item: furn };
            showBottomMessage("SISTEMA", "Puedes ocultarte aqui para mecapar del asesino.");
            break;
        }
    }

    if (!activeInteractable) {
        for (let pz of room.puzzles) {
            if (pz.solved) continue;
            const dist = Math.hypot((player.x + 16) - (pz.x + pz.width / 2), (player.y + 16) - (pz.y + pz.height / 2));
            if (dist < 50) {
                if (pz.isFinalPuzzle && !inventory.exitKey) {
                    showBottomMessage("CERROJO FINAL", "Esta puerta blindada requiere la Llave de la Salida (del Laboratorio) para activar la terminal digital.");
                    return;
                }
                activeInteractable = { type: 'puzzle', item: pz };
                showBottomMessage("OBJETO", pz.promptMessage);
                break;
            }
        }
    }

    if (activeInteractable) {
        promptEl.classList.remove('hidden');
        if (keys.e) {
            keys.e = false;
            if (activeInteractable.type === 'hideout') {
                player.isHidden = !player.isHidden;
                if (player.isHidden) {
                    mansionEnemy.isChasing = false;
                    showBottomMessage("PROTAGONISTA", "Te has escondido. Mantente en silencio...");
                } else {
                    showBottomMessage("PROTAGONISTA", "Saliste del escondite.");
                }
            } else if (activeInteractable.type === 'puzzle') {
                openPuzzleModal(activeInteractable.item);
            }
        }
    } else {
        promptEl.classList.add('hidden');
    }
}

function renderMansion() {
    const room = rooms[currentRoom];

    ctx.fillStyle = '#0B0618';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1D1035';
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillRect(0, 0, 40, canvas.height);
    ctx.fillRect(canvas.width - 40, 0, 40, canvas.height);
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    for (let door of room.doors) {
        ctx.fillStyle = door.requiresKey ? '#DC2626' : '#D97706';
        ctx.fillRect(door.x, door.y, door.width, door.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Courier New';
        ctx.fillText(door.label, door.x - 15, door.y - 5);
    }

    for (let furn of room.furniture) {
        ctx.fillStyle = furn.color;
        ctx.fillRect(furn.x, furn.y, furn.width, furn.height);
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '10px Courier New';
        ctx.fillText(furn.label, furn.x, furn.y - 5);
    }

    for (let pz of room.puzzles) {
        ctx.fillStyle = pz.solved ? '#10B981' : pz.color;
        ctx.fillRect(pz.x, pz.y, pz.width, pz.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Courier New';
        ctx.fillText(pz.label, pz.x - 10, pz.y - 5);
    }

    if (killerActive) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(mansionEnemy.x + 16, mansionEnemy.y + 16, mansionEnemy.sightRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#991B1B';
        ctx.fillRect(mansionEnemy.x, mansionEnemy.y, mansionEnemy.width, mansionEnemy.height);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(mansionEnemy.x + 8, mansionEnemy.y + 8, 4, 4);
        ctx.fillRect(mansionEnemy.x + 18, mansionEnemy.y + 8, 4, 4);
    }

    drawPlayer();
}

function openPuzzleModal(item) {
    currentState = GAME_STATES.PUZZLE;
    const modal = document.getElementById('puzzle-modal');
    document.getElementById('puzzle-title').textContent = item.isFinalPuzzle ? 'ESCAPE FINAL DE LA MANSIO' : 'CAJA FUERTE DE SEGURIDAD';
    document.getElementById('puzzle-difficulty').textContent = 'Nivel: ' + item.difficulty;
    document.getElementById('puzzle-question').textContent = item.question;
    document.getElementById('puzzle-answer').value = '';
    document.getElementById('puzzle-feedback').textContent = '';
    modal.classList.remove('hidden');

    puzzleTimeLeft = gameSettings.difficulty === 'FACIL' ? 30 : (gameSettings.difficulty === 'DIFICIL' ? 12 : 20);

    document.getElementById('timer-count').textContent = puzzleTimeLeft;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        puzzleTimeLeft--;
        document.getElementById('timer-count').textContent = puzzleTimeLeft;
        if (puzzleTimeLeft <= 0) {
            clearInterval(timerInterval);
            handleWrongAnswer("Se agoto el tiempo!");
        }
    }, 1000);
}

document.getElementById('puzzle-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeInteractable || activeInteractable.type !== 'puzzle') return;

    const pz = activeInteractable.item;
    const ans = document.getElementById('puzzle-answer').value.trim();
    if (ans === pz.answer) {
        clearInterval(timerInterval);
        score += 300;
        document.getElementById('score-display').textContent = score;
        pz.solved = true;

        if (pz.rewardKey) {
            inventory[pz.rewardKey] = true;
            updateInventoryDisplay();
            showBottomMessage("CONSEGUIDO!", "Has obtenido: " + pz.rewardName);
        }

        document.getElementById('puzzle-feedback').style.color = '#10B981';
        document.getElementById('puzzle-feedback').textContent = pz.isFinalPuzzle ? "CODIGO CORRECTO! DESBLOQUEANDO..." : "Resuelto! Clave aceptada.";

        setTimeout(() => {
            document.getElementById('puzzle-modal').classList.add('hidden');
            if (pz.isFinalPuzzle) {
                triggerVictorySequence();
            } else {
                currentState = GAME_STATES.MANSION_PLAYING;
            }
        }, 1200);
    } else {
        handleWrongAnswer("Respuesta incorrecta");
    }
});

function triggerVictorySequence() {
    clearInterval(killerInterval);
    document.getElementById('ui-overlay').classList.add('hidden');
    currentState = GAME_STATES.VICTORY_ENDING;
    victoryStep = 0;
    player.x = 200;
    player.y = 350;
    showVictoryDialog();
}

function showVictoryDialog() {
    const overlay = document.getElementById('story-overlay');
    const speaker = document.getElementById('speaker-name');
    const text = document.getElementById('story-text');

    overlay.classList.remove('hidden');
    speaker.textContent = victoryDialogs[victoryStep].speaker;
    text.textContent = victoryDialogs[victoryStep].text;
}

function updateInventoryDisplay() {
    let text = [];
    if (inventory.galleryKey) text.push('🔑 Galeria');
    if (inventory.kitchenKey) text.push('🔑 Cocina');
    if (inventory.bedroomKey) text.push('🔑 Dormitorio');
    if (inventory.storageKey) text.push('🔑 Almacen');
    if (inventory.labKey) text.push('🔑 Laboratorio');
    if (inventory.exitKey) text.push('🔑 Salida');
    document.getElementById('keys-display').textContent = text.join(' | ') || 'Ninguna';
}

function handleWrongAnswer(msg) {
    lives--;
    let h = '';
    for (let i = 0; i < lives; i++) h += '❤';
    document.getElementById('lives-display').textContent = h || '💀';
    document.getElementById('puzzle-feedback').style.color = '#EF4444';
    document.getElementById('puzzle-feedback').textContent = msg;

    if (lives <= 0) {
        clearInterval(timerInterval);
        alert("Has sido atrapado por el enemigo. Reiniciando juego...");
        location.reload();
    }
}

gameLoop();
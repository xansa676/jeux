// --- Configuration des personnages ---
const CHARACTERS = {
    elf: {
        name: "Elf",
        emoji: "🧝‍♂️",
        basePV: 120,
        baseStamina: 100,
        attacks: {
            light: { damage: 15, staminaCost: 5, missChance: 0.1, name: "Quick Slash" },
            heavy: { damage: 30, staminaCost: 15, missChance: 0.3, name: "Power Strike" },
            special: { damage: 50, staminaCost: 40, missChance: 0.05, name: "Arcane Arrow" }
        },
        blockReduction: 0.6
    },
    orc: {
        name: "Orc",
        emoji: "👹",
        basePV: 150,
        baseStamina: 80,
        attacks: {
            light: { damage: 20, staminaCost: 8, missChance: 0.15, name: "Brutal Jab" },
            heavy: { damage: 40, staminaCost: 20, missChance: 0.35, name: "Smashing Blow" },
            special: { damage: 60, staminaCost: 50, missChance: 0.1, name: "Ground Pound" }
        },
        blockReduction: 0.7
    }
};

// --- Variables globales ---
let player = {}, enemy = {};
let isBlocking = false, isPlayerTurn = true;
let comboHits = 0, lastHitTime = 0;
let playerRounds = 0, enemyRounds = 0;
const maxRounds = 3;
const MAX_COMBO_TIME = 1000;

// --- Références DOM ---
const charSelectionDiv = document.getElementById('character-selection');
const gameContainerDiv = document.getElementById('game-container');
const playerNameSpan = document.getElementById('playerName');
const playerHP = document.getElementById('playerHP');
const playerMaxHP = document.getElementById('playerMaxHP');
const playerStamina = document.getElementById('playerStamina');
const enemyNameSpan = document.getElementById('enemyName');
const enemyHP = document.getElementById('enemyHP');
const enemyMaxHP = document.getElementById('enemyMaxHP');
const enemyStamina = document.getElementById('enemyStamina');
const playerSprite = document.getElementById('playerSprite');
const enemySprite = document.getElementById('enemySprite');
const messageText = document.getElementById('messageText');
const comboText = document.getElementById('comboText');
const comboDamage = document.getElementById('comboDamage');
const comboDisplay = document.getElementById('comboDisplay');

// --- Boutons ---
const lightBtn = document.getElementById('lightPunch');
const heavyBtn = document.getElementById('rightPunch');
const kickBtn = document.getElementById('leftKick');
const specialBtn = document.getElementById('specialBtn');
const blockBtn = document.getElementById('blockBtn');
const dashBtn = document.getElementById('dashBtn');

// --- Initialisation ---
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => selectCharacter(card.dataset.char));
});

function selectCharacter(charType) {
    player = { ...CHARACTERS[charType], currentPV: CHARACTERS[charType].basePV, currentStamina: CHARACTERS[charType].baseStamina };

    // Choisir un adversaire aléatoire différent du joueur
    const charKeys = Object.keys(CHARACTERS).filter(key => key !== charType);
    const enemyCharType = charKeys[Math.floor(Math.random() * charKeys.length)];
    enemy = { ...CHARACTERS[enemyCharType], currentPV: CHARACTERS[enemyCharType].basePV, currentStamina: CHARACTERS[enemyCharType].baseStamina };

    playerNameSpan.textContent = player.name;
    enemyNameSpan.textContent = enemy.name;
    playerSprite.textContent = player.emoji;
    enemySprite.textContent = enemy.emoji;
    playerMaxHP.textContent = player.basePV;
    enemyMaxHP.textContent = enemy.basePV;

    playerRounds = 0;
    enemyRounds = 0;

    charSelectionDiv.classList.add('hidden');
    gameContainerDiv.classList.remove('hidden');
    updateUI();
    showMessage(`Un ${enemy.name} sauvage apparait ! Prépare-toi au combat !`);
}

// --- Gestion des boutons ---
lightBtn.addEventListener('click', () => playerAction('light'));
heavyBtn.addEventListener('click', () => playerAction('heavy'));
kickBtn.addEventListener('click', () => playerAction('heavy'));
specialBtn.addEventListener('click', () => playerAction('special'));
blockBtn.addEventListener('mousedown', startBlock);
blockBtn.addEventListener('mouseup', endBlock);
blockBtn.addEventListener('mouseleave', endBlock);

// --- Fonctions principales ---

async function playerAction(type) {
    if (!isPlayerTurn || player.currentPV <= 0 || enemy.currentPV <= 0) return;
    const attack = player.attacks[type];
    if (player.currentStamina < attack.staminaCost) {
        showMessage("Pas assez d'endurance !");
        return;
    }

    isPlayerTurn = false;
    isBlocking = false;
    player.currentStamina -= attack.staminaCost;
    animate(playerSprite, 'attacking');
    await delay(300);

    const now = Date.now();
    const isMiss = Math.random() < attack.missChance;

    if (isMiss) {
        showMessage(`${attack.name} raté !`);
        comboHits = 0;
    } else {
        const dmg = applyDamageToEnemy(attack);
        if (now - lastHitTime < MAX_COMBO_TIME) comboHits++;
        else comboHits = 1;
        showCombo(comboHits, dmg);
        lastHitTime = now;
    }

    updateUI();
    await delay(500);
    checkGameEnd();
    if (enemy.currentPV > 0) await enemyTurn();
    isPlayerTurn = true;
    updateUI();
}

function applyDamageToEnemy(attack) {
    let dmg = attack.damage;
    const blocked = Math.random() < 0.3;
    if (blocked) {
        dmg *= 1 - enemy.blockReduction;
        animate(enemySprite, 'blocking');
    } else animate(enemySprite, 'hit');
    enemy.currentPV -= dmg;
    if (enemy.currentPV < 0) enemy.currentPV = 0;
    return Math.round(dmg);
}

async function enemyTurn() {
    showMessage("Tour de l'ennemi...");
    await delay(600);
    const types = ['light', 'heavy'];
    const type = types[Math.floor(Math.random() * types.length)];
    const atk = enemy.attacks[type];
    if (enemy.currentStamina < atk.staminaCost) {
        enemy.currentStamina += 10;
        if (enemy.currentStamina > enemy.baseStamina) enemy.currentStamina = enemy.baseStamina;
        return;
    }
    enemy.currentStamina -= atk.staminaCost;
    animate(enemySprite, 'attacking');
    await delay(300);

    const miss = Math.random() < atk.missChance;
    if (miss) {
        showMessage(`${enemy.name} rate son ${atk.name} !`);
    } else {
        let dmg = atk.damage;
        if (isBlocking) {
            dmg *= 1 - player.blockReduction;
            animate(playerSprite, 'blocking');
        } else animate(playerSprite, 'hit');
        player.currentPV -= dmg;
        if (player.currentPV < 0) player.currentPV = 0;
        showMessage(`${enemy.name} inflige ${Math.round(dmg)} dmg !`);
    }
    updateUI();
}

function startBlock() {
    if (!isPlayerTurn) return;
    isBlocking = true;
    blockBtn.classList.add('active');
    showMessage("Blocage activé !");
}

function endBlock() {
    isBlocking = false;
    blockBtn.classList.remove('active');
    showMessage("Blocage terminé.");
}

function checkGameEnd() {
    if (player.currentPV <= 0) {
        enemyRounds++;
        if (enemyRounds >= maxRounds) showMessage(`${enemy.name} remporte le combat !`);
        else showMessage(`Round perdu... (${enemyRounds}/${maxRounds})`);
        resetRound();
    } else if (enemy.currentPV <= 0) {
        playerRounds++;
        if (playerRounds >= maxRounds) showMessage(`Victoire finale ! ${player.name} triomphe !`);
        else showMessage(`Round gagné ! (${playerRounds}/${maxRounds})`);
        resetRound();
    }
}

function resetRound() {
    setTimeout(() => {
        player.currentPV = player.basePV;
        player.currentStamina = player.baseStamina;
        enemy.currentPV = enemy.basePV;
        enemy.currentStamina = enemy.baseStamina;
        updateUI();
        showMessage("Nouveau round, prêt ?!");
        isPlayerTurn = true;
    }, 2000);
}

// --- UI ---
function updateUI() {
    playerHP.textContent = Math.max(0, Math.round(player.currentPV));
    playerStamina.style.width = `${(player.currentStamina / player.baseStamina) * 100}%`;
    enemyHP.textContent = Math.max(0, Math.round(enemy.currentPV));
    enemyStamina.style.width = `${(enemy.currentStamina / enemy.baseStamina) * 100}%`;
    specialBtn.disabled = player.currentStamina < player.attacks.special.staminaCost;
}

function showMessage(txt) {
    messageText.textContent = txt;
}

function animate(element, className) {
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 400);
}

function showCombo(hits, dmg) {
    comboText.textContent = `${hits} HIT COMBO!`;
    comboDamage.textContent = `-${dmg} DMG`;
    comboDisplay.style.opacity = 1;
    setTimeout(() => comboDisplay.style.opacity = 0, 1200);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

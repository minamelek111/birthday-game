const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ==========================================================
// GERÇEK TAM EKRAN
// ==========================================================

async function enterFullscreen() {

    const gameContainer =
        document.getElementById("game-container");

    if (!document.fullscreenElement) {

        try {

            if (gameContainer.requestFullscreen) {

                await gameContainer.requestFullscreen();

            } else if (gameContainer.webkitRequestFullscreen) {

                // iOS / Safari için
                await gameContainer.webkitRequestFullscreen();

            }

        } catch (error) {

            console.log(
                "Fullscreen kullanılamadı:",
                error
            );
        }
    }

    // Mobil tarayıcıda ekran yönünü mümkünse landscape tut.
    try {

        if (
            screen.orientation &&
            screen.orientation.lock
        ) {
            await screen.orientation.lock("landscape");
        }

    } catch (error) {

        // Her tarayıcı orientation lock desteklemiyor.
    }

    resizeGame();
}

// ==========================================================
// SABİT OYUN CANVAS'I
// ==========================================================

const BASE_WIDTH = 320;
const BASE_HEIGHT = 240;

let GAME_WIDTH = BASE_WIDTH;
let GAME_HEIGHT = BASE_HEIGHT;

function resizeGame() {

    // Oyun mantıksal olarak her zaman 320x240.
    // Ekrana sığdırmayı style.css yapıyor.
    GAME_WIDTH = BASE_WIDTH;
    GAME_HEIGHT = BASE_HEIGHT;

    canvas.width = BASE_WIDTH * 2;
    canvas.height = BASE_HEIGHT * 2;

    // CSS boyutunu JS ile değiştirmiyoruz.
    // style.css'deki #viewport 4:3 oranını koruyacak.
    canvas.style.width = "";
    canvas.style.height = "";

    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resizeGame);

window.addEventListener("orientationchange", () => {
    setTimeout(resizeGame, 100);
});

resizeGame();

// ---- BAŞLANGIÇ EKRANI ----
// Oyun, kullanıcı "Başla" butonuna basana kadar duraklatılmış kalır.
// Bu sayede sesler de (autoplay kısıtlaması nedeniyle) ilk kullanıcı
// etkileşiminden sonra sorunsuz çalışır.
let gameStarted = false;

let player = {
    x: 145,
    y: 165,
    width: 16,
    height: 20,
    speed: 2,
    direction: "down",
    walking: false,
    onBunk: false
};

const memoryFrame = {
    x: 108,
    y: 21,
    width: 72,
    height: 40,
    interactionDistance: 36
};

const memoryVideo = document.createElement("video");
memoryVideo.src = "assets/memories.mp4";
memoryVideo.loop = true;
memoryVideo.muted = false;
memoryVideo.playsInline = true;
memoryVideo.preload = "auto";

// ---- SES EFEKTLERİ ----
// Bu iki dosyayı assets/ klasörüne kendin eklemen gerekiyor:
// assets/footstep.mp3  ve  assets/interact.mp3
const footstepSound = new Audio("assets/footstep.mp3");
footstepSound.volume = 0.4;

const interactSound = new Audio("assets/interact.mp3");
interactSound.volume = 0.25;

let lastFootstepTime = 0;

// ---- RANZA TIRMANMA ----
const bunkLadderPoint = { x: 90, y: 150, interactionDistance: 30 };

const bunkTopBounds = { minX: 36, maxX: 88, minY: 56, maxY: 64 };

const bunkExitPoint = { x: 90, y: 150 };

let bunkNearby = false;

// ---- LAPTOP ----
const laptopPoint = { x: 255, y: 150, interactionDistance: 30 };
let laptopOpen = false;
let angelGameOpen = false;
let browserOpen = false;
let angelGameWon = false;

// ==========================================================
// MELEĞE ULAŞ OYUNU  (yeniden yazıldı - yatay/Mario tarzı)
// ==========================================================
//
// ✏️  BURAYI SEN DEĞİŞTİR: sona ulaşınca beliren, harf harf yazılan
// sevgi paragrafı. İstediğin uzunlukta yazabilirsin.
const BIRTHDAY_MESSAGE =
    " insanın hayatına giren bazı insanlar, fark etmeden hayatının en güzel parçalarından biri olur. Sen de benim için tam olarak öylesin. Birlikte güldüğümüz,konuştuğumuz ve sadece yan yana olduğumuz anların  bile benim için ayrı bir yeri var. İyi ki hayatımdasın,  iyi ki doğdun Verda.";
const ANGEL_GRAVITY = 0.28;
const ANGEL_JUMP_FORCE = -9;
const ANGEL_MOVE_SPEED = 1;
const ANGEL_GROUND_Y = 128;       // koşu zemininin yüzeyi (dünya/ekran birimi, dikey kaydırma yok)
const ANGEL_WORLD_W = 1500;       // seviyenin toplam genişliği
const ANGEL_DEATH_Y = ANGEL_GROUND_Y + 90; // bu kadar düşünce (çukura düşünce) öl

const angelPlayer = {
    x: 10,
    y: ANGEL_GROUND_Y - 13,
    vx: 0,
    vy: 0,
    width: 12,
    height: 17,
    onGround: false,
    facing: "right"
};

let angelCameraX = 0;

// Oyunun aşaması: "playing" -> "approach" -> "dialogue" -> "candles" -> "won"
let angelPhase = "playing";

// Çukurlar (üstünden atlanmazsa düşülür)
const angelPits = [
    { x: 220, w: 34 },
    { x: 430, w: 40 },
    { x: 660, w: 34 },
    { x: 900, w: 44 },
    { x: 1140, w: 36 }
];

// Dikenler / tuzaklar (temas edince en baştan başlanır)
const angelSpikes = [
    { x: 340, w: 16 },
    { x: 560, w: 24 },
    { x: 800, w: 16 },
    { x: 1020, w: 16 },
    { x: 1250, w: 24 }
];

// Havada duran platformlar (Mario tarzı zıplama alanları)
const angelPlatforms = [
    { x: 260, y: ANGEL_GROUND_Y - 40, w: 50, h: 10 },
    { x: 500, y: ANGEL_GROUND_Y - 55, w: 46, h: 10 },
    { x: 740, y: ANGEL_GROUND_Y - 38, w: 50, h: 10 },
    { x: 980, y: ANGEL_GROUND_Y - 50, w: 46, h: 10 },
    { x: 1180, y: ANGEL_GROUND_Y - 40, w: 50, h: 10 }
];

// Yol boyunca karşılaşılan tatlı sözler (bir kere tetiklenir)
const angelSweetSpots = [
    { x: 90, text: "Seninle her yol güzel 💕", triggered: false },
    { x: 380, text: "Gülüşün her şeyi aydınlatıyor ✨", triggered: false },
    { x: 620, text: "İyi ki varsın", triggered: false },
    { x: 860, text: "Az kaldı, devam et 🎈", triggered: false },
    { x: 1100, text: "Seni çok özledim", triggered: false },
    { x: 1320, text: "Neredeyse geldin...", triggered: false }
];

// Toplanacak mumlar - pastadaki mum sayısıyla aynı olmalı
const angelCandles = [
    { x: 160, collected: false },
    { x: 300, collected: false },
    { x: 470, collected: false },
    { x: 610, collected: false },
    { x: 750, collected: false },
    { x: 900, collected: false },
    { x: 1050, collected: false },
    { x: 1200, collected: false }
];

const ANGEL_GOAL_X = ANGEL_WORLD_W - 70;

// Konuşma balonu / harf harf yazma durumu
let dialogueDisplayedChars = 0;
let dialogueLastCharTime = 0;
const DIALOGUE_CHAR_INTERVAL = 32; // ms/harf
let dialogueDone = false;

// Mumları pastaya yerleştirme durumu
let candlesPlaced = 0;
let approachTimer = 0;

// Masaüstü ikonları (koordinatlar drawLaptopScreen içindeki screenX/screenY'e GÖRE DEĞİL,
// doğrudan canvas koordinatı - drawDesktopIcons içinde hesaplanıyor)
const desktopIcons = [
    { id: "notes", label: "Notlarım.txt", type: "file" },
    { id: "photos", label: "Fotoğraflar", type: "folder" },
    { id: "browser", label: "Tarayıcı", type: "app" },
    { id: "angelGame", label: "Meleğe Ulaş", type: "game" }
];

// Tıklanabilir alanları saklamak için (her frame'de drawDesktopIcons tarafından doldurulur)
let iconHitboxes = [];

const obstacles = [
    // Ranza
    { x: 30, y: 64, width: 72, height: 82 },

    // Çalışma masası
    { x: 205, y: 84, width: 70, height: 59 },

    // Kitaplık
    { x: 225, y: 30, width: 55, height: 48 },

    // Kapı
    // Kapının içinden geçebilmesi için şimdilik EKLEMİYORUZ
];

const keys = {};

let memoryOpen = false;

document.addEventListener("keydown", (e) => {

    const key = e.key.toLowerCase();

    keys[key] = true;

    // Mini oyun açıkken tarayıcının sayfayı
    // kaydırmasını engelle.
    if (
        angelGameOpen &&
        (
            key === "arrowleft" ||
            key === "arrowright" ||
            key === "arrowup" ||
            key === " " ||
            key === "escape"
        )
    ) {
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {

    keys[e.key.toLowerCase()] = false;
});

// ---- BAŞLA BUTONU ----
const startScreenEl = document.getElementById("start-screen");
const startButtonEl = document.getElementById("start-button");
async function enterFullscreen() {
    const gameContainer = document.getElementById("game-container");

    try {
        if (!document.fullscreenElement && gameContainer) {
            await gameContainer.requestFullscreen();
        }
    } catch (error) {
        console.log("Fullscreen kullanılamadı:", error);
    }

    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
        }
    } catch (error) {
        // Bazı telefon/tarayıcılar yön kilitlemeyi desteklemiyor.
    }

    if (typeof resizeGame === "function") {
        resizeGame();
    }
}
if (startButtonEl) {
    startButtonEl.addEventListener("click", () => {
        gameStarted = true;
        startScreenEl.classList.add("hidden");

        // İlk kullanıcı etkileşimi geldiği için sesleri burada
        // "ısındırmak" bazı tarayıcılarda sonraki play() çağrılarını kolaylaştırır.
        interactSound.play().then(() => {
            interactSound.pause();
            interactSound.currentTime = 0;
        }).catch(() => {});

        // Anı videosunu da aynı şekilde ısındırıyoruz: bazı tarayıcılar
        // sesli bir <video>'yu ancak ilk kullanıcı etkileşiminden hemen
        // sonra bir kere "dokunulmuşsa" daha sonra sorunsuz çalar.
        const wasMuted = memoryVideo.muted;
        memoryVideo.muted = true;
        memoryVideo.play().then(() => {
            memoryVideo.pause();
            memoryVideo.currentTime = 0;
            memoryVideo.muted = wasMuted;
        }).catch(() => {
            memoryVideo.muted = wasMuted;
        });
    });
}

// ---- MOBİL DOKUNMATİK KONTROLLER ----
// Her buton, ilgili klavye tuşunu basılıymış gibi işaretler/kaldırır.
// Böylece update(), checkXInteraction() ve updateAngelGame() içindeki
// mevcut "keys[...]" mantığı hiç değişmeden hem klavye hem dokunmatik
// girişle çalışır.
document.querySelectorAll(".touch-btn").forEach((btn) => {

    const key = btn.dataset.key;

    const press = (e) => {
        e.preventDefault();
        keys[key] = true;
    };

    const release = (e) => {
        e.preventDefault();
        keys[key] = false;
    };

    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });

    // Fare ile de (masaüstünde dokunmatik ekran testi vb.) çalışsın
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
});

// Canvas ekranda CSS ile ölçeklendiği ve ctx.scale(1.5,1.5) uygulandığı için
// tıklama/dokunma koordinatlarını gerçek çizim koordinatına çeviriyoruz.
// Hem fare tıklaması hem de mobil dokunuş aynı fonksiyonu kullanır.
// ==========================================================
// LAPTOP TIKLAMA / DOKUNMA
// ==========================================================

function getGameCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();

    // CSS boyutundan gerçek oyun koordinatına dönüşüm.
    // ctx.scale artık hesaba katılmıyor çünkü mantıksal
    // koordinat sistemimiz doğrudan 320x240.
    const x =
        (clientX - rect.left) /
        rect.width *
        GAME_WIDTH;

    const y =
        (clientY - rect.top) /
        rect.height *
        GAME_HEIGHT;

    return { x, y };
}

function handleLaptopTap(clientX, clientY) {

    if (!laptopOpen) return;
    if (angelGameOpen) return;
    if (browserOpen) return;

    const { x, y } =
        getGameCoordinates(clientX, clientY);

    for (const box of iconHitboxes) {

        if (
            x >= box.x &&
            x <= box.x + box.w &&
            y >= box.y &&
            y <= box.y + box.h
        ) {

            // -----------------------------
            // MELEĞE ULAŞ
            // -----------------------------
            if (box.id === "angelGame") {

                angelGameOpen = true;
                browserOpen = false;

                initAngelGame();

                interactSound.currentTime = 0;
                interactSound.play().catch(() => {});

                return;
            }

            // -----------------------------
            // TARAYICI
            // -----------------------------
            if (box.id === "browser") {

                browserOpen = true;
                angelGameOpen = false;

                interactSound.currentTime = 0;
                interactSound.play().catch(() => {});

                return;
            }
        }
    }
}

canvas.addEventListener("click", (e) => {
    handleLaptopTap(e.clientX, e.clientY);
});

canvas.addEventListener(
    "touchend",
    (e) => {

        if (!laptopOpen) return;
        if (!e.changedTouches.length) return;

        e.preventDefault();

        const touch = e.changedTouches[0];

        handleLaptopTap(
            touch.clientX,
            touch.clientY
        );
    },
    { passive: false }
);

// ========================================
// HAREKET  (DEĞİŞTİRİLMEDİ)
// ========================================

function isColliding(x, y) {

    const playerBox = {
        x: x,
        y: y,
        width: player.width,
        height: player.height
    };

    for (const obstacle of obstacles) {

        if (
            playerBox.x < obstacle.x + obstacle.width &&
            playerBox.x + playerBox.width > obstacle.x &&
            playerBox.y < obstacle.y + obstacle.height &&
            playerBox.y + playerBox.height > obstacle.y
        ) {
            return true;
        }
    }

    return false;
}

function update() {

    if (!gameStarted) return;

    player.walking = false;

    if (laptopOpen) {
        // Laptop (ve içindeki oyun) açıkken oda karakteri hareket etmesin
        return;
    }

    let dx = 0;
    let dy = 0;

    if (keys["arrowleft"] || keys["a"]) {
        dx -= player.speed;
        player.direction = "left";
    }

    if (keys["arrowright"] || keys["d"]) {
        dx += player.speed;
        player.direction = "right";
    }

    if (keys["arrowup"] || keys["w"]) {
        dy -= player.speed;
        player.direction = "up";
    }

    if (keys["arrowdown"] || keys["s"]) {
        dy += player.speed;
        player.direction = "down";
    }

    if (dx !== 0 || dy !== 0) {
        player.walking = true;
    }

    if (player.onBunk) {

        // Ranzanın üstündeyken eşyalarla çarpışma kontrolü yapılmaz,
        // sadece ranza üst yüzeyi sınırları içinde kalır
        player.x += dx;
        player.y += dy;

        player.x = Math.max(bunkTopBounds.minX, Math.min(bunkTopBounds.maxX, player.x));
        player.y = Math.max(bunkTopBounds.minY, Math.min(bunkTopBounds.maxY, player.y));

    } else {

        // Önce X hareketini kontrol et
        if (!isColliding(player.x + dx, player.y)) {
            player.x += dx;
        }

        // Sonra Y hareketini kontrol et
        if (!isColliding(player.x, player.y + dy)) {
            player.y += dy;
        }

        // Odanın içinde kalmasını sağla
        player.x = Math.max(27, Math.min(277, player.x));
        player.y = Math.max(65, Math.min(190, player.y));
    }

    // Yürüme sesi
    if (player.walking) {

        const now = Date.now();

        if (now - lastFootstepTime > 300) {
            footstepSound.currentTime = 0;
            footstepSound.play().catch(() => {});
            lastFootstepTime = now;
        }
    }
}

function checkMemoryInteraction() {

    if (player.onBunk || laptopOpen) return;

    const frameCenterX = memoryFrame.x + memoryFrame.width / 2;
    const frameCenterY = memoryFrame.y + memoryFrame.height / 2;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - frameCenterX;
    const dy = playerCenterY - frameCenterY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < memoryFrame.interactionDistance) {

        if (keys["e"] && !memoryOpen) {
            memoryOpen = true;
            interactSound.currentTime = 0;
            interactSound.play().catch(() => {});
            memoryVideo.currentTime = 0;
            memoryVideo.play();
            keys["e"] = false;
        }

    } else {

        if (memoryOpen) {
            memoryOpen = false;
            memoryVideo.pause();
        }
    }
}

// ---- LAPTOP ETKİLEŞİMİ ----
let laptopNearby = false;

function checkLaptopInteraction() {

    // Mini oyun açıkken oda etkileşimleri çalışmasın.
   if (angelGameOpen) {

    // Kazandın ekranında E veya ESC ile çık
    if (angelPhase === "won" && (keys["e"] || keys["escape"])) {

        angelGameOpen = false;

        keys["e"] = false;
        keys["escape"] = false;

        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});
    }

    // Diğer aşamalarda sadece ESC ile çıkabilsin
    else if (keys["escape"]) {

        angelGameOpen = false;
        keys["escape"] = false;

        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});
    }

    return;
}

    // Tarayıcı açıkken ESC ile masaüstüne dön.
    if (browserOpen) {

        if (keys["escape"] || keys["e"]) {

            browserOpen = false;

            keys["escape"] = false;
            keys["e"] = false;

            interactSound.currentTime = 0;
            interactSound.play().catch(() => {});
        }

        return;
    }

    if (player.onBunk || memoryOpen) {
        return;
    }

    const playerCenterX =
        player.x + player.width / 2;

    const playerCenterY =
        player.y + player.height / 2;

    const dx =
        playerCenterX - laptopPoint.x;

    const dy =
        playerCenterY - laptopPoint.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    laptopNearby =
        distance < laptopPoint.interactionDistance;

    // Laptop kapalıysa E ile aç
    if (!laptopOpen && laptopNearby && keys["e"]) {

        laptopOpen = true;

        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});

        keys["e"] = false;

        return;
    }

    // Laptop açık ve masaüstündeyse E ile kapat
    if (laptopOpen && keys["e"]) {

        laptopOpen = false;

        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});

        keys["e"] = false;

        return;
    }

    // Oyuncu laptopun yanından uzaklaşırsa
    // laptop otomatik kapanmasın.
    // Önceki kodda burada kapanabiliyordu.
}

// ---- RANZA ETKİLEŞİMİ ----
function checkBunkInteraction() {

    if (memoryOpen || laptopOpen) return;

    if (player.onBunk) {

        bunkNearby = false;

        if (keys["e"]) {
            player.onBunk = false;
            player.x = bunkExitPoint.x;
            player.y = bunkExitPoint.y;
            interactSound.currentTime = 0;
            interactSound.play().catch(() => {});
            keys["e"] = false;
        }

        return;
    }

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - bunkLadderPoint.x;
    const dy = playerCenterY - bunkLadderPoint.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    bunkNearby = distance < bunkLadderPoint.interactionDistance;

    if (bunkNearby && keys["e"]) {
        player.onBunk = true;
        player.x = bunkTopBounds.minX + 4;
        player.y = bunkTopBounds.minY + 2;
        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});
        keys["e"] = false;
    }
}


// ========================================
// ZEMİN
// ========================================

function drawFloor() {

        const ROOM_LEFT = 20;
const ROOM_RIGHT = GAME_WIDTH - 20;
const ROOM_WIDTH = ROOM_RIGHT - ROOM_LEFT;
    // Ana zemin - hafif gradyan ile derinlik
    const floorGrad = ctx.createLinearGradient(0, 62, 0, 220);
    floorGrad.addColorStop(0, "#e2ac9a");
    floorGrad.addColorStop(1, "#cf9484");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(ROOM_LEFT,62,ROOM_WIDTH,158);

    // Tahta döşemeler (koyu ayraç + ince üst highlight)
    for (let y = 62; y < 220; y += 12) {

        ctx.strokeStyle = "#b06e62";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ROOM_LEFT, y);
        ctx.lineTo(ROOM_LEFT + ROOM_WIDTH, y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.moveTo(ROOM_LEFT + 10, y + 1);
        ctx.lineTo(ROOM_LEFT + ROOM_WIDTH - 10, y + 1);
        ctx.stroke();
    }

    // Tahta ahşap damarı detayları (kaydırmalı desen - daha doğal)
    for (let row = 0, y = 68; y < 220; y += 24, row++) {

        const offset = (row % 2 === 0) ? 0 : 21;

        for (let x = 25 + offset; x < ROOM_LEFT + ROOM_WIDTH; x += 42) {

            ctx.fillStyle = "#c17a6a";
            ctx.fillRect(x, y, 9, 1);
            ctx.fillStyle = "#e0b2a0";
            ctx.fillRect(x + 1, y - 1, 5, 1);
        }
    }

    // Kapı ve pencere altındaki yumuşak zemin gölgesi (ambient occlusion)
    ctx.fillStyle = "rgba(90, 55, 45, 0.10)";
    ctx.fillRect(20, 62, 280, 6);
}


// ========================================
// DUVAR
// ========================================

function drawWalls() {

const ROOM_LEFT = 20;
const ROOM_RIGHT = GAME_WIDTH - 20;
const ROOM_WIDTH = ROOM_RIGHT - ROOM_LEFT;
    // Duvar - hafif gradyan
    const wallGrad = ctx.createLinearGradient(0, 20, 0, 63);
    wallGrad.addColorStop(0, "#f8efe3");
    wallGrad.addColorStop(1, "#ecdfd0");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(ROOM_LEFT, 20, ROOM_WIDTH, 43);

    // Duvar panelleri (highlight + gölge çifti, kabartma hissi)
    for (let x = ROOM_LEFT; x <= ROOM_LEFT + ROOM_WIDTH; x += 28) {

        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(x + 1, 20);
        ctx.lineTo(x + 1, 63);
        ctx.stroke();

        ctx.strokeStyle = "#dccbb9";
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, 63);
        ctx.stroke();
    }

    // Alt duvar çıtası (gölgeli + highlight üst kenar)
    ctx.fillStyle = "#8a564d";
    ctx.fillRect(ROOM_LEFT, 59, ROOM_WIDTH, 5);
    ctx.fillStyle = "#a97669";
    ctx.fillRect(ROOM_LEFT, 59, ROOM_WIDTH, 1);

    // Üst gölge / kartonpiyer hissi
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ROOM_LEFT, 20, ROOM_WIDTH, 2);
    ctx.fillStyle = "rgba(150,120,100,0.12)";
    ctx.fillRect(ROOM_LEFT, 22, ROOM_WIDTH, 3);
}


// ========================================
// PENCERE
// ========================================

function drawMemoryFrame() {

    const x = memoryFrame.x;
    const y = memoryFrame.y;
    const w = memoryFrame.width;
    const h = memoryFrame.height;

    ctx.save();

    // Duvara vuran gölge
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x + 3, y + 3, w, h);

    // Asma ipleri
    ctx.strokeStyle = "#9c8a6e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 6);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x + w - 6, y - 6);
    ctx.lineTo(x + w - 6, y);
    ctx.stroke();

    // Dış ahşap çerçeve
    const frameGrad = ctx.createLinearGradient(x, y, x, y + h);
    frameGrad.addColorStop(0, "#8a6142");
    frameGrad.addColorStop(1, "#5e3f2b");
    ctx.fillStyle = frameGrad;
    ctx.fillRect(x, y, w, h);

    // Oyulmuş kenar çentikleri (gerçek çerçevedeki desene benzer)
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let i = 3; i < w - 3; i += 4) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + 1);
        ctx.lineTo(x + i, y + 3);
        ctx.moveTo(x + i, y + h - 3);
        ctx.lineTo(x + i, y + h - 1);
        ctx.stroke();
    }

    // İç mont (fon) alanı
    ctx.fillStyle = "#f2e8db";
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);

    // ---- Küçük pixel fotoğraflar (mandallı, hafif eğik) ----
    const photoColors = [
        ["#caa08e", "#e8c9b8"],
        ["#a98c9a", "#d3b7c2"],
        ["#8fa08a", "#c2d3bd"],
        ["#a98d6b", "#d6bd9c"],
        ["#8a9aa8", "#c0cfd9"],
        ["#b98f8f", "#dcb9b9"]
    ];

    const cols = 3;
    const rows = 2;
    const photoW = 15;
    const photoH = 11;
    const gapX = (w - 8 - cols * photoW) / (cols + 1);
    const gapY = (h - 8 - rows * photoH) / (rows + 1);

    let colorIndex = 0;

    for (let row = 0; row < rows; row++) {

        for (let col = 0;col < cols; col++) {

            const px = x + 4 + gapX + col * (photoW + gapX);
            const py = y + 4 + gapY + row * (photoH + gapY);

            const tilt = (col + row) % 2 === 0 ? -0.06 : 0.06;
            const [base, light] = photoColors[colorIndex % photoColors.length];
            colorIndex++;

            ctx.save();
            ctx.translate(px + photoW / 2, py + photoH / 2);
            ctx.rotate(tilt);

            // Fotoğraf gölgesi
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect(-photoW / 2 + 1, -photoH / 2 + 1, photoW, photoH);

            // Beyaz polaroid kenarlığı
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-photoW / 2, -photoH / 2, photoW, photoH);

            // Fotoğraf içeriği (stilize)
            ctx.fillStyle = base;
            ctx.fillRect(-photoW / 2 + 1, -photoH / 2 + 1, photoW - 2, photoH - 3);
            ctx.fillStyle = light;
            ctx.fillRect(-photoW / 2 + 2, -photoH / 2 + 2, photoW - 4, 3);

            ctx.restore();

            // Mandal
            ctx.fillStyle = "#c9a86a";
            ctx.fillRect(px + photoW / 2 - 2, py - 3, 4, 5);
            ctx.fillStyle = "#a9895a";
            ctx.fillRect(px + photoW / 2 - 1, py - 2, 2, 3);
        }
    }

    ctx.restore();
}

// ========================================
// YATAK
// ========================================

function drawBed(x = 30, y = 55) {
    ctx.save();

    const woodDark = "#d3c2b3";
    const woodMid = "#c7b09d";
    const woodLight = "#7a5f49";
    const mattress = "#f1e0e0";
    const blanketTop = "#7d4f7e";
    const blanketTopLight = "#966490";
    const blanketBot = "#4f7d7d";
    const blanketBotLight = "#679999";

    // Yere vuran genel gölge (yumuşatılmış)
    const shadowGrad = ctx.createLinearGradient(x - 2, y + 68, x - 2, y + 74);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.20)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(x - 2, y + 68, 78, 6);

    // --- ANA DİREKLER ---
    ctx.fillStyle = woodDark;
    ctx.fillRect(x, y, 6, 70);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x, y, 1, 70);

    ctx.fillStyle = woodMid;
    ctx.fillRect(x + 66, y, 6, 70);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x + 71, y, 1, 70);

    // --- ALT YATAK ---
    ctx.fillStyle = woodMid;
    ctx.fillRect(x + 6, y + 38, 60, 8);
    ctx.fillStyle = mattress;
    ctx.fillRect(x + 6, y + 30, 60, 8);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x + 6, y + 30, 60, 1);

    ctx.fillStyle = blanketBot;
    ctx.fillRect(x + 32, y + 30, 34, 11);
    ctx.fillStyle = blanketBotLight;
    ctx.fillRect(x + 32, y + 30, 34, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, y + 26, 16, 6);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(x + 10, y + 30, 16, 2);

    // --- ÜST YATAK ---
    ctx.fillStyle = woodMid;
    ctx.fillRect(x + 6, y + 12, 60, 8);
    ctx.fillStyle = mattress;
    ctx.fillRect(x + 6, y + 4, 60, 8);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x + 6, y + 4, 60, 1);

    ctx.fillStyle = blanketTop;
    ctx.fillRect(x + 32, y + 4, 34, 11);
    ctx.fillStyle = blanketTopLight;
    ctx.fillRect(x + 32, y + 4, 34, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, y, 16, 6);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(x + 10, y + 4, 16, 2);

    // --- ÜST YATAK KORKULUĞU ---
    ctx.fillStyle = woodLight;
    ctx.fillRect(x + 12, y - 4, 45, 4);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x + 12, y - 4, 45, 1);

    ctx.fillStyle = woodLight;
    ctx.fillRect(x + 20, y, 3, 12);
    ctx.fillRect(x + 35, y, 3, 12);
    ctx.fillRect(x + 50, y, 3, 12);

    // --- MERDİVEN ---
    ctx.fillStyle = woodLight;
    ctx.fillRect(x + 53, y + 12, 4, 68);
    ctx.fillRect(x + 64, y + 12, 4, 68);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x + 53, y + 12, 1, 68);
    ctx.fillRect(x + 64, y + 12, 1, 68);

    ctx.fillStyle = woodDark;
    ctx.fillRect(x + 57, y + 23, 7, 4);
    ctx.fillRect(x + 57, y + 37, 7, 4);
    ctx.fillRect(x + 57, y + 51, 7, 4);
    ctx.fillRect(x + 57, y + 64, 7, 4);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(x + 57, y + 26, 7, 1);
    ctx.fillRect(x + 57, y + 40, 7, 1);
    ctx.fillRect(x + 57, y + 54, 7, 1);
    ctx.fillRect(x + 57, y + 67, 7, 1);

    ctx.restore();
}

// ========================================
// HALI
// ========================================

function drawRug() {

    ctx.save();

    // Halının merkezini belirle
    ctx.translate(162, 153);

    // 90 derece döndür
    ctx.rotate(Math.PI / 2);

    // Gölge
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-54, -28, 108, 55);

    // Halı
    const rugGrad = ctx.createLinearGradient(0, -28, 0, 29);
    rugGrad.addColorStop(0, "#d69ba0");
    rugGrad.addColorStop(1, "#c07f88");

    ctx.fillStyle = rugGrad;
    ctx.fillRect(-54, -28, 108, 57);

    // Halı kenarı
    ctx.strokeStyle = "#e9bcb9";
    ctx.lineWidth = 3;
    ctx.strokeRect(-51, -25, 102, 51);

    // İç kenar
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-46, -20, 92, 41);

    // Desen
    ctx.fillStyle = "#e5b4b2";

    ctx.fillRect(-29, -11, 58, 3);
    ctx.fillRect(-29, 9, 58, 3);

    ctx.fillRect(-14, -18, 3, 37);
    ctx.fillRect(11, -18, 3, 37);

    // Merkez süsleme
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(-3, -3, 6, 6);

    // Saçaklar
    ctx.fillStyle = "#e9bcb9";

    for (let fx = -50; fx < 52; fx += 6) {
        ctx.fillRect(fx, 26, 3, 2);
    }

    ctx.restore();
}


// ========================================
// MASA
// ========================================

function drawDesk() {

    // Masa gölgesi
    ctx.fillStyle = "rgba(60, 40, 30, 0.20)";
    ctx.fillRect(205, 128, 72, 5);

    // Masa gövdesi (hafif gradyan ahşap)
    const deskGrad = ctx.createLinearGradient(204, 91, 204, 128);
    deskGrad.addColorStop(0, "#ede4d6");
    deskGrad.addColorStop(1, "#dccdba");
    ctx.fillStyle = deskGrad;
    ctx.fillRect(204, 91, 72, 37);

    // Masa üstü
    ctx.fillStyle = "#f8f2e7";
    ctx.fillRect(201, 87, 78, 7);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(201, 87, 78, 1);

    // Masa ön kenarı
    ctx.fillStyle = "#c9b7a3";
    ctx.fillRect(204, 94, 72, 4);

    // Sol çekmece
    ctx.fillStyle = "#e2d7c8";
    ctx.fillRect(209, 101, 25, 20);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.strokeRect(209.5, 101.5, 24, 19);

    // Çekmece kulpu
    ctx.fillStyle = "#a5875f";
    ctx.fillRect(219, 109, 6, 2);

    // Laptop
    ctx.fillStyle = "#4c525c";
    ctx.fillRect(244, 96, 23, 15);
    const screenGrad = ctx.createLinearGradient(247, 98, 247, 109);
    screenGrad.addColorStop(0, "#657f96");
screenGrad.addColorStop(0.45, "#40566c");
screenGrad.addColorStop(1, "#202a35");
    ctx.fillStyle = screenGrad;
    ctx.fillRect(247, 98, 17, 11);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(248, 99, 6, 2);

    ctx.fillStyle = "#5c636e";
    ctx.fillRect(240, 111, 31, 3);

    // Masa ayakları
    ctx.fillStyle = "#c5b4a2";
    ctx.fillRect(208, 128, 6, 25);
    ctx.fillRect(266, 128, 6, 25);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(212, 128, 2, 25);
    ctx.fillRect(270, 128, 2, 25);


    // =========================
    // SANDALYE
    // =========================

    ctx.fillStyle = "rgba(60,40,30,0.15)";
    ctx.fillRect(226, 166, 38, 4);

    ctx.fillStyle = "#dfcdbb";
    ctx.fillRect(228, 143, 34, 22);

    ctx.fillStyle = "#f4ece1";
    ctx.fillRect(232, 146, 26, 16);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(232, 158, 26, 4);

    ctx.fillStyle = "#d6c1ac";
    ctx.fillRect(225, 163, 40, 6);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(225, 163, 40, 1);

    ctx.fillStyle = "#b6a18d";
    ctx.fillRect(243, 169, 5, 15);

    ctx.fillRect(234, 181, 23, 3);
}


// ========================================
// KİTAPLIK
// ========================================

function drawBookshelf() {

    // Gövde
    const shelfGrad = ctx.createLinearGradient(225, 30, 225, 78);
    shelfGrad.addColorStop(0, "#8a5f51");
    shelfGrad.addColorStop(1, "#6c4a3f");
    ctx.fillStyle = shelfGrad;
    ctx.fillRect(225, 30, 55, 48);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.strokeRect(225.5, 30.5, 54, 47);

    // Raflar
    ctx.fillStyle = "#5e4038";
    ctx.fillRect(229, 45, 47, 4);
    ctx.fillRect(229, 61, 47, 4);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(229, 48, 47, 1);
    ctx.fillRect(229, 64, 47, 1);

    function book(bx, by, bw, bh, color) {
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(bx, by, 1, bh);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(bx + bw - 1, by, 1, bh);
    }

    // Üst raf kitapları
    book(232, 34, 5, 11, "#d27f7f");
    book(239, 32, 6, 13, "#e0b05d");
    book(248, 36, 5, 9, "#7896a6");
    book(256, 33, 6, 12, "#b67b9c");
    book(266, 35, 5, 10, "#d98d68");

    // Alt raf kitapları
    book(233, 50, 6, 11, "#88a078");
    book(241, 49, 5, 12, "#c98484");
    book(249, 52, 7, 9, "#8a9db4");
    book(260, 49, 5, 12, "#d3aa68");
    book(268, 52, 5, 9, "#aa7a9d");
}


// ========================================
// BİTKİ
// ========================================

function drawPlant() {

    // Bitkiyi kapının sağ tarafına taşıdık

    const x = 68;
    const y = 203;

    // Saksı
    ctx.fillStyle = "#bd7866";
    ctx.fillRect(x, y, 20, 16);

    ctx.fillStyle = "#d28a72";
    ctx.fillRect(x - 3, y - 2, 26, 5);

    // Gövde
    ctx.fillStyle = "#64815c";
    ctx.fillRect(x + 9, y - 23, 3, 23);

    // Yapraklar
    ctx.fillStyle = "#72966a";

    ctx.fillRect(x, y - 19, 12, 6);
    ctx.fillRect(x + 10, y - 27, 11, 7);
    ctx.fillRect(x + 12, y - 15, 12, 6);
    ctx.fillRect(x + 3, y - 9, 10, 6);
}

// ========================================
// KÜÇÜK DEKORLAR
// ========================================

function drawDecorations() {

    // Duvar resmi çerçevesi (gölgeli)
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(84, 32, 20, 20);
    ctx.fillStyle = "#634940";
    ctx.fillRect(83, 31, 20, 20);
    ctx.fillStyle = "#f0d3ac";
    ctx.fillRect(86, 34, 14, 14);

    ctx.fillStyle = "#d6818b";
    ctx.fillRect(91, 38, 4, 6);
    ctx.fillRect(89, 40, 8, 3);

    // Küçük lamba
    ctx.fillStyle = "#5f453d";
    ctx.fillRect(190, 42, 3, 20);

    const shadeGrad = ctx.createLinearGradient(184, 35, 184, 44);
    shadeGrad.addColorStop(0, "#f5da96");
    shadeGrad.addColorStop(1, "#dcae5c");
    ctx.fillStyle = shadeGrad;
    ctx.fillRect(184, 35, 15, 9);
    ctx.fillRect(187, 32, 9, 4);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(186, 36, 4, 2);

    // Küçük halı üstü kalp dekoru
    ctx.fillStyle = "#eec0bc";
    ctx.fillRect(155, 181, 5, 4);
    ctx.fillRect(153, 183, 9, 4);
}


// ========================================
// KAPI
// ========================================

function drawDoor() {

    // Çerçeve
    ctx.fillStyle = "#5f3f36";
    ctx.fillRect(25, 180, 35, 40);

    // Kapı gövdesi (gradyan ahşap)
    const doorGrad = ctx.createLinearGradient(29, 183, 56, 183);
    doorGrad.addColorStop(0, "#a9715e");
    doorGrad.addColorStop(1, "#8c5949");
    ctx.fillStyle = doorGrad;
    ctx.fillRect(29, 183, 27, 37);

    // Panel çizgileri (ahşap kapı hissi)
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.strokeRect(33, 187, 19, 13);
    ctx.strokeRect(33, 203, 19, 13);

    ctx.fillStyle = "#cf9c76";
    ctx.fillRect(31, 186, 23, 2);

    // Kapı kolu (parlak highlight ile)
    ctx.fillStyle = "#e3bd72";
    ctx.fillRect(49, 201, 3, 3);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(49, 201, 1, 1);
}


// ========================================
// KARAKTER
// ========================================

function drawInteractionPrompt() {

    // Tablonun merkezi
    const frameCenterX = memoryFrame.x + memoryFrame.width / 2;
    const frameCenterY = memoryFrame.y + memoryFrame.height / 2;

    // Karakterin merkezi
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - frameCenterX;
    const dy = playerCenterY - frameCenterY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < memoryFrame.interactionDistance) {

        ctx.fillStyle = "rgba(40, 30, 35, 0.9)";
        ctx.fillRect(105, 112, 114, 18);

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";

        ctx.fillText("[E] Anıları incele", 162, 124);

        ctx.textAlign = "left";
    }

    if (bunkNearby && !player.onBunk) {

        ctx.fillStyle = "rgba(40, 30, 35, 0.9)";
        ctx.fillRect(85, 118, 100, 16);

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";

        ctx.fillText("[E] Ranzaya çık", 135, 129);

        ctx.textAlign = "left";
    }

    if (player.onBunk) {

        ctx.fillStyle = "rgba(40, 30, 35, 0.9)";
        ctx.fillRect(30, 70, 80, 14);

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";

        ctx.fillText("[E] Aşağı in", 70, 80);

        ctx.textAlign = "left";
    }

    if (laptopNearby && !laptopOpen) {

        ctx.fillStyle = "rgba(40, 30, 35, 0.9)";
        ctx.fillRect(215, 75, 85, 14);

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";

        ctx.fillText("[E] Laptopu aç", 257, 85);

        ctx.textAlign = "left";
    }
}

// ========================================
// ORTAK KARAKTER SPRITE'I
// ========================================
// Oda içindeki oyuncu, mini oyundaki koşan karakter ve mini oyun
// sonundaki Melek hepsi bu tek fonksiyonu kullanır - böylece hepsi
// aynı tasarım ve aynı boyutta olur. Sadece saç rengi ve
// bakış yönü (flip) değişir.

const HAIR_PALETTES = {
    black: { base: "#17141c", light: "#29232e", tip: "#111017" },
    yellow: { base: "#e8c34a", light: "#f5db7a", tip: "#c79e2e" }
};

function drawCharacterSprite(rawX, rawY, opts = {}) {

    const hair = HAIR_PALETTES[opts.hairColor] || HAIR_PALETTES.black;
    const walking = !!opts.walking;
    const flip = !!opts.flip;

    let x = Math.round(rawX);
    let y = Math.round(rawY);

    ctx.save();

    if (flip) {
        ctx.translate(x + 16, 0);
        ctx.scale(-1, 1);
        x = 0;
    }

    // ========================================
    // GÖLGE
    // ========================================

    ctx.fillStyle = "rgba(45,25,35,0.28)";
    ctx.fillRect(x + 2, y + 20, 13, 3);


    // ========================================
    // DÜMDÜZ SAÇ
    // ========================================

    ctx.fillStyle = hair.base;

    // Üst saç
    ctx.fillRect(x + 2, y - 7, 12, 5);

    // Başın iki yanında dümdüz inen saç
    ctx.fillRect(x, y - 3, 3, 18);
    ctx.fillRect(x + 13, y - 3, 3, 18);

    // Arka saç
    ctx.fillRect(x + 2, y - 2, 12, 5);

    // Saçın parlaklığı
    ctx.fillStyle = hair.light;
    ctx.fillRect(x + 3, y - 6, 7, 1);

    // Saç uçları
    ctx.fillStyle = hair.tip;
    ctx.fillRect(x, y + 12, 3, 4);
    ctx.fillRect(x + 13, y + 12, 3, 4);

    // ========================================
    // YÜZ
    // ========================================

    ctx.fillStyle = "#e0c0ac";
    ctx.fillRect(x + 3, y, 10, 9);

    // Yüz ışığı
    ctx.fillStyle = "#edd6c5";
    ctx.fillRect(x + 4, y + 1, 3, 2);

    // Hafif yanak
    ctx.fillStyle = "rgba(242, 209, 209, 0.84)";
    ctx.fillRect(x + 4, y + 6, 2, 1);
    ctx.fillRect(x + 10, y + 6, 2, 1);


    // ========================================
    // MAVİ FAR
    // ========================================

    ctx.fillStyle = "#5369d9";

    // Far gözün ÜSTÜNDE
    ctx.fillRect(x + 4, y + 2, 3, 1);
    ctx.fillRect(x + 9, y + 2, 3, 1);

    // Hafif dış far
    ctx.fillStyle = "#394da8";
    ctx.fillRect(x + 4, y + 3, 1, 1);
    ctx.fillRect(x + 11, y + 3, 1, 1);

    // ========================================
    // KAHVERENGİ GÖZLER
    // ========================================

    ctx.fillStyle = "#4a2b20";

    // Sol göz
    ctx.fillRect(x + 5, y + 3, 2, 2);

    // Sağ göz
    ctx.fillRect(x + 9, y + 3, 2, 2);

    // Göz bebeği
    ctx.fillStyle = "#241711";
    ctx.fillRect(x + 6, y + 3, 1, 1);
    ctx.fillRect(x + 9, y + 3, 1, 1);

    // ========================================
    // BOYUN
    // ========================================

    ctx.fillStyle = "#deb8a2";
    ctx.fillRect(x + 6, y + 8, 4, 3);


    // ========================================
    // GOTHIC ÜST — DAHA AÇIK YAKA
    // ========================================

    ctx.fillStyle = "#211b29";
    ctx.fillRect(x + 3, y + 10, 10, 7);

    // Omuzlar
    ctx.fillRect(x + 2, y + 11, 12, 3);

    // Açık yaka
    ctx.fillStyle = "#e9c3ac";
    ctx.fillRect(x + 6, y + 10, 4, 2);

    // V yaka
    ctx.fillStyle = "#17151e";
    ctx.fillRect(x + 5, y + 12, 6, 1);
    ctx.fillRect(x + 6, y + 13, 4, 1);

    // Mor kumaş detayı
    ctx.fillStyle = "#493454";
    ctx.fillRect(x + 3, y + 14, 10, 3);

    // Ortadaki küçük kolye
    ctx.fillStyle = "#d8b6c8";
    ctx.fillRect(x + 7, y + 12, 2, 2);
    ctx.fillRect(x + 6, y + 14, 4, 1);

    // ========================================
    // KOLLAR
    // ========================================

    ctx.fillStyle = "#211b29";

    ctx.fillRect(x + 1, y + 11, 2, 6);
    ctx.fillRect(x + 13, y + 11, 2, 6);

    // Eller
    ctx.fillStyle = "#c98f6b";
    ctx.fillRect(x + 1, y + 16, 2, 2);
    ctx.fillRect(x + 13, y + 16, 2, 2);


    // ========================================
    // ETEK / ALT
    // ========================================

    ctx.fillStyle = "#17151e";
    ctx.fillRect(x + 3, y + 17, 10, 4);

    // Mor detay
    ctx.fillStyle = "#493454";
    ctx.fillRect(x + 4, y + 17, 8, 1);


    // ========================================
    // BOTLAR
    // ========================================

    ctx.fillStyle = "#14121a";

    const step = walking
        ? Math.floor(Date.now() / 150) % 2
        : 0;

    if (step === 0) {

        ctx.fillRect(x + 3, y + 20, 4, 2);
        ctx.fillRect(x + 10, y + 19, 4, 2);

    } else {

        ctx.fillRect(x + 4, y + 19, 4, 2);
        ctx.fillRect(x + 9, y + 20, 4, 2);
    }

    ctx.restore();
}

function drawPlayer() {

    drawCharacterSprite(player.x, player.y, {
        hairColor: "black",
        walking: player.walking
    });
}

// ========================================
// GENEL IŞIK / ATMOSFER (yeni, opsiyonel katman)
// ========================================

function drawAmbientLight() {

    // Pencereden gelen hafif ışık huzmesi
    ctx.save();
    const lightGrad = ctx.createRadialGradient(150, 45, 5, 150, 45, 130);
    lightGrad.addColorStop(0, "rgba(255,248,220,0.14)");
    lightGrad.addColorStop(1, "rgba(255,248,220,0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(20, 20, 280, 200);

    // Köşelerde hafif vinyet (derinlik hissi)
    const vignette = ctx.createRadialGradient(160, 130, 60, 160, 130, 200);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(40,25,20,0.10)");
    ctx.fillStyle = vignette;
    ctx.fillRect(20, 20, 280, 200);
    ctx.restore();
}


// ========================================
// OYUNU ÇİZ
// ========================================

function draw() {

    // ----------------------------------------------------------
    // CANVAS TEMİZLE
    // ----------------------------------------------------------

    ctx.clearRect(
        0,
        0,
        GAME_WIDTH,
        GAME_HEIGHT
    );

    // ----------------------------------------------------------
    // ODAYI EKRANIN GENİŞLİĞİNE GÖRE ORTALA
    // ----------------------------------------------------------

    const roomWidth = 320;
    const roomHeight = 240;

    const horizontalScale =
        GAME_WIDTH / roomWidth;

    const verticalScale =
        GAME_HEIGHT / roomHeight;

    /*
     * Odanın içeriğini orantılı şekilde büyüt.
     *
     * Ancak geniş ekranlarda oda yatay olarak uzamasın.
     * Bunun yerine mevcut oda merkezde kalsın ve
     * zeminin/duvarın kendisi sağa-sola uzatılsın.
     */

    ctx.save();

    // ----------------------------------------------------------
    // NORMAL ODA
    // ----------------------------------------------------------

    drawFloor();
    drawWalls();

    drawMemoryFrame();
    drawBed();
    drawDesk();
    drawBookshelf();
    drawPlant();
    drawDecorations();
    drawDoor();
    drawRug();

    drawPlayer();

    drawAmbientLight();
    drawInteractionPrompt();

    ctx.restore();

    // ----------------------------------------------------------
    // POPUP / LAPTOP
    // ----------------------------------------------------------

    if (memoryOpen) {
        drawMemoryPopup();
    }

    if (laptopOpen) {
        drawLaptopScreen();
    }
}

// Videonun sol/sağındaki siyah dolgunun her bir kenardan ne kadarını
// kırpacağımız (0 ile 0.49 arası). Görüntü hâlâ dar/geniş gelirse bu
// sayıyı artır/azalt.
const VIDEO_CROP_SIDE = 0.35;

function drawFileIcon(cx, cy, color) {

    ctx.fillStyle = color;
    ctx.fillRect(cx - 6, cy - 8, 12, 16);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(cx - 6, cy - 8, 12, 16);
    ctx.fillStyle = color;
    ctx.fillRect(cx - 4, cy - 5, 8, 1);
    ctx.fillRect(cx - 4, cy - 2, 8, 1);
    ctx.fillRect(cx - 4, cy + 1, 8, 1);
    ctx.fillRect(cx - 4, cy + 4, 5, 1);
}

function drawFolderIcon(cx, cy) {

    ctx.fillStyle = "#e8b854";
    ctx.fillRect(cx - 8, cy - 3, 7, 3);
    ctx.fillRect(cx - 8, cy - 6, 16, 12);
    ctx.fillStyle = "#f5cd72";
    ctx.fillRect(cx - 8, cy - 6, 16, 3);
}

function drawBrowserIcon(cx, cy) {

    ctx.fillStyle = "#5a9bd5";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
}

function drawHeartIcon(cx, cy) {

    ctx.fillStyle = "#e0517a";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 7);
    ctx.bezierCurveTo(cx - 12, cy - 4, cx - 6, cy - 12, cx, cy - 5);
    ctx.bezierCurveTo(cx + 6, cy - 12, cx + 12, cy - 4, cx, cy + 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawDesktopIcons(screenX, screenY, screenW) {

    iconHitboxes = [];

    const iconSize = 38;
    const startX = screenX + 12;
    const startY = screenY + 12;
    const gapX = 64;
    const gapY = 54;
    const cols = 2;

    desktopIcons.forEach((icon, index) => {

        const col = index % cols;
        const row = Math.floor(index / cols);

        const ix = startX + col * gapX;
        const iy = startY + row * gapY;
        const cx = ix + iconSize / 2;
        const cy = iy + 12;

        // İkon zemini (hover benzeri hafif kutu)
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(ix, iy, iconSize, iconSize);

        if (icon.type === "file") {
            drawFileIcon(cx, cy, "#c9d6e3");
        } else if (icon.type === "folder") {
            drawFolderIcon(cx, cy);
        } else if (icon.type === "app") {
            drawBrowserIcon(cx, cy);
        } else if (icon.type === "game") {
            drawHeartIcon(cx, cy);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(icon.label, cx, iy + iconSize - 2);
        ctx.textAlign = "left";

        iconHitboxes.push({
            id: icon.id,
            x: ix,
            y: iy,
            w: iconSize,
            h: iconSize + 8
        });
    });
}

function drawLaptopScreen() {

    // Arka plan karartması
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(20, 20, 280, 200);

    const screenX = 45;
    const screenY = 35;
    const screenW = 230;
    const screenH = 155;

    // Laptop dış çerçevesi
    ctx.fillStyle = "#2a2d33";
    ctx.fillRect(screenX - 5, screenY - 5, screenW + 10, screenH + 10);
    ctx.fillStyle = "#3d4148";
    ctx.fillRect(screenX - 5, screenY - 5, screenW + 10, 3);

    // Masaüstü zemini
    const screenGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
    screenGrad.addColorStop(0, "#3a5f7d");
    screenGrad.addColorStop(1, "#1b2a3a");
    ctx.fillStyle = screenGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

   if (angelGameOpen) {

        drawAngelGame(screenX, screenY, screenW, screenH);

    } else if (browserOpen) {

        drawBrowserPage(screenX, screenY, screenW, screenH);

    } else {

        drawDesktopIcons(screenX, screenY, screenW);

        // Görev çubuğu
        const taskbarH = 14;
        ctx.fillStyle = "rgba(20,22,28,0.9)";
        ctx.fillRect(screenX, screenY + screenH - taskbarH, screenW, taskbarH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "6px monospace";
        ctx.textAlign = "left";
        ctx.fillText("[E] Laptopu kapat", screenX + 6, screenY + screenH - 4);
        ctx.textAlign = "left";
    }
}

function drawBrowserPage(screenX, screenY, screenW, screenH) {

    // Sayfa arka planı
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX, screenY, screenW, screenH - 14);

    // Adres çubuğu
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(screenX, screenY, screenW, 10);
    ctx.fillStyle = "#555555";
    ctx.font = "5px monospace";
    ctx.textAlign = "left";
    ctx.fillText("google.com", screenX + 6, screenY + 7);

    const centerX = screenX + screenW / 2;
    let logoY = screenY + 55;

    // ---- "Google" logosu yerine doğum günü temalı özel logo ----
    ctx.textAlign = "center";
    ctx.font = "bold 20px monospace";

    ctx.fillStyle = "#4285F4";
    ctx.fillText("V", centerX - 34, logoY);
    ctx.fillStyle = "#EA4335";
    ctx.fillText("e", centerX - 20, logoY);
    ctx.fillStyle = "#FBBC05";
    ctx.fillText("r", centerX - 10, logoY);
    ctx.fillStyle = "#4285F4";
    ctx.fillText("d", centerX, logoY);
    ctx.fillStyle = "#34A853";
    ctx.fillText("a", centerX + 10, logoY);
    ctx.fillStyle = "#EA4335";
    ctx.fillText("!", centerX + 20, logoY);

    // Küçük konfeti / balon dekorları (doodle hissi)
    ctx.font = "10px monospace";
    ctx.fillStyle = "#EA4335";
    ctx.fillText("🎈", centerX - 55, logoY - 8);
    ctx.fillStyle = "#34A853";
    ctx.fillText("🎉", centerX + 55, logoY - 8);

    // Alt yazı
    ctx.font = "6px monospace";
    ctx.fillStyle = "#666666";
    ctx.fillText("İyi ki doğdun Verda 🎂", centerX, logoY + 14);

    // Arama çubuğu
    const barW = 150;
    const barX = centerX - barW / 2;
    const barY = logoY + 26;

    ctx.fillStyle = "#f1f1f1";
    ctx.strokeStyle = "#dfdfdf";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 14, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#999999";
    ctx.font = "6px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Verda'yı ara...", barX + 10, barY + 9);

    ctx.textAlign = "left";
}

function initAngelGame() {
    angelPlayer.x = 10;
    angelPlayer.y = ANGEL_GROUND_Y - angelPlayer.height;
    angelPlayer.vx = 0;
    angelPlayer.vy = 0;
    angelPlayer.onGround = true;
    angelCameraX = 0;
    angelPhase = "playing";
    angelGameWon = false;
    dialogueDisplayedChars = 0;
    dialogueDone = false;
    candlesPlaced = 0;
    approachTimer = 0;

    angelSweetSpots.forEach((s) => { s.triggered = false; });
    angelCandles.forEach((c) => { c.collected = false; });
}

function resetAngelPlayer() {
    angelPlayer.x = 10;
    angelPlayer.y = ANGEL_GROUND_Y - angelPlayer.height;
    angelPlayer.vx = 0;
    angelPlayer.vy = 0;
    angelPlayer.onGround = true;
    interactSound.currentTime = 0;
    interactSound.play().catch(() => {});
}

// Verilen x aralığının bir çukurun içine denk gelip gelmediğini söyler
function angelIsOverPit(x, w) {
    for (const pit of angelPits) {
        if (x + w > pit.x && x < pit.x + pit.w) return true;
    }
    return false;
}

function updateAngelGamePlaying() {

    if (keys["arrowleft"] || keys["a"]) {
        angelPlayer.vx = -ANGEL_MOVE_SPEED;
        angelPlayer.facing = "left";
    } else if (keys["arrowright"] || keys["d"]) {
        angelPlayer.vx = ANGEL_MOVE_SPEED;
        angelPlayer.facing = "right";
    } else {
        angelPlayer.vx = 0;
    }

    const jumpPressed =
    keys["arrowup"] ||
    keys["w"] ||
    keys[" "];

if (jumpPressed && angelPlayer.onGround) {

    angelPlayer.vy = ANGEL_JUMP_FORCE;
    angelPlayer.onGround = false;

    interactSound.currentTime = 0;
    interactSound.play().catch(() => {});
}

    angelPlayer.vy += ANGEL_GRAVITY;
    if (angelPlayer.vy > 8) angelPlayer.vy = 8;

    angelPlayer.x += angelPlayer.vx;
    angelPlayer.y += angelPlayer.vy;

    angelPlayer.x = Math.max(0, Math.min(ANGEL_WORLD_W - angelPlayer.width, angelPlayer.x));

    // Platform inişi (Mario tarzı yükseltilmiş zeminler) - zemin/çukur
    // kontrolünden ÖNCE çalışır, böylece havadaki bir platforma inmek
    // normal zemine inmekten önceliklidir.
    let onPlatform = false;

    if (angelPlayer.vy >= 0) {

        for (const plat of angelPlatforms) {

            const withinX = angelPlayer.x + angelPlayer.width > plat.x && angelPlayer.x < plat.x + plat.w;
            const feetY = angelPlayer.y + angelPlayer.height;
            const prevFeetY = feetY - angelPlayer.vy;

            if (withinX && prevFeetY <= plat.y + 1 && feetY >= plat.y) {
                angelPlayer.y = plat.y - angelPlayer.height;
                angelPlayer.vy = 0;
                angelPlayer.onGround = true;
                onPlatform = true;
                break;
            }
        }
    }

    if (!onPlatform) {

        // Zemine iniş - sadece bir çukurun üstünde DEĞİLSEK zemin destek verir
        const overPit = angelIsOverPit(angelPlayer.x + angelPlayer.width * 0.5, 1);

        if (!overPit && angelPlayer.vy >= 0 && angelPlayer.y + angelPlayer.height >= ANGEL_GROUND_Y) {
            angelPlayer.y = ANGEL_GROUND_Y - angelPlayer.height;
            angelPlayer.vy = 0;
            angelPlayer.onGround = true;
        } else {
            angelPlayer.onGround = false;
        }
    }

    // Çukura / boşluğa düşünce en baştan başla
    if (angelPlayer.y > ANGEL_DEATH_Y) {
        resetAngelPlayer();
        return;
    }

    // Dikenlere değince en baştan başla
    for (const spike of angelSpikes) {
        const touchingX = angelPlayer.x + angelPlayer.width > spike.x && angelPlayer.x < spike.x + spike.w;
        const touchingGround = angelPlayer.y + angelPlayer.height >= ANGEL_GROUND_Y - 2;
        if (touchingX && touchingGround) {
            resetAngelPlayer();
            return;
        }
    }

    // Tatlı sözler
    for (const spot of angelSweetSpots) {
        if (!spot.triggered && angelPlayer.x > spot.x) {
            spot.triggered = true;
            spot.shownUntil = Date.now() + 2200;
        }
    }

    // Mum toplama
    for (const candle of angelCandles) {
        if (!candle.collected) {
            const dx = (angelPlayer.x + angelPlayer.width / 2) - candle.x;
            if (Math.abs(dx) < 8 && angelPlayer.y + angelPlayer.height > ANGEL_GROUND_Y - 22) {
                candle.collected = true;
                interactSound.currentTime = 0;
                interactSound.play().catch(() => {});
            }
        }
    }

    // Kamera oyuncuyu ekranın ortasında tutar, seviye sınırlarını aşmaz
    const screenW = 230;
    const targetCameraX = angelPlayer.x - screenW / 2;
    angelCameraX = Math.max(0, Math.min(ANGEL_WORLD_W - screenW, targetCameraX));

    // Hedefe ulaşınca yaklaşma aşamasına geç
    if (angelPlayer.x + angelPlayer.width >= ANGEL_GOAL_X) {
        angelPhase = "approach";
        approachTimer = 0;
    }
}

function updateAngelGameApproach() {

    // Karakter otomatik olarak Melek'e doğru yürür, kamera hedefte sabitlenir
    angelPlayer.vx = ANGEL_MOVE_SPEED * 0.6;
    angelPlayer.facing = "right";
    angelPlayer.vy += ANGEL_GRAVITY;
    if (angelPlayer.vy > 8) angelPlayer.vy = 8;
    angelPlayer.x += angelPlayer.vx;
    angelPlayer.y += angelPlayer.vy;

    if (angelPlayer.y + angelPlayer.height >= ANGEL_GROUND_Y) {
        angelPlayer.y = ANGEL_GROUND_Y - angelPlayer.height;
        angelPlayer.vy = 0;
        angelPlayer.onGround = true;
    }

    const goalStopX = ANGEL_GOAL_X + 18;
    if (angelPlayer.x >= goalStopX) {
        angelPlayer.x = goalStopX;
        angelPlayer.vx = 0;
        approachTimer++;

        if (approachTimer > 40) {
            angelPhase = "dialogue";
            dialogueDisplayedChars = 0;
            dialogueDone = false;
        }
    }

    const screenW = 230;
    angelCameraX = Math.max(0, Math.min(ANGEL_WORLD_W - screenW, ANGEL_GOAL_X - screenW / 2 + 30));
}


function updateAngelGameDialogue() {

    const now = Date.now();

    if (!dialogueDone) {

        if (now - dialogueLastCharTime > DIALOGUE_CHAR_INTERVAL) {
            dialogueDisplayedChars++;
            if (
    dialogueDisplayedChars % 3 === 0 &&
    BIRTHDAY_MESSAGE[dialogueDisplayedChars - 1] !== " "
) {
    typingSound.currentTime = 0;
    typingSound.play().catch(() => {});
}
            dialogueLastCharTime = now;

            if (dialogueDisplayedChars >= BIRTHDAY_MESSAGE.length) {
                dialogueDisplayedChars = BIRTHDAY_MESSAGE.length;
                dialogueDone = true;
            }
        }

        // Yazı tamamlanmadıysa E'ye basınca hızlıca tamamla
        if (keys["e"]) {
            dialogueDisplayedChars = BIRTHDAY_MESSAGE.length;
            dialogueDone = true;
            keys["e"] = false;
        }

    } else if (keys["e"]) {

        angelPhase = "candles";
        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});
        keys["e"] = false;
    }
}

function updateAngelGameCandles() {

    const totalCollected = angelCandles.filter((c) => c.collected).length;

    if (keys["e"] && candlesPlaced < totalCollected) {
        candlesPlaced++;
        interactSound.currentTime = 0;
        interactSound.play().catch(() => {});
        keys["e"] = false;
    }

    if (candlesPlaced >= angelCandles.length) {
        angelPhase = "won";
        angelGameWon = true;
    }
}

function updateAngelGame() {

    if (!angelGameOpen) return;

    if (angelPhase === "playing") {
        updateAngelGamePlaying();
    } else if (angelPhase === "approach") {
        updateAngelGameApproach();
    } else if (angelPhase === "dialogue") {
        updateAngelGameDialogue();
    } else if (angelPhase === "candles") {
        updateAngelGameCandles();
    }
    // "won" aşamasında oyun içi güncelleme yok; kapatma checkLaptopInteraction ile yapılır
}

// Koşan karakter (arkadaşın) - eski basit sprite. Artık kullanılmıyor
// (bkz. drawCharacterSprite), ama bozulma riskine karşı silinmedi.
function drawRunnerSprite(x, y, facing, walking) {

    x = Math.round(x);
    y = Math.round(y);

    const flip = facing === "left";

    ctx.save();
    if (flip) {
        ctx.translate(x + 9, 0);
        ctx.scale(-1, 1);
        x = 0;
    }

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + 12, 9, 2);

    // Saç
    ctx.fillStyle = "#2e1e30";
    ctx.fillRect(x + 1, y - 2, 7, 4);
    ctx.fillRect(x, y, 9, 3);

    // Yüz
    ctx.fillStyle = "#f2bd91";
    ctx.fillRect(x + 1, y + 2, 7, 5);

    // Üst
    ctx.fillStyle = "#7d5570";
    ctx.fillRect(x + 1, y + 7, 7, 4);

    // Bacaklar (koşu animasyonu)
    const step = walking ? Math.floor(Date.now() / 100) % 2 : 0;
    ctx.fillStyle = "#463655";
    if (step === 0) {
        ctx.fillRect(x + 1, y + 11, 3, 2);
        ctx.fillRect(x + 5, y + 11, 3, 2);
    } else {
        ctx.fillRect(x, y + 11, 3, 2);
        ctx.fillRect(x + 6, y + 11, 3, 2);
    }

    ctx.restore();
}

// Sona bekleyen "Melek" karakteri - eski basit sprite. Artık
// kullanılmıyor (bkz. drawCharacterSprite), ama bozulma riskine
// karşı silinmedi.
function drawMelekSprite(cx, groundY) {

    const x = Math.round(cx - 6);
    const y = Math.round(groundY - 24);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - 1, groundY - 2, 14, 3);

    // Saç
    ctx.fillStyle = "#4a2f22";
    ctx.fillRect(x, y - 2, 12, 5);
    ctx.fillRect(x - 1, y, 14, 6);

    // Yüz
    ctx.fillStyle = "#f2c79a";
    ctx.fillRect(x + 1, y + 3, 10, 7);
    ctx.fillStyle = "#2b1b2a";
    ctx.fillRect(x + 3, y + 6, 1, 1);
    ctx.fillRect(x + 8, y + 6, 1, 1);

    // Üst / kıyafet
    ctx.fillStyle = "#e0517a";
    ctx.fillRect(x, y + 10, 12, 8);
    ctx.fillStyle = "#f2a4bd";
    ctx.fillRect(x, y + 10, 12, 2);

    // Kollar - açık, sanki sarılmaya hazır
    ctx.fillStyle = "#f2c79a";
    ctx.fillRect(x - 3, y + 12, 3, 4);
    ctx.fillRect(x + 12, y + 12, 3, 4);

    // Alt
    ctx.fillStyle = "#463655";
    ctx.fillRect(x, y + 18, 12, 4);
}

// Doğum günü pastası - toplanan mumlar üstüne tek tek yerleştirilir
function drawCake(cx, groundY, litCandles, totalCandles) {

    const w = 34;
    const h = 16;
    const x = Math.round(cx - w / 2);
    const y = Math.round(groundY - h);

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x - 2, groundY - 2, w + 4, 3);

    // Tabak
    ctx.fillStyle = "#e8dccb";
    ctx.fillRect(x - 3, groundY - 3, w + 6, 3);

    // Alt kat
    ctx.fillStyle = "#caa06e";
    ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
    ctx.fillStyle = "#f2c9de";
    ctx.fillRect(x, y + h * 0.4, w, h * 0.2);

    // Üst kat
    ctx.fillStyle = "#e0517a";
    ctx.fillRect(x + 5, y, w - 10, h * 0.42);
    ctx.fillStyle = "#f2a4bd";
    ctx.fillRect(x + 5, y, w - 10, 2);

    // Mum yuvaları
    const slotGap = (w - 10) / (totalCandles + 1);
    for (let i = 0; i < totalCandles; i++) {

        const slotX = x + 5 + slotGap * (i + 1);
        const slotY = y;

        ctx.fillStyle = "#fff7e0";
        ctx.fillRect(slotX - 1, slotY - 6, 2, 6);

        if (i < litCandles) {
            // Alev
            ctx.fillStyle = "#ffb347";
            ctx.beginPath();
            ctx.ellipse(slotX, slotY - 8, 1.4, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,200,120,0.35)";
            ctx.beginPath();
            ctx.arc(slotX, slotY - 8, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawAngelCandleItem(sx, groundY) {

    const y = groundY - 18;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(sx, groundY - 1, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff7e0";
    ctx.fillRect(sx - 1.5, y, 3, 12);

    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.ellipse(sx, y - 2, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.beginPath();
    ctx.arc(sx, y - 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawAngelSweetBubble(sx, sy, text) {

    ctx.font = "6px monospace";
    const textW = ctx.measureText(text).width;
    const boxW = textW + 10;
    const boxX = Math.max(4, Math.min(sx - boxW / 2, 226 - boxW));

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(boxX, sy, boxW, 12);
    ctx.fillStyle = "#c15a7a";
    ctx.strokeStyle = "#c15a7a";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, sy + 0.5, boxW - 1, 11);

    ctx.fillStyle = "#5a3040";
    ctx.textAlign = "center";
    ctx.fillText(text, boxX + boxW / 2, sy + 8);
    ctx.textAlign = "left";
}

// Konuşma balonu - metin harf harf yazılır (typewriter efekti)
function drawAngelDialogueBox(screenX, screenY, screenW, screenH) {

    const boxH = 60;
    const boxX = screenX + 8;
    const boxY = screenY + screenH - boxH - 10;
    const boxW = screenW - 16;

    ctx.fillStyle = "rgba(30, 22, 30, 0.92)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#e8c7a5";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = "#f6d9e6";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Melek", boxX + 8, boxY + 12);

    const visibleText = BIRTHDAY_MESSAGE.slice(0, dialogueDisplayedChars);

    // Basit kelime kaydırma (word wrap)
    ctx.font = "6px monospace";
    ctx.fillStyle = "#ffffff";

    const maxLineWidth = boxW - 16;
    const words = visibleText.split(" ");
    let line = "";
    let lineY = boxY + 24;

    for (const word of words) {
        const testLine = line.length ? line + " " + word : word;
        if (ctx.measureText(testLine).width > maxLineWidth && line.length) {
            ctx.fillText(line, boxX + 8, lineY);
            line = word;
            lineY += 9;
        } else {
            line = testLine;
        }
    }
    if (line.length) {
        ctx.fillText(line, boxX + 8, lineY);
    }

    ctx.fillStyle = "#e8c7a5";
    ctx.font = "6px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
        dialogueDone ? "[E] Devam et" : "[E] Hızlandır",
        boxX + boxW - 6,
        boxY + boxH - 6
    );
    ctx.textAlign = "left";
}

function drawAngelGame(screenX, screenY, screenW, screenH) {

    ctx.save();

    ctx.beginPath();
    ctx.rect(screenX, screenY, screenW, screenH);
    ctx.clip();

    // Gökyüzü
    const skyGrad = ctx.createLinearGradient(
        0,
        screenY,
        0,
        screenY + screenH
    );

    skyGrad.addColorStop(0, "#fbe4f0");
    skyGrad.addColorStop(0.6, "#bcd8f0");
    skyGrad.addColorStop(1, "#5b7fa6");

    ctx.fillStyle = skyGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    const worldToScreenX = (wx) =>
        screenX + (wx - angelCameraX);

    const groundScreenY =
        screenY + ANGEL_GROUND_Y - 20;


    // =========================
    // BULUTLAR
    // =========================

    ctx.fillStyle = "rgba(255,255,255,0.7)";

    for (let i = 0; i < 8; i++) {

        const worldX = i * 220 + 40;

        const cx =
            screenX +
            ((worldX - angelCameraX * 0.4) %
                (screenW + 60)) -
            30;

        const cy =
            screenY +
            14 +
            (i % 3) * 8;

        ctx.fillRect(cx, cy, 20, 5);
        ctx.fillRect(cx + 4, cy - 3, 10, 4);
    }


    // =========================
    // UZAK TEPELER
    // =========================

    ctx.fillStyle = "rgba(120,180,140,0.5)";

    for (let i = 0; i < 6; i++) {

        const worldX = i * 260 + 80;

        const hillX =
            screenX +
            ((worldX - angelCameraX * 0.6) %
                (screenW + 140)) -
            70;

        const hillY = groundScreenY;

        ctx.beginPath();
        ctx.ellipse(
            hillX,
            hillY,
            40,
            18,
            0,
            Math.PI,
            0
        );
        ctx.fill();
    }


    // =========================
    // ZEMİN
    // =========================

    ctx.fillStyle = "#8fd39a";

    ctx.fillRect(
        screenX,
        groundScreenY,
        screenW,
        screenY + screenH - groundScreenY
    );

    ctx.fillStyle = "#6fae7c";

    ctx.fillRect(
        screenX,
        groundScreenY,
        screenW,
        3
    );

    const brickY = groundScreenY + 3;

    ctx.fillStyle = "#7ec98c";

    ctx.fillRect(
        screenX,
        brickY,
        screenW,
        6
    );

    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;

    const brickOffset =
        Math.floor(angelCameraX) % 16;

    for (
        let bx = screenX - brickOffset;
        bx < screenX + screenW;
        bx += 16
    ) {

        ctx.beginPath();
        ctx.moveTo(bx, brickY);
        ctx.lineTo(bx, brickY + 6);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.2)";

    ctx.beginPath();
    ctx.moveTo(
        screenX,
        brickY + 1
    );

    ctx.lineTo(
        screenX + screenW,
        brickY + 1
    );

    ctx.stroke();


    // =========================
    // ÇUKURLAR
    // =========================

    for (const pit of angelPits) {

        const px = worldToScreenX(pit.x);

        if (
            px + pit.w < screenX ||
            px > screenX + screenW
        ) continue;

        ctx.fillStyle = "#1b2a3a";

        ctx.fillRect(
            px,
            groundScreenY,
            pit.w,
            screenY + screenH - groundScreenY
        );
    }


    // =========================
    // DİKENLER
    // =========================

    for (const spike of angelSpikes) {

        const sx = worldToScreenX(spike.x);

        if (
            sx + spike.w < screenX ||
            sx > screenX + screenW
        ) continue;

        ctx.fillStyle = "#b33a4a";

        const teeth =
            Math.max(1, Math.floor(spike.w / 6));

        for (let i = 0; i < teeth; i++) {

            ctx.beginPath();

            ctx.moveTo(
                sx + i * 6,
                groundScreenY
            );

            ctx.lineTo(
                sx + i * 6 + 3,
                groundScreenY - 7
            );

            ctx.lineTo(
                sx + i * 6 + 6,
                groundScreenY
            );

            ctx.closePath();
            ctx.fill();
        }
    }


    // =========================
    // PLATFORMlar
    // =========================

    for (const plat of angelPlatforms) {

        const px = worldToScreenX(plat.x);

        if (
            px + plat.w < screenX ||
            px > screenX + screenW
        ) continue;

        const py = screenY + plat.y;

        ctx.fillStyle = "#c98f52";

        ctx.fillRect(
            px,
            py,
            plat.w,
            plat.h
        );

        ctx.fillStyle = "#e8b06a";

        ctx.fillRect(
            px,
            py,
            plat.w,
            2
        );

        ctx.strokeStyle =
            "rgba(0,0,0,0.25)";

        ctx.lineWidth = 1;

        for (
            let bx = px;
            bx < px + plat.w;
            bx += 10
        ) {

            ctx.strokeRect(
                Math.round(bx) + 0.5,
                py + 0.5,
                10,
                plat.h - 1
            );
        }
    }


    // =========================
    // MUMLAR
    // =========================

    for (const candle of angelCandles) {

        if (candle.collected) continue;

        const sx =
            worldToScreenX(candle.x);

        if (
            sx < screenX - 10 ||
            sx > screenX + screenW + 10
        ) continue;

        drawAngelCandleItem(
            sx,
            groundScreenY
        );
    }


    // =========================
    // MELEK + PASTA
    // =========================

    const goalScreenX =
        worldToScreenX(ANGEL_GOAL_X);

    drawCake(
        goalScreenX + 22,
        groundScreenY,
        candlesPlaced,
        angelCandles.length
    );

    drawCharacterSprite(
        goalScreenX - 8,
        groundScreenY - 21,
        {
            hairColor: "yellow",
            walking: false
        }
    );


    // =========================
    // OYUNCU
    // =========================

    const pScreenX =
        worldToScreenX(angelPlayer.x) - 2;

    const pScreenY =
        screenY +
        angelPlayer.y +
        angelPlayer.height -
        21;

    drawCharacterSprite(
        pScreenX,
        pScreenY,
        {
            hairColor: "black",
            flip:
                angelPlayer.facing === "left",
            walking:
                Math.abs(angelPlayer.vx) > 0.1 &&
                angelPlayer.onGround
        }
    );


    // =========================
    // TATLI SÖZLER
    // =========================

    if (angelPhase === "playing") {

        const now = Date.now();

        for (const spot of angelSweetSpots) {

            if (
                spot.triggered &&
                spot.shownUntil &&
                now < spot.shownUntil
            ) {

                drawAngelSweetBubble(
                    worldToScreenX(
                        angelPlayer.x
                    ) + 6,
                    pScreenY - 12,
                    spot.text
                );
            }
        }
    }

    ctx.restore();


    // =========================
    // MUM HUD
    // =========================

    if (
        angelPhase === "playing" ||
        angelPhase === "approach"
    ) {

        const collected =
            angelCandles.filter(
                c => c.collected
            ).length;

        ctx.fillStyle =
            "rgba(20,15,20,0.7)";

        ctx.fillRect(
            screenX + screenW - 46,
            screenY + 6,
            40,
            14
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "left";

        ctx.fillText(
            "🕯 " +
            collected +
            "/" +
            angelCandles.length,
            screenX + screenW - 42,
            screenY + 16
        );

        ctx.textAlign = "left";
    }


    // =========================
    // KONTROL İPUCU
    // =========================

    if (angelPhase === "playing") {

        ctx.fillStyle =
            "rgba(20,15,20,0.65)";

        ctx.fillRect(
            screenX + 4,
            screenY + 6,
            118,
            12
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "6px monospace";
        ctx.textAlign = "left";

        ctx.fillText(
            "◀ ▶ yürü   ▲ zıpla",
            screenX + 8,
            screenY + 15
        );

        ctx.textAlign = "left";
    }


    // =========================
    // DİYALOG
    // =========================

    if (angelPhase === "dialogue") {

        drawAngelDialogueBox(
            screenX,
            screenY,
            screenW,
            screenH
        );
    }


    // =========================
    // MUMLARI PASTAYA KOYMA
    // =========================

    if (angelPhase === "candles") {

        ctx.fillStyle =
            "rgba(30,22,30,0.85)";

        ctx.fillRect(
            screenX + 8,
            screenY + screenH - 34,
            screenW - 16,
            26
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";

        ctx.fillText(
            "Mumları pastaya yerleştir: " +
            candlesPlaced +
            "/" +
            angelCandles.length,
            screenX + screenW / 2,
            screenY + screenH - 20
        );

        ctx.font = "6px monospace";
        ctx.fillStyle = "#e8c7a5";

        ctx.fillText(
            "[E] Mum yerleştir",
            screenX + screenW / 2,
            screenY + screenH - 9
        );

        ctx.textAlign = "left";
    }


    // =========================
    // KAZANDIN
    // =========================

    if (angelPhase === "won") {

        ctx.fillStyle =
            "rgba(20,15,25,0.78)";

        ctx.fillRect(
            screenX,
            screenY,
            screenW,
            screenH
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";

        ctx.fillText(
            "Kazandın! 🎉",
            screenX + screenW / 2,
            screenY + screenH / 2 - 10
        );

        ctx.font = "6px monospace";
        ctx.fillStyle = "#e8c7d8";

        ctx.fillText(
            "İyi ki doğdun 🎂",
            screenX + screenW / 2,
            screenY + screenH / 2 + 6
        );

        ctx.fillText(
            "[E] Kapat",
            screenX + screenW / 2,
            screenY + screenH / 2 + 20
        );

        ctx.textAlign = "left";
    }
}


function drawMemoryPopup() {

    // Arka plan karartması
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(20, 20, 280, 200);

    // Maksimum alan sınırları (bu sınırları aşmaz ama tam doldurmaz)
    const maxW = 130;
    const maxH = 150;
    const centerX = 160;
    const centerY = 108;

    let drawW = maxW;
    let drawH = maxH;

    let sx = 0, sy = 0, sw = 0, sh = 0;
    let hasVideo = false;

    if (memoryVideo.readyState >= 2 && memoryVideo.videoWidth && memoryVideo.videoHeight) {

        hasVideo = true;

        // Kaynak videodan sadece ortadaki gerçek görüntüyü al,
        // yan taraflardaki siyah dolguyu kırp
        sx = memoryVideo.videoWidth * VIDEO_CROP_SIDE;
        sw = memoryVideo.videoWidth * (1 - VIDEO_CROP_SIDE * 2);
        sy = 0;
        sh = memoryVideo.videoHeight;

        const videoRatio = sw / sh;
        const boxRatio = maxW / maxH;

        if (videoRatio > boxRatio) {
            drawW = maxW;
            drawH = maxW / videoRatio;
        } else {
            drawH = maxH;
            drawW = maxH * videoRatio;
        }
    }

    const videoX = centerX - drawW / 2;
    const videoY = centerY - drawH / 2;

    // Çerçeve, videonun gerçek boyutuna sıkı şekilde sarılır
    const pad = 6;
    ctx.fillStyle = "#f3e6dc";
    ctx.fillRect(videoX - pad, videoY - pad, drawW + pad * 2, drawH + pad * 2);

    ctx.fillStyle = "#000000";
    ctx.fillRect(videoX, videoY, drawW, drawH);

    if (hasVideo) {
        ctx.drawImage(memoryVideo, sx, sy, sw, sh, videoX, videoY, drawW, drawH);
    }

    // Başlık
    ctx.fillStyle = "#ffffff";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
        "Birlikte geçirdiğimiz anılar",
        160,
        videoY + drawH + pad + 12
    );

    ctx.textAlign = "left";
}

//=========================================
// OYUN DÖNGÜSÜ  (DEĞİŞTİRİLMEDİ)
// ========================================

function gameLoop() {

    if (gameStarted) {
        update();
        checkMemoryInteraction();
        checkBunkInteraction();

        // updateAngelGame checkLaptopInteraction'dan ÖNCE çalışır ki
        // diyalog/mum yerleştirme aşamalarında "E" tuşunu kendi içinde
        // kullanabilsin (aksi halde aynı "E" basışı laptopu da kapatırdı).
        updateAngelGame();
        checkLaptopInteraction();
    }

    draw();

    requestAnimationFrame(gameLoop);
}

  

gameLoop();

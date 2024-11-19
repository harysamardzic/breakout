const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// konstante
const PADDLE_WIDTH = 275;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 10;
const BRICK_ROW_COUNT = 5;
let BRICK_COLUMN_COUNT = 6;
let BRICK_WIDTH;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 5;
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;

function calculateBrickLayout() {
  const targetBrickWidth = 200;
  BRICK_WIDTH =
    (canvas.width - BRICK_PADDING * (BRICK_COLUMN_COUNT + 1)) /
    BRICK_COLUMN_COUNT;
}

function normalizeBallSpeed(ball, desiredSpeed) {
  // racunanje trenutne brzine
  const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);

  ball.dx = (ball.dx / speed) * desiredSpeed;
  ball.dy = (ball.dy / speed) * desiredSpeed;
}

calculateBrickLayout();

class Paddle {
  constructor() {
    this.width = PADDLE_WIDTH;
    this.height = PADDLE_HEIGHT;
    this.x = (canvas.width - this.width) / 2;
    this.y = canvas.height - this.height - 10;
    this.dx = 15;
  }

  draw() {
    const gradient = ctx.createLinearGradient(
      this.x,
      this.y + this.height,
      this.x,
      this.y
    );

    // Add gradient colors
    gradient.addColorStop(0, "#ff0000"); // crveno na dnu
    gradient.addColorStop(1, "#000000"); // crno na vrhu

    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  move(direction) {
    if (direction === "left" && this.x > 0) this.x -= this.dx;
    if (direction === "right" && this.x < canvas.width - this.width)
      this.x += this.dx;
  }
}

class Ball {
  constructor() {
    this.radius = BALL_RADIUS;
    this.resetPosition();
    this.desiredSpeed = 5; // konstantna brzina
  }

  resetPosition() {
    this.x = canvas.width / 2;
    this.y = canvas.height - PADDLE_HEIGHT - BALL_RADIUS - 20;
    this.dx = 5 * (Math.random() < 0.5 ? 1 : -1);
    this.dy = -3;
    normalizeBallSpeed(this, 8);
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();
  }

  move() {
    this.x += this.dx;
    this.y += this.dy;

    if (this.x + this.radius > canvas.width || this.x - this.radius < 0)
      this.dx *= -1;
    if (this.y - this.radius < 0) this.dy *= -1;
  }
}

class Brick {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = BRICK_WIDTH;
    this.height = BRICK_HEIGHT;
    this.status = true; // cigla nije udarena
  }

  draw() {
    if (this.status) {
      const gradient = ctx.createLinearGradient(
        this.x,
        this.y + this.height,
        this.x,
        this.y
      );

      gradient.addColorStop(0, "blue");
      gradient.addColorStop(1, "black");

      ctx.fillStyle = gradient;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

function resetGame() {
  score = 0;
  ball.resetPosition();
  paddle.x = (canvas.width - paddle.width) / 2;

  bricks.forEach((row) => {
    row.forEach((brick) => {
      brick.status = true;
    });
  });

  drawScore();
}

// Stvaranje cigli
function createBricks() {
  const bricks = [];
  for (let row = 0; row < BRICK_ROW_COUNT; row++) {
    bricks[row] = [];
    for (let col = 0; col < BRICK_COLUMN_COUNT; col++) {
      const x = col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING;
      const y = row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 35;
      bricks[row][col] = new Brick(x, y);
    }
  }
  return bricks;
}

let bricks = createBricks();

function drawBricks() {
  for (let i = 0; i < bricks.length; i++) {
    bricks[i].forEach((brick) => {
      brick.draw();
    });
  }
}
function handlePaddleCollision(ball, paddle) {
  const ballX = ball.x;
  const paddleCenter = paddle.x + paddle.width / 2;
  const collisionPoint = ballX - paddleCenter;

  // zone palice
  const centerZoneWidth = (paddle.width * 0.2) / 2; // 20% zona => zona centra
  const sideZoneWidth = paddle.width * 0.05; // 5% krajevi
  const outerZoneWidth = paddle.width * 0.3; // 30% izmedju krajeva i centra

  const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);

  if (Math.abs(collisionPoint) <= centerZoneWidth) {
    // lopta je udarila u centar
    ball.dx = 0;
    ball.dy = -speed; // Osigurava da lopta ide ravno prema gore
  } else if (Math.abs(collisionPoint) <= sideZoneWidth) {
    const angle = Math.PI / 4; // 45 stupnjeva u radijanima
    ball.dy = -Math.abs(Math.cos(angle) * speed); // Vertikalna komponenta
    ball.dx =
      collisionPoint > 0
        ? Math.abs(Math.sin(angle) * speed) // Desna strana: pozitivna dx
        : -Math.abs(Math.sin(angle) * speed); // Lijeva strana: negativna dx
  } else if (Math.abs(collisionPoint) <= outerZoneWidth) {
    // Vanjski udar (ostatak palice): odraz na kut od 30 stupnjeva
    const angle = Math.PI / 6; // 30 stupnjeva u radijanima
    ball.dy = -Math.abs(Math.cos(angle) * speed); // Vertikalna komponenta
    ball.dx =
      collisionPoint > 0
        ? Math.abs(Math.sin(angle) * speed) // Desna strana: pozitivna dx
        : -Math.abs(Math.sin(angle) * speed); // Lijeva strana: negativna dx
  } else {
    // Ekstremni udar (dalje strane): odraz na mali kut (kao bočna strana)
    const angle = Math.PI / 6; // 30 stupnjeva u radijanima
    ball.dy = -Math.abs(Math.cos(angle) * speed); // Vertikalna komponenta
    ball.dx =
      collisionPoint > 0
        ? Math.abs(Math.sin(angle) * speed) // Desna strana: pozitivna dx
        : -Math.abs(Math.sin(angle) * speed); // Lijeva strana: negativna dx
  }

  normalizeBallSpeed(ball, 8);
}

function handlePaddleCollision(ball, paddle) {
  const ballX = ball.x; // x-koordinata lopte
  const paddleCenter = paddle.x + paddle.width / 2; // Središnji dio palice
  const collisionPoint = ballX - paddleCenter; // Udaljenost od središta palice

  const centerZoneWidth = (paddle.width * 0.2) / 2; // Definiraj "centar udarca" zonu
  const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2); // Održi konstantnu brzinu

  if (Math.abs(collisionPoint) <= centerZoneWidth) {
    // Udar u centar: pošaljite loptu ravno prema gore
    ball.dx = 0;
    ball.dy = -speed; // Osigurava da lopta putuje ravno prema gore
  } else {
    // Udar sa strane: odrazite loptu pod kutom od 45 stupnjeva
    const angle = Math.PI / 4; // 45 stupnjeva u radijanima
    ball.dy = -Math.abs(Math.cos(angle) * speed); // Vertikalna komponenta
    ball.dx =
      collisionPoint > 0
        ? Math.abs(Math.sin(angle) * speed) // Desna strana: pozitivna dx
        : -Math.abs(Math.sin(angle) * speed); // Lijeva strana: negativna dx
  }

  // Održi brzinu lopte konzistentnom
  normalizeBallSpeed(ball, 8);
}

function collisionDetection(ball, paddle) {
  const ballX = ball.x;
  const ballY = ball.y;
  // Provjerite sudar s palicom
  if (
    ballY + ball.radius > canvas.height - PADDLE_HEIGHT - 10 &&
    ballX > paddle.x &&
    ballX < paddle.x + paddle.width
  ) {
    handlePaddleCollision(ball, paddle);
  }
}

// Provjerite sudar s ciglom
function handleBrickCollision(ball, bricks) {
  let nearestBrick = null;
  let nearestDistance = Infinity;
  const prevX = ball.x;
  const prevY = ball.y;
  bricks.forEach((row) => {
    row.forEach((brick) => {
      if (brick.status) {
        const collisionCond =
          prevX + ball.radius > brick.x + BRICK_PADDING &&
          prevX - ball.radius < brick.x + brick.width + BRICK_PADDING &&
          prevY + ball.radius > brick.y + BRICK_PADDING &&
          prevY - ball.radius < brick.y + brick.height + BRICK_PADDING;

        if (collisionCond) {
          const brickCenterX = brick.x + brick.width / 2;
          const brickCenterY = brick.y + brick.height / 2;
          const distance = Math.sqrt(
            Math.pow(prevX - brickCenterX, 2) +
              Math.pow(prevY - brickCenterY, 2)
          );

          // Ažuriraj najbližu ciglu ako je ova cigla bliža
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBrick = brick;
          }
        }
      }
    });
  });

  if (nearestBrick) {
    const ballTop = prevY - ball.radius;
    const ballBottom = prevY + ball.radius;
    const ballLeft = prevX - ball.radius;
    const ballRight = prevX + ball.radius;

    // Rubovi cigle
    const brickTop = nearestBrick.y + BRICK_PADDING;
    const brickBottom = nearestBrick.y + nearestBrick.height + BRICK_PADDING;
    const brickLeft = nearestBrick.x + BRICK_PADDING;
    const brickRight = nearestBrick.x + nearestBrick.width + BRICK_PADDING;

    // Odredite tip sudara
    const collidedFromTopOrBottom =
      ballBottom > brickTop &&
      ballTop < brickBottom &&
      (prevY < brickTop || prevY > brickBottom);

    const collidedFromLeftOrRight =
      ballRight > brickLeft &&
      ballLeft < brickRight &&
      (prevX < brickLeft || prevX > brickRight);

    if (collidedFromTopOrBottom) {
      ball.dy *= -1; // Obrni vertikalni smjer
    }
    if (collidedFromLeftOrRight) {
      ball.dx *= -1; // Obrni horizontalni smjer
    }
    normalizeBallSpeed(ball, 8);
    // Označi ciglu kao "uništenu"
    nearestBrick.status = false;
    score++;

    // Ažuriraj najviši rezultat
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
    }
  }
}

function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, canvas.width - 150, 20);
  ctx.fillText(`High Score: ${highScore}`, canvas.width - 150, 40);
}

const paddle = new Paddle();
const ball = new Ball();

function gameOver() {
  ctx.fillStyle = "#f00";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);

  // Prikaži 'Play again' gumb
  const playAgainButton = document.getElementById("playAgainButton");
  playAgainButton.style.display = "inline";

  // Pauziraj igricu
  cancelAnimationFrame(animationId);
}

function showCongratulations() {
  ctx.fillStyle = "green";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("CONGRATULATIONS!", canvas.width / 2, canvas.height / 2 - 40);

  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.fillText(
    "You cleared all the bricks!",
    canvas.width / 2,
    canvas.height / 2 + 40
  );

  // Prikaži 'Play again' gumb
  const playAgainButton = document.getElementById("playAgainButton");
  playAgainButton.style =
    "display: inline; position: absolute; top: 60%; left: 50%; transform: translateX(-50%); padding: 10px 20px; font-size: 20px; background-color: #ff4d4d; border: none; color: white; cursor: pointer;";

  // Pauziraj igricu
  cancelAnimationFrame(animationId);
}
// Stanje kretanja palice
let isMovingLeft = false;
let isMovingRight = false;

// Modificiranje event listenera za praćenje stanja tipki
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") isMovingLeft = true;
  if (e.key === "ArrowRight") isMovingRight = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") isMovingLeft = false;
  if (e.key === "ArrowRight") isMovingRight = false;
});

// Ažuriranje kretanje palice u petlji igre
function updatePaddle() {
  if (isMovingLeft && paddle.x > 0) {
    paddle.x -= paddle.dx;
  }
  if (isMovingRight && paddle.x < canvas.width - paddle.width) {
    paddle.x += paddle.dx;
  }
}


function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Očisti cijeli canvas

  updatePaddle(); // Ažuriraj kretanje palice
  ball.draw(); // Nacrtaj lopticu
  paddle.draw(); // Nacrtaj palicu
  drawScore(); // Nacrtaj rezultat
  ball.move(); // Pomakni lopticu
  collisionDetection(ball, paddle); // Provjeri sudar s palicom
  handleBrickCollision(ball, bricks); // Provjeri sudar s blokovima

  if (ball.y + ball.radius > canvas.height) {
    // Ako loptica padne ispod ekrana
    gameOver(); // Pokreni funkciju za kraj igre
    return; // Završava funkciju gameLoop
  }
  if (bricks.every((row) => row.every((brick) => !brick.status))) {
    // Provjeri jesu li svi blokovi uništeni
    showCongratulations(); // Prikazuj čestitke
    return; // Završava funkciju gameLoop
  }
  drawBricks(); // Nacrtaj blokove

  animationId = requestAnimationFrame(gameLoop); // Nastavi s animacijom
}

document.addEventListener("keydown", (e) => {
  // Event listener za tipke
  if (e.key === "ArrowLeft") paddle.move("left"); // Ako je pritisnuta tipka lijevo, pomakni palicu lijevo
  if (e.key === "ArrowRight") paddle.move("right"); // Ako je pritisnuta tipka desno, pomakni palicu desno
});

document.getElementById("playAgainButton").addEventListener("click", () => {
  // Event listener za gumb "Play Again"
  const playAgainButton = document.getElementById("playAgainButton");
  playAgainButton.style.display = "none"; // Sakrij gumb za ponovni početak igre

  resetGame(); // Resetiraj igru
  gameLoop(); // Pokreni igru ponovno
});

drawBricks(); // Nacrtaj blokove odmah na početku

gameLoop(); // Pokreni petlju igre

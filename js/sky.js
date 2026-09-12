// Click Play — Sky Dash

import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const SkyDash = {

  gameId: "sky-dash",

  running: false,

  score: 0,

  bestScore: 0,

  speed: 3,

  gravity: 0.45,

  jumpForce: -7,

  velocity: 0,

  playerY: 50,

  pipes: [],

  lastTime: 0,

  animationFrame: null,

  canvas: null,

  ctx: null,

  width: 800,

  height: 450,

  // --------------------------------
  // INICIAR
  // --------------------------------

  start(canvas) {

    if (!canvas) {
      throw new Error(
        "Canvas do Sky Dash não encontrado."
      );
    }

    this.canvas = canvas;

    this.ctx =
      canvas.getContext("2d");

    this.width =
      canvas.width || 800;

    this.height =
      canvas.height || 450;

    this.score = 0;

    this.speed = 3;

    this.velocity = 0;

    this.playerY =
      this.height / 2;

    this.pipes = [];

    this.running = true;

    this.lastTime =
      performance.now();

    this.spawnPipe();

    this.emit(
      "start",
      {
        score: 0
      }
    );

    this.loop(
      this.lastTime
    );
  },

  // --------------------------------
  // LOOP
  // --------------------------------

  loop(time) {

    if (!this.running) {
      return;
    }

    const delta =
      Math.min(
        32,
        time - this.lastTime
      );

    this.lastTime = time;

    this.update(delta);

    this.draw();

    this.animationFrame =
      requestAnimationFrame(
        t => this.loop(t)
      );
  },

  // --------------------------------
  // ATUALIZAÇÃO
  // --------------------------------

  update(delta) {

    const factor =
      delta / 16.67;

    this.velocity +=
      this.gravity * factor;

    this.playerY +=
      this.velocity * factor;

    // Gravidade / chão
    if (
      this.playerY < 15
    ) {

      this.playerY = 15;

      this.velocity = 0;
    }

    if (
      this.playerY >
      this.height - 15
    ) {

      this.gameOver();

      return;
    }

    // Movimento dos obstáculos
    this.pipes.forEach(
      pipe => {

        pipe.x -=
          this.speed * factor;

      }
    );

    // Remove obstáculos antigos
    this.pipes =
      this.pipes.filter(
        pipe =>
          pipe.x >
          -pipe.width
      );

    // Cria novo obstáculo
    const last =
      this.pipes[
        this.pipes.length - 1
      ];

    if (
      !last ||
      last.x <
      this.width - 300
    ) {

      this.spawnPipe();
    }

    // Pontuação
    this.pipes.forEach(
      pipe => {

        if (
          !pipe.scored &&
          pipe.x +
          pipe.width <
          100
        ) {

          pipe.scored = true;

          this.score++;

          this.speed =
            Math.min(
              7,
              3 +
              this.score * 0.03
            );

          this.emit(
            "score",
            {
              score:
                this.score
            }
          );
        }

      }
    );

    // Colisão
    this.checkCollision();
  },

  // --------------------------------
  // CRIAR OBSTÁCULO
  // --------------------------------

  spawnPipe() {

    const gap = 145;

    const minTop = 50;

    const maxTop =
      this.height -
      gap -
      50;

    const top =
      Math.floor(
        minTop +
        Math.random() *
        (maxTop - minTop)
      );

    this.pipes.push({

      x: this.width,

      width: 55,

      top,

      gap,

      scored: false
    });
  },

  // --------------------------------
  // COLISÃO
  // --------------------------------

  checkCollision() {

    const player = {

      x: 90,

      y: this.playerY,

      width: 32,

      height: 24
    };

    for (
      const pipe of this.pipes
    ) {

      const horizontal =
        player.x <
          pipe.x +
          pipe.width &&
        player.x +
          player.width >
          pipe.x;

      if (!horizontal) {
        continue;
      }

      const hitTop =
        player.y -
        player.height / 2 <
        pipe.top;

      const hitBottom =
        player.y +
        player.height / 2 >
        pipe.top +
        pipe.gap;

      if (
        hitTop ||
        hitBottom
      ) {

        this.gameOver();

        return;
      }
    }
  },

  // --------------------------------
  // PULAR
  // --------------------------------

  jump() {

    if (!this.running) {
      return;
    }

    this.velocity =
      this.jumpForce;

    this.emit("jump");
  },

  // --------------------------------
  // DESENHAR
  // --------------------------------

  draw() {

    if (!this.ctx) {
      return;
    }

    const ctx =
      this.ctx;

    ctx.clearRect(
      0,
      0,
      this.width,
      this.height
    );

    // Fundo
    ctx.fillStyle =
      "#87ceeb";

    ctx.fillRect(
      0,
      0,
      this.width,
      this.height
    );

    // Nuvens simples
    ctx.fillStyle =
      "rgba(255,255,255,.8)";

    this.drawCloud(
      ctx,
      150,
      80
    );

    this.drawCloud(
      ctx,
      550,
      130
    );

    // Obstáculos
    this.pipes.forEach(
      pipe => {

        ctx.fillStyle =
          "#35a853";

        ctx.fillRect(
          pipe.x,
          0,
          pipe.width,
          pipe.top
        );

        ctx.fillRect(
          pipe.x,
          pipe.top +
          pipe.gap,
          pipe.width,
          this.height
        );
      }
    );

    // Jogador
    ctx.fillStyle =
      "#ffcc33";

    ctx.beginPath();

    ctx.arc(
      106,
      this.playerY,
      16,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Olho
    ctx.fillStyle =
      "#111";

    ctx.beginPath();

    ctx.arc(
      112,
      this.playerY - 5,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Pontuação
    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "bold 28px Arial";

    ctx.fillText(
      String(this.score),
      20,
      40
    );
  },

  drawCloud(
    ctx,
    x,
    y
  ) {

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      20,
      0,
      Math.PI * 2
    );

    ctx.arc(
      x + 25,
      y - 10,
      25,
      0,
      Math.PI * 2
    );

    ctx.arc(
      x + 55,
      y,
      20,
      0,
      Math.PI * 2
    );

    ctx.fill();
  },

  // --------------------------------
  // GAME OVER
  // --------------------------------

  async gameOver() {

    if (!this.running) {
      return;
    }

    this.running = false;

    if (
      this.animationFrame
    ) {

      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame =
        null;
    }

    const score =
      this.score;

    const previousBest =
      Number(
        localStorage.getItem(
          "clickplay_sky_best"
        ) || 0
      );

    const isNewRecord =
      score >
      previousBest;

    if (isNewRecord) {

      this.bestScore =
        score;

      localStorage.setItem(
        "clickplay_sky_best",
        String(score)
      );

    } else {

      this.bestScore =
        previousBest;
    }

    await this.saveResult();

    this.emit(
      "gameover",
      {

        score,

        bestScore:
          this.bestScore,

        isNewRecord
      }
    );
  },

  // --------------------------------
  // SALVAR RESULTADO
  // --------------------------------

  async saveResult() {

    const user =
      window.ClickPlay?.user;

    if (!user) {
      return;
    }

    try {

      await addDoc(
        collection(
          db,
          "scores"
        ),
        {

          uid:
            user.uid,

          gameId:
            this.gameId,

          score:
            this.score,

          won: false,

          metadata: {

            bestScore:
              this.bestScore
          },

          createdAt:
            serverTimestamp()
        }
      );

    } catch (error) {

      console.warn(
        "Erro salvando Sky Dash:",
        error
      );
    }

    try {

      if (
        window.ClickPlay
      ) {

        await window.ClickPlay
          .addXP(
            Math.max(
              10,
              this.score * 2
            )
          );
      }

    } catch (error) {

      console.warn(
        "Erro adicionando XP:",
        error
      );
    }
  },

  // --------------------------------
  // PARAR
  // --------------------------------

  stop() {

    this.running = false;

    if (
      this.animationFrame
    ) {

      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame =
        null;
    }
  },

  // --------------------------------
  // EVENTOS
  // --------------------------------

  emit(
    event,
    data = {}
  ) {

    window.dispatchEvent(
      new CustomEvent(
        `sky-${event}`,
        {
          detail: data
        }
      )
    );
  }

};

window.SkyDash = SkyDash;

console.log(
  "Sky Dash carregado."
);

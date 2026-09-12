// Click Play — Jogo do Milhão

import { db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const Million = {

  gameId: "million",

  questions: [],

  currentQuestion: null,

  currentIndex: 0,

  score: 0,

  lives: 3,

  timeLeft: 30,

  timer: null,

  usedQuestions: new Set(),

  usedHelps: {
    fifty: false,
    skip: false,
    secondChance: false
  },

  answerLocked: false,

  running: false,

  // -----------------------------
  // CONFIGURAÇÃO
  // -----------------------------

  levels: [
    {
      level: 1,
      difficulty: "easy",
      points: 100
    },
    {
      level: 2,
      difficulty: "easy",
      points: 200
    },
    {
      level: 3,
      difficulty: "easy",
      points: 300
    },
    {
      level: 4,
      difficulty: "medium",
      points: 500
    },
    {
      level: 5,
      difficulty: "medium",
      points: 750
    },
    {
      level: 6,
      difficulty: "medium",
      points: 1000
    },
    {
      level: 7,
      difficulty: "medium",
      points: 1500
    },
    {
      level: 8,
      difficulty: "hard",
      points: 2500
    },
    {
      level: 9,
      difficulty: "hard",
      points: 5000
    },
    {
      level: 10,
      difficulty: "hard",
      points: 10000
    },
    {
      level: 11,
      difficulty: "hard",
      points: 20000
    },
    {
      level: 12,
      difficulty: "expert",
      points: 50000
    },
    {
      level: 13,
      difficulty: "expert",
      points: 100000
    },
    {
      level: 14,
      difficulty: "expert",
      points: 250000
    },
    {
      level: 15,
      difficulty: "expert",
      points: 1000000
    }
  ],

  // -----------------------------
  // INICIAR
  // -----------------------------

  async start(options = {}) {

    this.stopTimer();

    this.questions = [];

    this.currentQuestion = null;

    this.currentIndex = 0;

    this.score = 0;

    this.lives = 3;

    this.timeLeft = 30;

    this.usedQuestions = new Set();

    this.usedHelps = {
      fifty: false,
      skip: false,
      secondChance: false
    };

    this.answerLocked = false;

    this.running = true;

    const questions =
      await this.loadQuestions(options);

    this.questions = questions;

    if (!this.questions.length) {

      this.running = false;

      this.emit("error", {
        message:
          "Não encontramos perguntas disponíveis."
      });

      return;
    }

    this.showQuestion();
  },

  // -----------------------------
  // CARREGAR PERGUNTAS
  // -----------------------------

  async loadQuestions(options = {}) {

    const category =
      options.category || null;

    const difficulties =
      ["easy", "medium", "hard", "expert"];

    const result = [];

    for (const difficulty of difficulties) {

      if (result.length >= 15) break;

      try {

        let q;

        if (category) {

          q = query(
            collection(
              db,
              "questions"
            ),

            where(
              "gameId",
              "==",
              this.gameId
            ),

            where(
              "difficulty",
              "==",
              difficulty
            ),

            where(
              "category",
              "==",
              category
            )
          );

        } else {

          q = query(
            collection(
              db,
              "questions"
            ),

            where(
              "gameId",
              "==",
              this.gameId
            ),

            where(
              "difficulty",
              "==",
              difficulty
            )
          );
        }

        const snapshot =
          await getDocs(q);

        snapshot.docs.forEach(
          (doc) => {

            const data = doc.data();

            result.push({
              id: doc.id,
              ...data
            });

          }
        );

      } catch (error) {

        console.warn(
          "Erro carregando perguntas:",
          error
        );
      }
    }

    // Embaralha
    this.shuffle(result);

    // Retira duplicadas
    const unique = [];

    const ids = new Set();

    for (const question of result) {

      if (ids.has(question.id)) {
        continue;
      }

      ids.add(question.id);

      unique.push(question);
    }

    return this.prepareQuestions(unique);
  },

  // -----------------------------
  // PREPARAR PERGUNTAS
  // -----------------------------

  prepareQuestions(questions) {

    const prepared = [];

    for (
      let i = 0;
      i < Math.min(
        questions.length,
        this.levels.length
      );
      i++
    ) {

      const level =
        this.levels[i];

      const candidates =
        questions.filter(
          q =>
            q.difficulty ===
            level.difficulty
        );

      if (!candidates.length) {
        continue;
      }

      const question =
        candidates[
          Math.floor(
            Math.random() *
            candidates.length
          )
        ];

      const copy = {
        ...question
      };

      copy.options =
        this.normalizeOptions(copy);

      this.shuffle(copy.options);

      prepared.push(copy);
    }

    return prepared;
  },

  // -----------------------------
  // NORMALIZAR RESPOSTAS
  // -----------------------------

  normalizeOptions(question) {

    if (
      Array.isArray(
        question.options
      )
    ) {

      return question.options.map(
        (option, index) => {

          if (
            typeof option === "string"
          ) {

            return {
              id:
                String.fromCharCode(
                  65 + index
                ),

              text: option,

              correct:
                option ===
                question.correctAnswer
            };
          }

          return {
            ...option,

            id:
              option.id ||
              String.fromCharCode(
                65 + index
              )
          };
        }
      );
    }

    const options = [];

    ["A", "B", "C", "D"]
      .forEach(letter => {

        if (
          question[letter] !==
          undefined
        ) {

          options.push({
            id: letter,
            text: question[letter],
            correct:
              question.correct ===
              letter
          });
        }

      });

    return options;
  },

  // -----------------------------
  // MOSTRAR PERGUNTA
  // -----------------------------

  showQuestion() {

    this.stopTimer();

    if (
      this.currentIndex >=
      this.questions.length
    ) {

      this.finish(true);

      return;
    }

    this.answerLocked = false;

    const question =
      this.questions[
        this.currentIndex
      ];

    this.currentQuestion =
      question;

    this.timeLeft = 30;

    this.emit(
      "question",
      {

        question,

        number:
          this.currentIndex + 1,

        total:
          this.questions.length,

        score:
          this.score,

        lives:
          this.lives,

        timeLeft:
          this.timeLeft,

        level:
          this.levels[
            this.currentIndex
          ]
      }
    );

    this.startTimer();
  },

  // -----------------------------
  // TIMER
  // -----------------------------

  startTimer() {

    this.stopTimer();

    this.timeLeft = 30;

    this.emit(
      "timer",
      {
        timeLeft:
          this.timeLeft
      }
    );

    this.timer =
      setInterval(() => {

        if (!this.running) {
          this.stopTimer();
          return;
        }

        this.timeLeft--;

        this.emit(
          "timer",
          {
            timeLeft:
              this.timeLeft
          }
        );

        if (
          this.timeLeft <= 0
        ) {

          this.stopTimer();

          this.answer(
            null
          );
        }

      }, 1000);
  },

  stopTimer() {

    if (this.timer) {

      clearInterval(
        this.timer
      );

      this.timer = null;
    }
  },

  // -----------------------------
  // RESPONDER
  // -----------------------------

  async answer(optionId) {

    if (!this.running) {
      return;
    }

    if (this.answerLocked) {
      return;
    }

    this.answerLocked = true;

    this.stopTimer();

    const question =
      this.currentQuestion;

    if (!question) {
      return;
    }

    const option =
      question.options.find(
        item =>
          String(item.id) ===
          String(optionId)
      );

    const correctOption =
      question.options.find(
        item =>
          item.correct === true
      );

    const correct =
      Boolean(
        option &&
        option.correct === true
      );

    let earned = 0;

    if (correct) {

      const level =
        this.levels[
          this.currentIndex
        ] || this.levels[
          this.levels.length - 1
        ];

      earned =
        level.points;

      // Bônus de tempo
      earned +=
        Math.max(
          0,
          this.timeLeft * 5
        );

      // Bônus de sequência
      earned +=
        this.currentIndex * 25;

      this.score += earned;

    } else {

      this.lives--;

    }

    await this.saveQuestionHistory({
      question,
      selected:
        optionId,
      correct,
      score:
        earned
    });

    this.emit(
      "answer",
      {

        correct,

        selected:
          optionId,

        correctAnswer:
          correctOption
            ? correctOption.id
            : null,

        earned,

        score:
          this.score,

        lives:
          this.lives
      }
    );

    if (
      this.lives <= 0
    ) {

      setTimeout(() => {

        this.finish(false);

      }, 1000);

      return;
    }

    this.currentIndex++;

    setTimeout(() => {

      this.showQuestion();

    }, 1000);
  },

  // -----------------------------
  // HISTÓRICO DA PERGUNTA
  // -----------------------------

  async saveQuestionHistory(data) {

    const user =
      window.ClickPlay?.user;

    if (!user) return;

    try {

      await addDoc(
        collection(
          db,
          "user_question_history"
        ),
        {

          uid:
            user.uid,

          gameId:
            this.gameId,

          questionId:
            data.question.id,

          selected:
            data.selected,

          correct:
            data.correct,

          score:
            data.score,

          createdAt:
            serverTimestamp()
        }
      );

    } catch (error) {

      console.warn(
        "Erro salvando histórico:",
        error
      );
    }
  },

  // -----------------------------
  // AJUDAS
  // -----------------------------

  useFifty() {

    if (
      this.usedHelps.fifty
    ) {
      return false;
    }

    const question =
      this.currentQuestion;

    if (!question) {
      return false;
    }

    this.usedHelps.fifty =
      true;

    const wrong =
      question.options
        .filter(
          option =>
            !option.correct
        );

    this.shuffle(wrong);

    const remove =
      wrong.slice(
        0,
        Math.min(
          2,
          wrong.length
        )
      );

    const remaining =
      question.options.filter(
        option =>
          !remove.includes(
            option
          )
      );

    this.emit(
      "help-fifty",
      {
        removed:
          remove.map(
            item => item.id
          ),

        remaining:
          remaining.map(
            item => item.id
          )
      }
    );

    return true;
  },

  useSkip() {

    if (
      this.usedHelps.skip
    ) {
      return false;
    }

    if (!this.running) {
      return false;
    }

    this.usedHelps.skip =
      true;

    this.stopTimer();

    this.currentIndex++;

    this.showQuestion();

    this.emit(
      "help-skip"
    );

    return true;
  },

  useSecondChance() {

    if (
      this.usedHelps.secondChance
    ) {
      return false;
    }

    this.usedHelps.secondChance =
      true;

    this.lives++;

    this.emit(
      "help-second-chance",
      {
        lives:
          this.lives
      }
    );

    return true;
  },

  // -----------------------------
  // FINALIZAR
  // -----------------------------

  async finish(completed = false) {

    if (!this.running) {
      return;
    }

    this.running = false;

    this.stopTimer();

    const user =
      window.ClickPlay?.user;

    if (user) {

      try {

        await addDoc(
          collection(
            db,
            "game_sessions"
          ),
          {

            uid:
              user.uid,

            gameId:
              this.gameId,

            score:
              this.score,

            completed,

            questionsAnswered:
              this.currentIndex,

            livesRemaining:
              this.lives,

            createdAt:
              serverTimestamp()
          }
        );

      } catch (error) {

        console.warn(
          "Erro salvando partida:",
          error
        );
      }

      try {

        if (
          window.ClickPlay
        ) {

          await window.ClickPlay
            .saveGameResult({

              gameId:
                this.gameId,

              score:
                this.score,

              won:
                completed,

              duration:
                this.currentIndex * 30,

              metadata: {

                questions:
                  this.currentIndex,

                lives:
                  this.lives
              }
            });
        }

      } catch (error) {

        console.warn(
          "Erro salvando resultado:",
          error
        );
      }
    }

    this.emit(
      "finish",
      {

        score:
          this.score,

        completed,

        questionsAnswered:
          this.currentIndex,

        lives:
          this.lives
      }
    );
  },

  // -----------------------------
  // UTILITÁRIO
  // -----------------------------

  shuffle(array) {

    for (
      let i =
        array.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        array[i],
        array[j]
      ] = [
        array[j],
        array[i]
      ];
    }

    return array;
  },

  emit(event, data = {}) {

    window.dispatchEvent(
      new CustomEvent(
        `million-${event}`,
        {
          detail: data
        }
      )
    );
  }

};

window.Million = Million;

console.log(
  "Jogo do Milhão carregado."
);

// Click Play — Sistema principal
import {
  auth,
  db,
  storage,
  onAuthStateChanged
} from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const ClickPlay = {

  user: null,
  profile: null,
  initialized: false,

  init() {

    if (this.initialized) return;

    this.initialized = true;

    onAuthStateChanged(auth, async (user) => {

      this.user = user;

      if (user) {

        await this.loadProfile();
        await this.updateOnlineStatus(true);

        this.startNotificationsListener();
        this.startUserListener();
      }

      this.dispatch("clickplay-auth", {
        user
      });
    });

    window.addEventListener("beforeunload", () => {
      this.updateOnlineStatus(false);
    });
  },

  dispatch(name, detail = {}) {

    window.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  },

  async register(email, password, name) {

    if (!email || !password || !name) {
      throw new Error("Preencha todos os campos.");
    }

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = credential.user;

    await updateProfile(user, {
      displayName: name
    });

    const userData = {

      uid: user.uid,
      email: user.email,
      name,

      photoURL: "",
      bannerURL: "",

      level: 1,
      xp: 0,
      coins: 0,

      totalScore: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,

      online: true,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(
      doc(db, "users", user.uid),
      userData
    );

    this.profile = userData;

    this.dispatch("clickplay-profile", {
      profile: this.profile
    });

    return user;
  },

  async login(email, password) {

    if (!email || !password) {
      throw new Error(
        "Informe seu e-mail e sua senha."
      );
    }

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    return credential.user;
  },

  async logout() {

    await this.updateOnlineStatus(false);

    await signOut(auth);

    this.user = null;
    this.profile = null;

    this.dispatch("clickplay-logout");
  },

  async loadProfile() {

    if (!this.user) return null;

    const userRef =
      doc(db, "users", this.user.uid);

    const snapshot =
      await getDoc(userRef);

    if (snapshot.exists()) {

      this.profile = {
        id: snapshot.id,
        ...snapshot.data()
      };

    } else {

      this.profile = {

        uid: this.user.uid,

        email:
          this.user.email || "",

        name:
          this.user.displayName ||
          "Jogador",

        photoURL:
          this.user.photoURL ||
          "",

        bannerURL: "",

        level: 1,
        xp: 0,
        coins: 0,

        totalScore: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,

        online: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(
        userRef,
        this.profile
      );
    }

    this.dispatch("clickplay-profile", {
      profile: this.profile
    });

    return this.profile;
  },

  async updateProfile(data = {}) {

    if (!this.user) {
      throw new Error(
        "Você precisa estar logado."
      );
    }

    const allowed = {

      name:
        typeof data.name === "string"
          ? data.name.trim().slice(0, 40)
          : undefined,

      bio:
        typeof data.bio === "string"
          ? data.bio.trim().slice(0, 180)
          : undefined,

      photoURL:
        typeof data.photoURL === "string"
          ? data.photoURL
          : undefined,

      bannerURL:
        typeof data.bannerURL === "string"
          ? data.bannerURL
          : undefined
    };

    const changes = {};

    Object.keys(allowed).forEach((key) => {

      if (allowed[key] !== undefined) {
        changes[key] = allowed[key];
      }

    });

    changes.updatedAt = serverTimestamp();

    await updateDoc(
      doc(db, "users", this.user.uid),
      changes
    );

    if (changes.name) {

      await updateProfile(
        this.user,
        {
          displayName: changes.name
        }
      );
    }

    await this.loadProfile();

    return this.profile;
  },

  async uploadAvatar(file) {

    if (!this.user) {
      throw new Error(
        "Você precisa estar logado."
      );
    }

    if (!file) {
      throw new Error(
        "Nenhuma imagem selecionada."
      );
    }

    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Escolha uma imagem."
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        "A imagem deve ter no máximo 5 MB."
      );
    }

    const fileRef = ref(
      storage,
      `users/${this.user.uid}/avatar`
    );

    await uploadBytes(
      fileRef,
      file
    );

    const url =
      await getDownloadURL(fileRef);

    await this.updateProfile({
      photoURL: url
    });

    return url;
  },

  async uploadBanner(file) {

    if (!this.user) {
      throw new Error(
        "Você precisa estar logado."
      );
    }

    if (!file) {
      throw new Error(
        "Nenhuma imagem selecionada."
      );
    }

    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Escolha uma imagem."
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        "O banner deve ter no máximo 8 MB."
      );
    }

    const fileRef = ref(
      storage,
      `users/${this.user.uid}/banner`
    );

    await uploadBytes(
      fileRef,
      file
    );

    const url =
      await getDownloadURL(fileRef);

    await this.updateProfile({
      bannerURL: url
    });

    return url;
  },

  calculateLevel(xp) {

    let level = 1;
    let required = 100;
    let remaining = xp;

    while (remaining >= required) {

      remaining -= required;

      level++;

      required =
        Math.floor(
          100 * Math.pow(1.15, level - 1)
        );
    }

    return level;
  },

  async addXP(amount) {

    if (!this.user || amount <= 0) {
      return;
    }

    const currentXP =
      Number(
        this.profile?.xp || 0
      );

    const newXP =
      currentXP + Number(amount);

    const newLevel =
      this.calculateLevel(newXP);

    await updateDoc(
      doc(db, "users", this.user.uid),
      {
        xp: newXP,
        level: newLevel,
        updatedAt: serverTimestamp()
      }
    );

    await this.loadProfile();

    return {
      xp: newXP,
      level: newLevel
    };
  },

  async addCoins(amount) {

    if (!this.user || amount <= 0) {
      return;
    }

    const current =
      Number(
        this.profile?.coins || 0
      );

    await updateDoc(
      doc(db, "users", this.user.uid),
      {
        coins: current + Number(amount),
        updatedAt: serverTimestamp()
      }
    );

    await this.loadProfile();
  },

  async saveGameResult({

    gameId,
    score = 0,
    won = false,
    duration = 0,
    metadata = {}

  }) {

    if (!this.user) {
      throw new Error(
        "Você precisa estar logado."
      );
    }

    const result = {

      uid: this.user.uid,

      gameId,

      score: Number(score),

      won: Boolean(won),

      duration: Number(duration),

      metadata,

      createdAt: serverTimestamp()
    };

    await addDoc(
      collection(db, "scores"),
      result
    );

    const gamesPlayed =
      Number(
        this.profile?.gamesPlayed || 0
      ) + 1;

    const wins =
      Number(
        this.profile?.wins || 0
      ) +
      (won ? 1 : 0);

    const losses =
      Number(
        this.profile?.losses || 0
      ) +
      (!won ? 1 : 0);

    const totalScore =
      Number(
        this.profile?.totalScore || 0
      ) +
      Number(score);

    await updateDoc(
      doc(db, "users", this.user.uid),
      {
        gamesPlayed,
        wins,
        losses,
        totalScore,
        updatedAt: serverTimestamp()
      }
    );

    await this.addXP(
      Math.max(
        10,
        Math.floor(score / 100)
      )
    );

    return result;
  },

  async getGameHistory(gameId = null) {

    if (!this.user) {
      return [];
    }

    let q;

    if (gameId) {

      q = query(

        collection(
          db,
          "scores"
        ),

        where(
          "uid",
          "==",
          this.user.uid
        ),

        where(
          "gameId",
          "==",
          gameId
        ),

        orderBy(
          "createdAt",
          "desc"
        ),

        limit(50)
      );

    } else {

      q = query(

        collection(
          db,
          "scores"
        ),

        where(
          "uid",
          "==",
          this.user.uid
        ),

        orderBy(
          "createdAt",
          "desc"
        ),

        limit(50)
      );
    }

    const snapshot =
      await getDocs(q);

    return snapshot.docs.map(
      doc => ({
        id: doc.id,
        ...doc.data()
      })
    );
  },

  async updateOnlineStatus(online) {

    if (!this.user) return;

    try {

      await updateDoc(
        doc(
          db,
          "users",
          this.user.uid
        ),
        {
          online,
          lastSeen:
            serverTimestamp()
        }
      );

    } catch (error) {

      console.warn(
        "Não foi possível atualizar status:",
        error
      );
    }
  },

  startNotificationsListener() {

    if (!this.user) return;

    const notificationsQuery =
      query(

        collection(
          db,
          "notifications"
        ),

        where(
          "toUid",
          "==",
          this.user.uid
        ),

        orderBy(
          "createdAt",
          "desc"
        ),

        limit(30)
      );

    onSnapshot(
      notificationsQuery,
      (snapshot) => {

        const notifications =
          snapshot.docs.map(
            doc => ({
              id: doc.id,
              ...doc.data()
            })
          );

        this.dispatch(
          "clickplay-notifications",
          {
            notifications
          }
        );
      }
    );
  },

  startUserListener() {

    if (!this.user) return;

    const userRef =
      doc(
        db,
        "users",
        this.user.uid
      );

    onSnapshot(
      userRef,
      (snapshot) => {

        if (!snapshot.exists()) return;

        this.profile = {

          id: snapshot.id,

          ...snapshot.data()
        };

        this.dispatch(
          "clickplay-profile",
          {
            profile: this.profile
          }
        );
      }
    );
  },

  async sendFriendRequest(targetUid) {

    if (!this.user) {
      throw new Error(
        "Faça login primeiro."
      );
    }

    if (!targetUid) {
      throw new Error(
        "Usuário inválido."
      );
    }

    if (targetUid === this.user.uid) {
      throw new Error(
        "Você não pode adicionar você mesmo."
      );
    }

    const request = {

      fromUid: this.user.uid,

      toUid: targetUid,

      status: "pending",

      createdAt: serverTimestamp()
    };

    await addDoc(
      collection(
        db,
        "friend_requests"
      ),
      request
    );

    await addDoc(
      collection(
        db,
        "notifications"
      ),
      {

        toUid: targetUid,

        type: "friend_request",

        fromUid: this.user.uid,

        read: false,

        createdAt:
          serverTimestamp()
      }
    );
  },

  async unlockAchievement(
    achievementId
  ) {

    if (!this.user) return;

    const achievementRef =
      doc(
        db,
        "user_achievements",
        `${this.user.uid}_${achievementId}`
      );

    const existing =
      await getDoc(
        achievementRef
      );

    if (existing.exists()) {
      return false;
    }

    await setDoc(
      achievementRef,
      {

        uid: this.user.uid,

        achievementId,

        unlockedAt:
          serverTimestamp()
      }
    );

    return true;
  }

};

window.ClickPlay = ClickPlay;

ClickPlay.init();

console.log(
  "Click Play carregado com sucesso."
);

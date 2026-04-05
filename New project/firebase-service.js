(function () {
  const SDK_VERSION = "12.7.0";
  const REQUIRED_KEYS = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ];

  const loadedScripts = new Set();

  window.FinanceTrackerCloud = {
    create,
  };

  async function create() {
    const config = window.FINANCE_TRACKER_FIREBASE_CONFIG || {};
    const configured = isConfigured(config);

    if (!configured) {
      return {
        available: false,
        configured: false,
      };
    }

    await loadFirebaseSdk();

    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(config);
    const auth = app.auth();
    const db = app.firestore();

    db.enablePersistence({ synchronizeTabs: true }).catch(() => {
      return undefined;
    });

    return {
      available: true,
      configured: true,
      onAuthChange(callback) {
        return auth.onAuthStateChanged(callback);
      },
      async signIn(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
      },
      async signUp(email, password) {
        return auth.createUserWithEmailAndPassword(email, password);
      },
      async signOut() {
        return auth.signOut();
      },
      subscribeToUserState(uid, onData, onError) {
        return getDashboardRef(db, uid).onSnapshot(
          (snapshot) => {
            onData(snapshot.exists ? snapshot.data() : null);
          },
          onError,
        );
      },
      async saveUserState(uid, payload) {
        const document = {
          ...payload,
          serverUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        };
        return getDashboardRef(db, uid).set(document, { merge: true });
      },
    };
  }

  function getDashboardRef(db, uid) {
    return db.collection("users").doc(uid).collection("dashboards").doc("main");
  }

  function isConfigured(config) {
    return REQUIRED_KEYS.every((key) => {
      const value = config[key];
      return typeof value === "string" && value.trim() !== "" && !value.includes("YOUR_");
    });
  }

  async function loadFirebaseSdk() {
    await loadScript(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore-compat.js`);
  }

  function loadScript(src) {
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        loadedScripts.add(src);
        resolve();
      };
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }
})();

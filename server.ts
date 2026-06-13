import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

// Initialize Firebase Admin
let firebaseAdminConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseAdminConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (err) {
  console.error("Error reading firebase-applet-config.json:", err);
}

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseAdminConfig.projectId;
const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseAdminConfig.firestoreDatabaseId;

if (!getApps().length) {
  console.log(`Initializing Firebase Admin for Project: ${projectId}`);
  initializeApp({
    projectId: projectId,
  });
}

const firestore = getFirestore(databaseId);
const authAdmin = getAuth();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_for_development_purposes";

// Local DB Fallback (for "Bypass Firebase" mode or failures)
const LOCAL_DB_PATH = path.join(process.cwd(), "local_db.json");
if (!fs.existsSync(LOCAL_DB_PATH)) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ custom_users: {}, users: {} }, null, 2));
}

const getLocalDb = () => JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8"));
const saveLocalDb = (data: any) => fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));

// Helper to call Firestore with fallback
const getCollection = (name: string) => {
  return {
    doc: (id: string) => {
      return {
        get: async () => {
          try {
            const res = await firestore.collection(name).doc(id).get();
            return res;
          } catch (e: any) {
            console.error(`[AUTH DIAGNOSTIC] Firestore GET failed for ${name}/${id}:`, e.message);
            const data = getLocalDb();
            const record = data[name]?.[id];
            return {
              exists: !!record,
              data: () => record,
              id
            };
          }
        },
        set: async (val: any) => {
          try {
            await firestore.collection(name).doc(id).set(val);
          } catch (e: any) {
            console.error(`[AUTH DIAGNOSTIC] Firestore SET failed for ${name}/${id}:`, e.message);
            const data = getLocalDb();
            if (!data[name]) data[name] = {};
            data[name][id] = { ...val, updatedAt: new Date().toISOString() };
            saveLocalDb(data);
          }
        }
      };
    }
  };
};

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Custom Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email: rawEmail, password, displayName } = req.body;
    const email = rawEmail?.toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Basic Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const userEntry = getCollection("custom_users").doc(email);
    const doc = await userEntry.get();

    if (doc.exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      password: hashedPassword,
      displayName: displayName || email.split("@")[0],
      createdAt: new Date().toISOString(),
    };

    await userEntry.set(newUser);

    // Also sync to 'users' collection
    await getCollection("users").doc(email).set({
      userId: email,
      fullName: displayName || email.split("@")[0],
      email: email,
      role: 'Sales Cashier',
      createdAt: new Date().toISOString()
    });

    let firebaseToken = "";
    try {
      firebaseToken = await authAdmin.createCustomToken(email);
    } catch (e) {
      console.warn("AuthAdmin failed to create custom token, continuing without it.");
    }

    const token = jwt.sign({ email, firebaseToken }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ ...userWithoutPassword, firebaseToken });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const userEntry = getCollection("custom_users").doc(email);
    const doc = await userEntry.get();

    if (!doc.exists) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = doc.data() as any;
    if (!user?.password) {
      return res.status(401).json({ message: "Account configuration error. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let firebaseToken = "";
    try {
      firebaseToken = await authAdmin.createCustomToken(email);
    } catch (e) {
      console.warn("AuthAdmin failed to create custom token during login.");
    }

    const token = jwt.sign({ email, firebaseToken }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, firebaseToken });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const userEntry = getCollection("custom_users").doc(decoded.email);
    const doc = await userEntry.get();

    if (!doc.exists) return res.status(401).json({ message: "User not found" });

    let firebaseToken = "";
    try {
      firebaseToken = await authAdmin.createCustomToken(decoded.email);
    } catch (e) {}

    const { password: _, ...userWithoutPassword } = doc.data() as any;
    res.json({ ...userWithoutPassword, firebaseToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ message: "Logged out" });
});

// Serve frontend assets & Boot listen instances
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();

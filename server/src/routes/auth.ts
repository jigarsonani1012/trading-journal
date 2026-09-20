import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User.js";
import { AccountModel } from "../models/Account.js";
import { signToken, requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { sendWelcomeConfirmationEmail } from "../services/mailer.js";

const router = Router();

// Helper ID generator
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = genId("usr");
    const accountId = genId("acc");

    // Create default primary trading account
    const defaultAccount = await AccountModel.create({
      _id: accountId,
      userId,
      name: "Primary Trading Account",
      currency: "USD",
      startingBalance: 25000,
      defaultRiskPercent: 1.0,
      color: "#3b82f6",
      isDefault: true,
    });

    // Create user
    const user = await UserModel.create({
      _id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      activeAccountId: accountId,
    });

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    // Send welcome confirmation email (async)
    sendWelcomeConfirmationEmail({ name: user.name, email: user.email }).catch((e) =>
      console.error("Email send error:", e.message)
    );

    return res.status(201).json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        activeAccountId: user.activeAccountId,
      },
      account: defaultAccount,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Load active account or default
    let activeAccount = user.activeAccountId
      ? await AccountModel.findById(user.activeAccountId)
      : await AccountModel.findOne({ userId: user._id, isDefault: true });

    if (!activeAccount) {
      // Create one if none exists
      activeAccount = await AccountModel.create({
        _id: genId("acc"),
        userId: user._id,
        name: "Primary Trading Account",
        currency: "USD",
        startingBalance: 25000,
        defaultRiskPercent: 1.0,
        color: "#3b82f6",
        isDefault: true,
      });
      user.activeAccountId = activeAccount._id;
      await user.save();
    }

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        activeAccountId: activeAccount._id,
      },
      account: activeAccount,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const accounts = await AccountModel.find({ userId: req.userId }).lean();
    const activeAccount = accounts.find((a) => a._id === user.activeAccountId) || accounts[0];

    return res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        activeAccountId: activeAccount?._id,
      },
      account: activeAccount,
      accounts,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/google ───────────────────────────────────────────────────
router.post("/google", async (req, res, next) => {
  try {
    const { credential, email, name, googleId } = req.body;

    let userEmail = email;
    let userName = name;

    // Decode Google JWT if credential provided
    if (credential) {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
        }
      } catch {
        /* fallback to body values */
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: "Google authentication failed. No email provided." });
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    let user = await UserModel.findOne({ email: cleanEmail });

    let activeAccount = null;

    if (!user) {
      // Create new user via Google
      const userId = genId("usr");
      const accountId = genId("acc");

      activeAccount = await AccountModel.create({
        _id: accountId,
        userId,
        name: "Primary Trading Account",
        currency: "USD",
        startingBalance: 25000,
        defaultRiskPercent: 1.0,
        color: "#3b82f6",
        isDefault: true,
      });

      // Dummy random password hash for Google OAuth users
      const salt = await bcrypt.genSalt(10);
      const dummyPassword = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, salt);

      user = await UserModel.create({
        _id: userId,
        name: (userName || cleanEmail.split("@")[0]).trim(),
        email: cleanEmail,
        passwordHash: dummyPassword,
        activeAccountId: accountId,
      });

      // Send confirmation email to new Google user
      sendWelcomeConfirmationEmail({ name: user.name, email: user.email }).catch((e) =>
        console.error("Email send error:", e.message)
      );
    } else {
      // User exists, find their active account
      activeAccount = user.activeAccountId
        ? await AccountModel.findById(user.activeAccountId)
        : await AccountModel.findOne({ userId: user._id, isDefault: true });

      if (!activeAccount) {
        activeAccount = await AccountModel.create({
          _id: genId("acc"),
          userId: user._id,
          name: "Primary Trading Account",
          currency: "USD",
          startingBalance: 25000,
          defaultRiskPercent: 1.0,
          color: "#3b82f6",
          isDefault: true,
        });
        user.activeAccountId = activeAccount._id;
        await user.save();
      }
    }

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        activeAccountId: activeAccount._id,
      },
      account: activeAccount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

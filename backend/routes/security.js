import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const router = new Router();

// Brute-force protection (see the course's dictionary attack TP): 5 failed logins
// per email and IP, then wait 15 minutes.
// shortcut: in-memory, reset on restart and not shared between instances, use Redis if the API is scaled out.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function attemptKey(req, email) {
    return `${req.ip}|${String(email).toLowerCase()}`;
}

function retryAfterSeconds(key) {
    const entry = failures.get(key);
    if (!entry) return 0;
    if (entry.resetAt <= Date.now()) {
        failures.delete(key);
        return 0;
    }
    return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

function recordFailure(key) {
    const entry = failures.get(key);
    if (entry && entry.resetAt > Date.now()) entry.count += 1;
    else failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
}

// POST /api/security/login => renvoie un JWT
router.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.sendStatus(401);

    const key = attemptKey(req, email);
    const wait = retryAfterSeconds(key);
    if (wait > 0) {
        res.set("Retry-After", String(wait));
        return res.status(429).json({ form: ["Trop de tentatives, réessaie dans quelques minutes."] });
    }

    const user = await User.findOne({ where: { email } });
    // Same 401 for unknown email and wrong password: don't reveal which accounts exist
    if (!user || !(await bcrypt.compare(password, user.password))) {
        recordFailure(key);
        return res.sendStatus(401);
    }

    failures.delete(key);
    const token = jwt.sign(
        { role: user.role },
        process.env.JWT_SECRET,
        { subject: user.id, expiresIn: "2h" },
    );

    res.json({ token });
});

export default router;

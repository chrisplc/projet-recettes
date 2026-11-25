import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Reads "Authorization: Bearer <token>" and puts the logged-in user in req.user
export default async function checkAuth(req, res, next) {
    const [type, token] = req.headers.authorization?.split(" ") ?? [];
    if (type !== "Bearer" || !token) return res.sendStatus(401);

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.sendStatus(401);
    }

    // Reload from the database: a deleted user or a changed role takes effect right away
    const user = await User.findByPk(payload.sub);
    if (!user) return res.sendStatus(401);

    req.user = user;
    next();
}

import { Router } from "express";
import { User } from "../models/index.js";
import checkAuth from "../middlewares/check-auth.js";
import checkRole from "../middlewares/check-role.js";
import { sendError } from "../utils/errors.js";
import { listOptions, pageOf } from "../utils/list-query.js";
import { uuidParam } from "../utils/uuid-param.js";

const router = new Router();

router.param("id", uuidParam);

// POST /api/users => inscription
router.post("", async (req, res) => {
    // Only pick allowed fields: a client must never choose its own role
    const { email, password } = req.body ?? {};
    try {
        const user = await User.create({ email, password });
        res.status(201).json(user);
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ email: ["Cet email est déjà utilisé"] });
        }
        sendError(res, error);
    }
});

// GET /api/users/me => the logged-in user
router.get("/me", checkAuth, (req, res) => {
    res.json(req.user);
});

// Everything below is admin only
router.use(checkAuth, checkRole("ADMIN"));

// GET /api/users?search=&sort=&page=&itemsPerPage=
router.get("", async (req, res) => {
    const options = listOptions(req.query, {
        sortable: ["email", "role", "createdAt"],
        searchable: "email",
        defaultSort: "email",
    });
    const result = await User.findAndCountAll(options);
    res.json(pageOf(result, options));
});

router.get("/:id", async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.sendStatus(404);
    res.json(user);
});

// PATCH /api/users/:id { role } => promote or demote
router.patch("/:id", async (req, res) => {
    // An admin can't change their own role: there would be no admin left to fix it
    if (req.params.id === req.user.id) return res.status(422).json({ role: ["Tu ne peux pas changer ton propre rôle"] });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.sendStatus(404);
    if (!["USER", "ADMIN"].includes(req.body?.role)) return res.status(422).json({ role: ["Rôle invalide"] });

    await user.update({ role: req.body.role });
    res.json(user);
});

router.delete("/:id", async (req, res) => {
    if (req.params.id === req.user.id) return res.status(422).json({ form: ["Tu ne peux pas supprimer ton propre compte"] });

    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.sendStatus(404);
    res.sendStatus(204);
});

export default router;

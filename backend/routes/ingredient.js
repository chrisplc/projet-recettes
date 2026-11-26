import { Router } from "express";
import { Ingredient } from "../models/index.js";
import checkAuth from "../middlewares/check-auth.js";
import checkRole from "../middlewares/check-role.js";
import { sendError } from "../utils/errors.js";
import { listOptions, pageOf } from "../utils/list-query.js";
import { uuidParam } from "../utils/uuid-param.js";

// Shared catalogue: every logged-in user reads and adds, only admins edit and delete
const router = new Router();

router.use(checkAuth);
router.param("id", uuidParam);

// GET /api/ingredients?search=&sort=&page=&itemsPerPage=
router.get("", async (req, res) => {
    const options = listOptions(req.query, {
        sortable: ["name", "unit", "createdAt"],
        searchable: "name",
        defaultSort: "name",
    });
    const result = await Ingredient.findAndCountAll(options);
    res.json(pageOf(result, options));
});

router.get("/:id", async (req, res) => {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) return res.sendStatus(404);
    res.json(ingredient);
});

router.post("", async (req, res) => {
    const { name, unit } = req.body ?? {};
    try {
        res.status(201).json(await Ingredient.create({ name: name?.trim(), unit }));
    } catch (error) {
        sendError(res, error);
    }
});

router.patch("/:id", checkRole("ADMIN"), async (req, res) => {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) return res.sendStatus(404);

    const { name, unit } = req.body ?? {};
    try {
        await ingredient.update({ name: name?.trim() ?? ingredient.name, unit: unit ?? ingredient.unit });
        res.json(ingredient);
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:id", checkRole("ADMIN"), async (req, res) => {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) return res.sendStatus(404);
    try {
        await ingredient.destroy();
        res.sendStatus(204);
    } catch (error) {
        sendError(res, error);
    }
});

export default router;

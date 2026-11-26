import { Router } from "express";
import { Op } from "sequelize";
import { connection, Ingredient, Recipe, User } from "../models/index.js";
import checkAuth from "../middlewares/check-auth.js";
import { sendError } from "../utils/errors.js";
import { listOptions, pageOf } from "../utils/list-query.js";
import { isUuid, uuidParam } from "../utils/uuid-param.js";

const router = new Router();

router.use(checkAuth);
router.param("id", uuidParam);

const authorInclude = { model: User, as: "author", attributes: ["id", "email"] };

// What a user may read: public recipes and their own. Admins read everything.
function visibleTo(user) {
    if (user.role === "ADMIN") return {};
    return { [Op.or]: [{ visibility: "PUBLIC" }, { authorId: user.id }] };
}

function serialize(recipe) {
    const { Ingredients, ...rest } = recipe.toJSON();
    return {
        ...rest,
        ingredients: Ingredients?.map(({ RecipeIngredient, ...ingredient }) => ({
            ...ingredient,
            quantity: RecipeIngredient.quantity,
        })),
    };
}

// Checks the ingredients sent by the client: [{ ingredientId, quantity }]
async function parseIngredients(input) {
    if (input === undefined) return { lines: undefined };
    if (!Array.isArray(input)) return { error: "La liste d'ingrédients est invalide" };

    const lines = new Map();
    for (const line of input) {
        const quantity = Number(line?.quantity);
        if (!isUuid(line?.ingredientId) || !Number.isFinite(quantity) || quantity <= 0) {
            return { error: "Chaque ingrédient doit avoir une quantité positive" };
        }
        lines.set(line.ingredientId, quantity);
    }
    const found = await Ingredient.count({ where: { id: [...lines.keys()] } });
    if (found !== lines.size) return { error: "Un ingrédient n'existe pas" };
    return { lines };
}

async function saveIngredients(recipe, lines, transaction) {
    await recipe.setIngredients([], { transaction });
    for (const [ingredientId, quantity] of lines) {
        await recipe.addIngredient(ingredientId, { through: { quantity }, transaction });
    }
}

async function findWithIngredients(id) {
    return Recipe.findByPk(id, {
        include: [authorInclude, { model: Ingredient, through: { attributes: ["quantity"] } }],
    });
}

// GET /api/recipes?search=&sort=&page=&itemsPerPage=&mine=true
router.get("", async (req, res) => {
    const options = listOptions(req.query, {
        sortable: ["title", "visibility", "createdAt"],
        searchable: "title",
        defaultSort: "-createdAt",
    });
    const filters = [options.where, visibleTo(req.user)];
    if (req.query.mine === "true") filters.push({ authorId: req.user.id });

    const result = await Recipe.findAndCountAll({
        ...options,
        where: { [Op.and]: filters },
        include: [authorInclude],
    });
    res.json(pageOf(result, options));
});

router.get("/:id", async (req, res) => {
    const recipe = await findWithIngredients(req.params.id);
    const canRead = recipe && (
        recipe.visibility === "PUBLIC" || recipe.authorId === req.user.id || req.user.role === "ADMIN"
    );
    // 404 rather than 403: someone else's private recipe must not even appear to exist
    if (!canRead) return res.sendStatus(404);
    res.json(serialize(recipe));
});

router.post("", async (req, res) => {
    const { title, description, steps, imageUrl, visibility } = req.body ?? {};
    const { lines, error } = await parseIngredients(req.body?.ingredients ?? []);
    if (error) return res.status(422).json({ ingredients: [error] });

    try {
        const recipe = await connection.transaction(async (transaction) => {
            const created = await Recipe.create(
                { title, description, steps, imageUrl, visibility, authorId: req.user.id },
                { transaction },
            );
            await saveIngredients(created, lines, transaction);
            return created;
        });
        res.status(201).json(serialize(await findWithIngredients(recipe.id)));
    } catch (error) {
        sendError(res, error);
    }
});

router.patch("/:id", async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.id);
    const isOwner = recipe?.authorId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    if (!recipe || (!isOwner && !isAdmin && recipe.visibility !== "PUBLIC")) return res.sendStatus(404);
    if (!isOwner && !isAdmin) return res.sendStatus(403);

    const body = req.body ?? {};
    // An admin moderating someone else's recipe can only change its visibility (unpublish it)
    const allowed = isOwner ? ["title", "description", "steps", "imageUrl", "visibility"] : ["visibility"];
    const changes = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key]]));

    const { lines, error } = isOwner ? await parseIngredients(body.ingredients) : { lines: undefined };
    if (error) return res.status(422).json({ ingredients: [error] });

    try {
        await connection.transaction(async (transaction) => {
            await recipe.update(changes, { transaction });
            if (lines) await saveIngredients(recipe, lines, transaction);
        });
        res.json(serialize(await findWithIngredients(recipe.id)));
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:id", async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.id);
    const isOwner = recipe?.authorId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    if (!recipe || (!isOwner && !isAdmin && recipe.visibility !== "PUBLIC")) return res.sendStatus(404);
    if (!isOwner && !isAdmin) return res.sendStatus(403);

    await recipe.destroy();
    res.sendStatus(204);
});

export default router;

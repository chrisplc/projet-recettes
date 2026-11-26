import { Router } from "express";
import { Op } from "sequelize";
import { Ingredient, Recipe, ShoppingList, ShoppingListItem, User } from "../models/index.js";
import checkAuth from "../middlewares/check-auth.js";
import { sendError } from "../utils/errors.js";
import { listOptions, pageOf } from "../utils/list-query.js";
import { isUuid, uuidParam } from "../utils/uuid-param.js";

// Shopping lists are private: only the owner reads and edits.
// An admin can read and delete any list (supervision), never edit its content.
const router = new Router();

router.use(checkAuth);
router.param("id", uuidParam);
router.param("itemId", uuidParam);
router.param("recipeId", uuidParam);

const ownerInclude = { model: User, as: "owner", attributes: ["id", "email"] };
const itemsInclude = { model: ShoppingListItem, as: "items", include: [Ingredient] };

// Loads :id into req.list. mode "read" lets admins in, mode "write" is owner only.
function loadList(mode) {
    return async (req, res, next) => {
        const list = await ShoppingList.findByPk(req.params.id);
        const isOwner = list?.ownerId === req.user.id;
        const isAdmin = req.user.role === "ADMIN";
        if (!list || (!isOwner && !isAdmin)) return res.sendStatus(404);
        if (mode === "write" && !isOwner) return res.sendStatus(403);
        req.list = list;
        next();
    };
}

async function fullList(id) {
    return ShoppingList.findByPk(id, {
        include: [ownerInclude, itemsInclude],
        order: [[{ model: ShoppingListItem, as: "items" }, "createdAt", "ASC"]],
    });
}

// Adds quantity of an ingredient, merging with the existing line if any
async function addToList(list, ingredientId, quantity) {
    const [item, created] = await ShoppingListItem.findOrCreate({
        where: { shoppingListId: list.id, ingredientId },
        defaults: { quantity },
    });
    if (!created) await item.update({ quantity: item.quantity + quantity, checked: false });
}

// GET /api/shopping-lists?search=&sort=&page=&itemsPerPage=&all=true (all: admins only)
router.get("", async (req, res) => {
    const options = listOptions(req.query, {
        sortable: ["name", "createdAt"],
        searchable: "name",
        defaultSort: "-createdAt",
    });
    const seeAll = req.user.role === "ADMIN" && req.query.all === "true";
    const where = { [Op.and]: [options.where, seeAll ? {} : { ownerId: req.user.id }] };

    const result = await ShoppingList.findAndCountAll({ ...options, where, include: [ownerInclude] });
    res.json(pageOf(result, options));
});

router.post("", async (req, res) => {
    try {
        const list = await ShoppingList.create({ name: req.body?.name?.trim(), ownerId: req.user.id });
        res.status(201).json(await fullList(list.id));
    } catch (error) {
        sendError(res, error);
    }
});

router.get("/:id", loadList("read"), async (req, res) => {
    res.json(await fullList(req.list.id));
});

router.patch("/:id", loadList("write"), async (req, res) => {
    try {
        await req.list.update({ name: req.body?.name?.trim() ?? req.list.name });
        res.json(await fullList(req.list.id));
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:id", loadList("read"), async (req, res) => {
    await req.list.destroy();
    res.sendStatus(204);
});

// POST /api/shopping-lists/:id/items { ingredientId, quantity }
router.post("/:id/items", loadList("write"), async (req, res) => {
    const { ingredientId } = req.body ?? {};
    const quantity = Number(req.body?.quantity ?? 1);
    if (!isUuid(ingredientId) || !(await Ingredient.findByPk(ingredientId))) {
        return res.status(422).json({ ingredientId: ["Ingrédient introuvable"] });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(422).json({ quantity: ["La quantité doit être positive"] });
    }
    await addToList(req.list, ingredientId, quantity);
    res.status(201).json(await fullList(req.list.id));
});

// POST /api/shopping-lists/:id/recipes/:recipeId => adds every ingredient of a recipe
router.post("/:id/recipes/:recipeId", loadList("write"), async (req, res) => {
    const visible = req.user.role === "ADMIN"
        ? {}
        : { [Op.or]: [{ visibility: "PUBLIC" }, { authorId: req.user.id }] };
    const recipe = await Recipe.findOne({
        where: { id: req.params.recipeId, ...visible },
        include: [{ model: Ingredient, through: { attributes: ["quantity"] } }],
    });
    if (!recipe) return res.sendStatus(404);

    for (const ingredient of recipe.Ingredients) {
        await addToList(req.list, ingredient.id, ingredient.RecipeIngredient.quantity);
    }
    res.status(201).json(await fullList(req.list.id));
});

router.patch("/:id/items/:itemId", loadList("write"), async (req, res) => {
    const item = await ShoppingListItem.findOne({ where: { id: req.params.itemId, shoppingListId: req.list.id } });
    if (!item) return res.sendStatus(404);

    const changes = {};
    if ("checked" in (req.body ?? {})) changes.checked = req.body.checked === true;
    if ("quantity" in (req.body ?? {})) changes.quantity = Number(req.body.quantity);
    try {
        await item.update(changes);
        res.json(await fullList(req.list.id));
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:id/items/:itemId", loadList("write"), async (req, res) => {
    const deleted = await ShoppingListItem.destroy({ where: { id: req.params.itemId, shoppingListId: req.list.id } });
    if (!deleted) return res.sendStatus(404);
    res.sendStatus(204);
});

export default router;

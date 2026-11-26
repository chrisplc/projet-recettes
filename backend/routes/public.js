import { Router } from "express";
import { Recipe, User } from "../models/index.js";

// No auth: what the landing page shows to visitors. Only public recipes, only safe fields.
const router = new Router();

router.get("/recipes", async (req, res) => {
    const recipes = await Recipe.findAll({
        where: { visibility: "PUBLIC" },
        attributes: ["id", "title", "description", "imageUrl", "createdAt"],
        include: [{ model: User, as: "author", attributes: ["email"] }],
        order: [["createdAt", "DESC"]],
        limit: 6,
    });
    res.json(recipes.map((recipe) => {
        const { author, ...rest } = recipe.toJSON();
        // Only the part before @: an author's full email is not public data
        return { ...rest, author: author.email.split("@")[0] };
    }));
});

export default router;

import { Router } from "express";
import userRouter from "./user.js";
import securityRouter from "./security.js";
import ingredientRouter from "./ingredient.js";
import recipeRouter from "./recipe.js";
import shoppingListRouter from "./shopping-list.js";
import publicRouter from "./public.js";

const router = new Router();

router.use("/users", userRouter);
router.use("/security", securityRouter);
router.use("/ingredients", ingredientRouter);
router.use("/recipes", recipeRouter);
router.use("/shopping-lists", shoppingListRouter);
router.use("/public", publicRouter);

export default router;

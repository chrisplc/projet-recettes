import connection from "./db.js";
import User from "./user.js";
import Ingredient from "./ingredient.js";
import Recipe from "./recipe.js";
import RecipeIngredient from "./recipe-ingredient.js";
import ShoppingList from "./shopping-list.js";
import ShoppingListItem from "./shopping-list-item.js";

// A recipe belongs to its author, deleted with them
User.hasMany(Recipe, { foreignKey: { name: "authorId", allowNull: false }, onDelete: "CASCADE" });
Recipe.belongsTo(User, { as: "author", foreignKey: "authorId" });

// Many-to-many Recipe <-> Ingredient through RecipeIngredient.
// Deleting a recipe removes its lines, deleting an ingredient used in a recipe is refused.
Recipe.belongsToMany(Ingredient, { through: RecipeIngredient, foreignKey: "recipeId", otherKey: "ingredientId", onDelete: "CASCADE" });
Ingredient.belongsToMany(Recipe, { through: RecipeIngredient, foreignKey: "ingredientId", otherKey: "recipeId", onDelete: "RESTRICT" });

// A shopping list belongs to its owner, deleted with them
User.hasMany(ShoppingList, { foreignKey: { name: "ownerId", allowNull: false }, onDelete: "CASCADE" });
ShoppingList.belongsTo(User, { as: "owner", foreignKey: "ownerId" });

ShoppingList.hasMany(ShoppingListItem, { as: "items", foreignKey: { name: "shoppingListId", allowNull: false }, onDelete: "CASCADE" });
ShoppingListItem.belongsTo(ShoppingList, { foreignKey: "shoppingListId" });

// An ingredient still used in a list can't be deleted (RESTRICT)
Ingredient.hasMany(ShoppingListItem, { foreignKey: { name: "ingredientId", allowNull: false }, onDelete: "RESTRICT" });
ShoppingListItem.belongsTo(Ingredient, { foreignKey: "ingredientId" });

export { connection, User, Ingredient, Recipe, RecipeIngredient, ShoppingList, ShoppingListItem };

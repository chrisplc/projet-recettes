import { Model, DataTypes } from "sequelize";
import connection from "./db.js";

// Relation table between Recipe and Ingredient, with the quantity used
class RecipeIngredient extends Model { }

RecipeIngredient.init({
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: { args: [0], msg: "La quantité doit être positive" } },
    },
}, {
    sequelize: connection,
});

export default RecipeIngredient;

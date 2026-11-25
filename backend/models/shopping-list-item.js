import { Model, DataTypes } from "sequelize";
import connection from "./db.js";

// Relation table between ShoppingList and Ingredient, with the quantity and a checkbox
class ShoppingListItem extends Model { }

ShoppingListItem.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1,
        validate: { min: { args: [0], msg: "La quantité doit être positive" } },
    },
    checked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize: connection,
});

export default ShoppingListItem;

import { Model, DataTypes } from "sequelize";
import connection from "./db.js";

class ShoppingList extends Model { }

ShoppingList.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Le nom est obligatoire" } },
    },
}, {
    sequelize: connection,
});

export default ShoppingList;

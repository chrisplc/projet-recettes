import { Model, DataTypes } from "sequelize";
import connection from "./db.js";

class Ingredient extends Model { }

Ingredient.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: { msg: "Le nom est obligatoire" } },
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "g",
        validate: { notEmpty: { msg: "L'unité est obligatoire" } },
    },
}, {
    sequelize: connection,
});

export default Ingredient;

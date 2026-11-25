import { Model, DataTypes } from "sequelize";
import connection from "./db.js";

class Recipe extends Model { }

Recipe.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Le titre est obligatoire" } },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
    },
    steps: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
    },
    imageUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        // Empty string from the form means "no image"
        set(value) {
            this.setDataValue("imageUrl", value ? String(value).trim() : null);
        },
        validate: { isUrl: { args: { protocols: ["http", "https"], require_protocol: true }, msg: "Lien d'image invalide (http ou https)" } },
    },
    visibility: {
        type: DataTypes.ENUM("PRIVATE", "PUBLIC"),
        allowNull: false,
        defaultValue: "PRIVATE",
    },
}, {
    sequelize: connection,
});

export default Recipe;

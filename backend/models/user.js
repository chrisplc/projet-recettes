import { Model, DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import connection from "./db.js";

class User extends Model {
    // Never send the password hash to the client
    toJSON() {
        const { password, ...rest } = this.get();
        return rest;
    }
}

User.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: { msg: "Email invalide" } },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: { args: [8, 100], msg: "8 caractères minimum" } },
    },
    role: {
        type: DataTypes.ENUM("USER", "ADMIN"),
        allowNull: false,
        defaultValue: "USER",
    },
}, {
    sequelize: connection,
});

async function hashPassword(user) {
    user.password = await bcrypt.hash(user.password, await bcrypt.genSalt());
}

User.addHook("beforeCreate", hashPassword);
User.addHook("beforeUpdate", (user) => {
    if (user.changed("password")) return hashPassword(user);
});

export default User;

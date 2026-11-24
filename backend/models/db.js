import { Sequelize } from "sequelize";

const connection = new Sequelize("postgres://recettes:recettes@localhost:5432/recettes", {
    logging: false,
});

connection
    .authenticate()
    .then(() => console.log("Database connected"))
    .catch((error) => console.error("Database connection failed:", error.name, error.message));

export default connection;

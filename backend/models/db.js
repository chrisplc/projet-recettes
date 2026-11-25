import { Sequelize } from "sequelize";

const connection = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
});

connection
    .authenticate()
    .then(() => console.log("Database connected"))
    .catch((error) => console.error("Database connection failed:", error.name, error.message));

export default connection;

import { connection } from "./models/index.js";

await connection.sync({ alter: true });
console.log("Database synced");
await connection.close();

import express from "express";
import cors from "cors";
import "./models/db.js";
import apiRouter from "./routes/api.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ ok: true });
});

app.use("/api", apiRouter);

const PORT = process.env.PORT ?? 3000;
// Express 5 passes listen errors (port already used...) to this callback instead of crashing
app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Server listening on port ${PORT}`);
});


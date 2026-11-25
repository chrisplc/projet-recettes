// Turns Sequelize errors into the API's error format: { field: ["message"] }
export function sendError(res, error) {
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
        const errors = {};
        for (const { path, message } of error.errors) {
            (errors[path] ??= []).push(message);
        }
        return res.status(error.name === "SequelizeUniqueConstraintError" ? 409 : 422).json(errors);
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(422).json({ form: ["Élément lié introuvable ou encore utilisé"] });
    }
    console.error(error);
    res.sendStatus(500);
}

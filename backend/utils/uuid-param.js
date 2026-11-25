const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// router.param handler: a malformed id is a 404, not a Postgres error turned into a 500
export function uuidParam(req, res, next, value) {
    if (!UUID.test(value)) return res.sendStatus(404);
    next();
}

export function isUuid(value) {
    return typeof value === "string" && UUID.test(value);
}

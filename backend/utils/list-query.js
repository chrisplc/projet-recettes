import { Op } from "sequelize";

const MAX_ITEMS_PER_PAGE = 50;

// Reads ?page, ?itemsPerPage, ?sort and ?search from the query string.
// sortable and searchable are whitelists: the client never picks a raw column name.
export function listOptions(query, { sortable, searchable, defaultSort }) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const itemsPerPage = Math.min(
        MAX_ITEMS_PER_PAGE,
        Math.max(1, Number.parseInt(query.itemsPerPage, 10) || 10),
    );

    const sort = typeof query.sort === "string" ? query.sort : defaultSort;
    const key = sort.replace(/^-/, "");
    const direction = sort.startsWith("-") ? "DESC" : "ASC";
    const order = [[sortable.includes(key) ? key : defaultSort.replace(/^-/, ""), direction]];

    const search = typeof query.search === "string" ? query.search.trim() : "";
    const where = search && searchable
        ? { [searchable]: { [Op.iLike]: `%${search}%` } }
        : {};

    return { page, itemsPerPage, order, where, offset: (page - 1) * itemsPerPage, limit: itemsPerPage };
}

// Paginated response shape shared by every list route
export function pageOf({ rows, count }, { page, itemsPerPage }) {
    return { items: rows, total: count, page, itemsPerPage };
}

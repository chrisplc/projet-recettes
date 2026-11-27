import { connection, Ingredient, Recipe, User } from "./models/index.js";

// Dev data: an admin account and a starter ingredient catalogue. Safe to run twice.
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@recettes.dev";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";

const ingredients = [
    ["Farine", "g"], ["Sucre", "g"], ["Beurre", "g"], ["Œuf", "pièce"], ["Lait", "ml"],
    ["Sel", "g"], ["Poivre", "g"], ["Huile d'olive", "ml"], ["Tomate", "pièce"], ["Oignon", "pièce"],
    ["Ail", "gousse"], ["Pâtes", "g"], ["Riz", "g"], ["Poulet", "g"], ["Crème fraîche", "ml"],
    ["Fromage râpé", "g"], ["Chocolat noir", "g"], ["Levure chimique", "g"], ["Carotte", "pièce"], ["Pomme de terre", "pièce"],
];

const [admin, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: { password: adminPassword, role: "ADMIN" },
});
if (!created && admin.role !== "ADMIN") await admin.update({ role: "ADMIN" });
console.log(`Admin: ${adminEmail}${created ? " (créé)" : " (existait déjà)"}`);

for (const [name, unit] of ingredients) {
    await Ingredient.findOrCreate({ where: { name }, defaults: { unit } });
}
console.log(`${ingredients.length} ingrédients en base`);

// Public example recipes by the admin, with photos from Unsplash
const photo = (id) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;
const recipes = [
    {
        title: "Pancakes moelleux",
        description: "Le petit-déjeuner du dimanche, prêt en 20 minutes.",
        imageUrl: photo("photo-1567620905732-2d1ec7ab7445"),
        steps: "Mélanger la farine, le sucre et la levure.\nAjouter les œufs puis le lait petit à petit.\nLaisser reposer 10 minutes.\nCuire à la poêle beurrée, 1 minute par face.",
        lines: [["Farine", 250], ["Sucre", 30], ["Levure chimique", 10], ["Œuf", 2], ["Lait", 300], ["Beurre", 20]],
    },
    {
        title: "Pizza tomate et fromage",
        description: "Une pâte maison, une sauce tomate simple et beaucoup de fromage.",
        imageUrl: photo("photo-1565299624946-b28f40a0ae38"),
        steps: "Préparer la pâte avec la farine, l'huile et un peu de sel.\nÉtaler la pâte.\nAjouter les tomates écrasées et le fromage.\nCuire 12 minutes à 250 °C.",
        lines: [["Farine", 300], ["Huile d'olive", 30], ["Sel", 5], ["Tomate", 3], ["Fromage râpé", 150]],
    },
    {
        title: "Bowl de légumes",
        description: "Frais, coloré et prêt en un quart d'heure.",
        imageUrl: photo("photo-1512621776951-a57141f2eefd"),
        steps: "Cuire le riz.\nRâper les carottes et couper les tomates.\nAssembler dans un bol avec un filet d'huile d'olive.",
        lines: [["Riz", 150], ["Carotte", 2], ["Tomate", 2], ["Huile d'olive", 15]],
    },
];

for (const { lines, ...data } of recipes) {
    const [recipe, recipeCreated] = await Recipe.findOrCreate({
        where: { title: data.title, authorId: admin.id },
        defaults: { ...data, visibility: "PUBLIC" },
    });
    if (!recipeCreated) continue;
    for (const [name, quantity] of lines) {
        const ingredient = await Ingredient.findOne({ where: { name } });
        await recipe.addIngredient(ingredient, { through: { quantity } });
    }
}
console.log(`${recipes.length} recettes publiques d'exemple en base`);

await connection.close();

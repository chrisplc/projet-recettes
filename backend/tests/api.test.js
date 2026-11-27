// End-to-end permission checks against a running API.
// Usage: npm run test:api (API_URL defaults to http://localhost:3000/api). Needs the seeded admin.
import assert from "node:assert";
const base = process.env.API_URL ?? "http://localhost:3000/api";
async function call(method, path, token, body) {
  const r = await fetch(base + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get("content-type") || "";
  return { s: r.status, d: ct.includes("json") ? await r.json() : null };
}
const eq = (r, s, msg) => assert.equal(r.s, s, `${msg}: attendu ${s}, reçu ${r.s} ${JSON.stringify(r.d)}`);
async function user() { const email = `u${Math.random().toString(36).slice(2)}@test.dev`; eq(await call("POST","/users",null,{email,password:"motdepasse1"}),201,"register"); const r = await call("POST","/security/login",null,{email,password:"motdepasse1"}); return { token: r.d.token, email }; }
const admin = (await call("POST","/security/login",null,{email:"admin@recettes.dev",password:"admin1234"})).d.token; assert.ok(admin, "admin login");
const a = await user(), b = await user();

// auth
eq(await call("GET","/ingredients"),401,"sans token");
eq(await call("GET","/ingredients","pas.un.token"),401,"token invalide");
eq(await call("GET","/users/me",a.token),200,"me");
// ingredients
let r = await call("GET","/ingredients?search=far&itemsPerPage=5",a.token); eq(r,200,"liste ingr"); assert.ok(r.d.items.some(i=>i.name==="Farine") && r.d.total>=1);
r = await call("GET","/ingredients?sort=-name&page=2&itemsPerPage=5",a.token); eq(r,200,"tri+page"); assert.equal(r.d.items.length,5);
eq(await call("GET","/ingredients?sort=password",a.token),200,"tri non autorisé ignoré");
const ing = await call("POST","/ingredients",a.token,{name:`Test ${Date.now()}`,unit:"g"}); eq(ing,201,"user ajoute ingr");
eq(await call("POST","/ingredients",a.token,{name:"Farine"}),409,"doublon ingr");
eq(await call("PATCH",`/ingredients/${ing.d.id}`,a.token,{name:"x"}),403,"user modifie ingr");
eq(await call("DELETE",`/ingredients/${ing.d.id}`,a.token),403,"user supprime ingr");
eq(await call("PATCH",`/ingredients/${ing.d.id}`,admin,{unit:"kg"}),200,"admin modifie ingr");
eq(await call("GET","/ingredients/pas-un-uuid",a.token),404,"uuid invalide");
// recipes
const farine = (await call("GET","/ingredients?search=Farine",a.token)).d.items[0];
const priv = await call("POST","/recipes",a.token,{title:"Crêpes privées",ingredients:[{ingredientId:farine.id,quantity:250}],role:"ADMIN",authorId:b.email}); eq(priv,201,"créer recette");
assert.equal(priv.d.visibility,"PRIVATE"); assert.equal(priv.d.ingredients[0].quantity,250); assert.equal(priv.d.author.email,a.email,"authorId client ignoré");
const pub = await call("POST","/recipes",a.token,{title:"Gâteau public",visibility:"PUBLIC",ingredients:[{ingredientId:farine.id,quantity:200},{ingredientId:ing.d.id,quantity:3}]}); eq(pub,201,"recette publique");
eq(await call("POST","/recipes",a.token,{title:""}),422,"titre vide");
eq(await call("POST","/recipes",a.token,{title:"x",ingredients:[{ingredientId:farine.id,quantity:-1}]}),422,"quantité négative");
eq(await call("GET",`/recipes/${priv.d.id}`,b.token),404,"B lit privée de A");
eq(await call("GET",`/recipes/${pub.d.id}`,b.token),200,"B lit publique de A");
r = await call("GET","/recipes?itemsPerPage=50",b.token); assert.ok(!r.d.items.some(x=>x.id===priv.d.id),"privée absente de la liste de B"); assert.ok(r.d.items.some(x=>x.id===pub.d.id));
eq(await call("PATCH",`/recipes/${pub.d.id}`,b.token,{title:"hack"}),403,"B modifie publique de A");
eq(await call("PATCH",`/recipes/${priv.d.id}`,b.token,{title:"hack"}),404,"B modifie privée de A");
eq(await call("DELETE",`/recipes/${pub.d.id}`,b.token),403,"B supprime publique de A");
r = await call("PATCH",`/recipes/${pub.d.id}`,a.token,{title:"Gâteau v2",ingredients:[{ingredientId:farine.id,quantity:300}]}); eq(r,200,"A modifie"); assert.equal(r.d.ingredients.length,1);
eq(await call("GET",`/recipes/${priv.d.id}`,admin),200,"admin lit privée");
r = await call("PATCH",`/recipes/${pub.d.id}`,admin,{visibility:"PRIVATE",title:"admin edit"}); eq(r,200,"admin dépublie"); assert.equal(r.d.visibility,"PRIVATE"); assert.equal(r.d.title,"Gâteau v2","admin ne change pas le titre");
eq(await call("GET",`/recipes/${pub.d.id}`,b.token),404,"dépubliée invisible pour B");
r = await call("GET","/recipes?mine=true",a.token); assert.ok(r.d.items.every(x=>x.authorId===r.d.items[0].authorId));
eq(await call("DELETE",`/ingredients/${farine.id}`,admin),422,"ingr utilisé non supprimable");
// shopping lists
const list = await call("POST","/shopping-lists",a.token,{name:"Courses"}); eq(list,201,"créer liste");
eq(await call("GET",`/shopping-lists/${list.d.id}`,b.token),404,"B lit liste de A");
eq(await call("POST",`/shopping-lists/${list.d.id}/items`,b.token,{ingredientId:farine.id,quantity:1}),404,"B ajoute à liste de A");
r = await call("POST",`/shopping-lists/${list.d.id}/items`,a.token,{ingredientId:farine.id,quantity:100}); eq(r,201,"ajout item");
r = await call("POST",`/shopping-lists/${list.d.id}/recipes/${priv.d.id}`,a.token); eq(r,201,"ajout recette"); assert.equal(r.d.items.find(i=>i.ingredientId===farine.id).quantity,350,"quantités fusionnées");
eq(await call("POST",`/shopping-lists/${list.d.id}/recipes/${priv.d.id}`,admin),403,"admin écrit dans liste de A");
const item = r.d.items[0];
r = await call("PATCH",`/shopping-lists/${list.d.id}/items/${item.id}`,a.token,{checked:true}); eq(r,200,"cocher"); assert.equal(r.d.items[0].checked,true);
r = await call("GET","/shopping-lists",b.token); assert.equal(r.d.total,0,"B ne voit aucune liste");
r = await call("GET","/shopping-lists?all=true",b.token); assert.equal(r.d.total,0,"all ignoré pour user");
r = await call("GET","/shopping-lists?all=true",admin); assert.ok(r.d.total>=1,"admin voit tout");
eq(await call("GET",`/shopping-lists/${list.d.id}`,admin),200,"admin lit liste");
eq(await call("DELETE",`/shopping-lists/${list.d.id}/items/${item.id}`,a.token),204,"suppr item");
// users admin
eq(await call("GET","/users",a.token),403,"user liste users");
r = await call("GET","/users?search=test.dev",admin); eq(r,200,"admin liste users"); assert.ok(r.d.items.every(u=>!("password" in u)),"pas de hash");
const bId = (await call("GET","/users/me",b.token)).d.id; const adminId = (await call("GET","/users/me",admin)).d.id;
eq(await call("PATCH",`/users/${bId}`,a.token,{role:"ADMIN"}),403,"user promeut");
eq(await call("PATCH",`/users/${adminId}`,admin,{role:"USER"}),422,"admin se rétrograde");
r = await call("PATCH",`/users/${bId}`,admin,{role:"ADMIN"}); eq(r,200,"admin promeut B"); assert.equal(r.d.role,"ADMIN");
eq(await call("GET","/users",b.token),200,"B admin immédiatement");
eq(await call("DELETE",`/users/${bId}`,admin),204,"admin supprime B");
eq(await call("GET","/users/me",b.token),401,"token de B supprimé refusé");
// cleanup
eq(await call("DELETE",`/shopping-lists/${list.d.id}`,a.token),204,"suppr liste");
eq(await call("DELETE",`/recipes/${priv.d.id}`,a.token),204,"suppr recette");
eq(await call("DELETE",`/recipes/${pub.d.id}`,admin),204,"admin suppr recette");
eq(await call("DELETE",`/ingredients/${ing.d.id}`,admin),204,"admin suppr ingr");
// Brute force: the 6th attempt on the same account is refused, even with the right password
const victim = await user();
for (let i = 0; i < 5; i++) eq(await call("POST","/security/login",null,{email:victim.email,password:"mauvais123"}),401,"échec "+(i+1));
eq(await call("POST","/security/login",null,{email:victim.email,password:"motdepasse1"}),429,"compte bloqué");
console.log("API OK: droits et anti brute force vérifiés");

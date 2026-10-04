const fs = require('fs');
const c = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');
const p = c.indexOf("case 'point-of-sale'");
console.log('Found at:', p);
if (p !== -1) {
  console.log(c.substring(p - 30, p + 80));
} else {
  console.log("Not found, searching for craft-collective case...");
  const q = c.indexOf("case 'craft-collective'");
  console.log(c.substring(q - 30, q + 100));
}

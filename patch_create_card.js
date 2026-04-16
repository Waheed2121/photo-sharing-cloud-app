const fs = require('fs');
let code = fs.readFileSync('frontend/script.js', 'utf8');

const regex = /function createCard\(image,\s*\{\s*adminMode\s*=\s*false\s*\}\s*=\s*\{\}\)\s*\{[\s\S]*?card\.innerHTML\s*=\s*`\s*<img\s*class="photo-card__image"\s*src="\$\{resolveCardImageUrl\(image\)\}"\s*alt="\$\{image\.title\s*\|\|\s*"Image"\}">\s*<div\s*class="photo-card__body">/;

const replacement = \`function createCard(image, { adminMode = false } = {}) {
    console.log("Image object:", image)

    const card = document.createElement("article")
    card.className = "photo-card card"

    const imageUrl = image.image_url || image.url || image.imageUrl || "https://source.unsplash.com/800x600/?nature";
    const finalUrl = imageUrl.startsWith("/uploads") ? "http://localhost:3000" + imageUrl : imageUrl;

    const averageRating = image.average_rating === null || image.average_rating === undefined
        ? "No ratings yet"
        : Number(image.average_rating).toFixed(1)

    card.innerHTML = \\`
        <img class="card-img" src="\${finalUrl}" alt="\${image.title || 'Image'}">
        <div class="photo-card__body">
\`;

code = code.replace(regex, replacement);

const errorListenerRegex = /(return card\n\})/g;
code = code.replace(errorListenerRegex, \`    const img = card.querySelector('img');
    if (img) {
        img.onerror = () => {
            img.src = "https://source.unsplash.com/800x600/?landscape";
        };
    }
    \$1\`);

fs.writeFileSync('frontend/script.js', code);

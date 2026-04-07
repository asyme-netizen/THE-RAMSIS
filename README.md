# THE RAMSIS

Static editorial site starter inspired by a premium digital broadsheet.

## Structure

- `index.html` — homepage
- `pages/article.html` — flagship article layout
- `pages/culture.html` — category page
- `pages/politics.html` — category page
- `pages/tech.html` — category page
- `pages/science.html` — category page
- `pages/opinion.html` — category page
- `pages/archive.html` — archive page
- `pages/about.html` — about / masthead page
- `assets/css/styles.css` — full styling system
- `assets/js/main.js` — lightweight interactions
- `components/` — reusable header/footer source snippets

## Hosting

This project is plain HTML/CSS/JS, so you can upload it directly to:

- cPanel / shared hosting
- Netlify
- Vercel static hosting
- GitHub Pages
- Cloudflare Pages

## AdSense placement suggestions

- Below the header on homepage
- Between article body paragraphs
- Above related stories
- Inside archive list after every 4 items

## Notes

This build closely matches the provided reference in layout and mood, while using original code and placeholder visuals so you can safely customize it further.


## Firebase setup
1. Create a Firebase project.
2. Add a Web App.
3. Copy the config into `assets/js/firebase-config.js`.
4. In Firebase Authentication, enable **Google** and **Email/Password**.
5. Add your GitHub Pages domain to **Authentication > Settings > Authorized domains**.
6. Deploy again.


## Business desk, SEO, and monetization notes

- Live markets and live business headlines are wired through the FMP market/news configuration in `assets/js/firebase-config.js`.
- Google AdSense placements are already added to the homepage, business page, business article page, and longform article page.
- To activate AdSense, edit `siteMonetizationConfig` in `assets/js/firebase-config.js`:
  - set `adsenseEnabled` to `true`
  - replace `adsenseClient` with your real `ca-pub-...`
  - replace the placeholder slot IDs in `adSlots`
- Dark and light mode are persistent across pages and responsive behavior is tuned for desktop, tablet, iPad, and mobile.

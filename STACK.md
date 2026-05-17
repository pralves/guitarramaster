- **Tailwind CSS** — utility-first CSS framework loaded via local CDN runtime build (`assets/resource_3fa48481346f.js`) for all layout, spacing, color, and responsive styling
- **Lucide** — icon library (`assets/lucide_latest_2eebd0ebe8c2.js`) used for the mobile menu icon and the three feature-card icons (layout-template, component, library) rendered via `<i data-lucide>` tags
- **Google Fonts** — web font CDN supplying the typographic stack (Oswald, Space Grotesk, Inter, Geist, Roboto, Montserrat, Poppins, Playfair Display, Instrument Serif, Merriweather, Bricolage Grotesque, Plus Jakarta Sans, Manrope, Work Sans, PT Serif, Geist Mono, Space Mono, Quicksand, Nunito) loaded from local `css2_*.css` stubs
- **Oswald** — display sans-serif used for the massive `MOVE FASTER` hero headline and AI section title via the `font-oswald` utility
- **Space Grotesk** — primary body sans-serif applied globally through the `font-space` body class
- **CSS Custom Properties** — used to drive the gradient-border effect on the Login button via the `--border-gradient` and `--border-radius-before` variables
- **CSS Mask Composite** — `-webkit-mask` / `mask-composite: exclude` technique that produces the 1px gradient border ring around the Login button
- **CSS Keyframe Animations** — five custom keyframes (`float1`, `float2`, `float3`, `spin1`, `spin2`) animating the decorative circles, squares, and triangles in the bottom-right overlay
- **CSS Mix Blend Modes** — `mix-blend-darken` on the hero headline, `mix-blend-multiply` on the decorative orb, and `mix-blend-overlay` on the floating shapes container for layered visual integration
- **Inline SVG** — used for currentColor-driven icons (arrows, calendar, refresh circle, dropdown chevron, list, Vercel/GitHub/Figma logos) so Tailwind text-color utilities can drive their fill/stroke
- **WebP** — modern raster image format used for the hero container background (`6e6457af-451b-416a-b0af-1a4eff_f12a0b260530.webp`)
- **Vanilla JavaScript** — small image-fallback script that intercepts `error` events on `<img>` tags and rotates among five stock URLs hashed from the original src

---

Landing Page (Guitarra Master)

- Arquivos adicionados:
	- [landing.html](landing.html) — página de vendas criada com HTML semântico (header, sections, footer).
	- [assets/css/landing.css](assets/css/landing.css) — estilos mobile-first, paleta azul escuro / laranja e textura sutil (impressão digital).
	- [js/landing.js](js/landing.js) — script vanilla para modal de captura de e-mail e rolagem suave do CTA.
	- [assets/images/teacher.svg](assets/images/teacher.svg) — placeholder SVG para a foto do professor (substituir pela foto profissional posteriormente).

- Teste local rápido:

	1. Abra um terminal na pasta do projeto (`guitarramaster.com.br`).
	2. Inicie um servidor estático (ex.: Python 3):

```powershell
python -m http.server 8000
```

	3. Acesse `http://localhost:8000/landing.html` no navegador.

- Observações:
	- O envio de leads no `js/landing.js` aponta para `/api/lead` como placeholder — integrar com o endpoint real de captura de e-mails.
	- Substitua `assets/images/teacher.svg` pela foto profissional (mantendo o mesmo nome/ratio) para melhor apresentação.


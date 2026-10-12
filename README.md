# Gabis Hunger Games

Mini videojuego de plataformas en pixel art, con dos niveles:

- **Nivel 1 · Gomitas of Love** (para cuando esté brava). Ella empieza brava, va
  encontrando gomitas por un jardín encantado y con cada una se le va pasando
  el enojo, hasta la escena final.
- **Nivel 2 · El asesinato de Pipu**. La detective recorre el jardín de noche,
  reúne 5 pistas, interroga a Chif y a Tiana y acusa al culpable desde su
  libreta. Arya, su perrita, la acompaña en los dos niveles.

Sin dependencias: HTML, CSS y JavaScript con Canvas 2D. Los sprites, los efectos
de sonido y la música se generan desde el código.

## Ejecutar

Necesitas Node.js 18 o superior.

```bash
npm start
```

Abre `http://localhost:5173`. La terminal también muestra una dirección para
abrirlo desde el teléfono si está en la misma wifi.

Alternativa sin Node: `python3 -m http.server 5173` y abrir la misma dirección.
Abrir `index.html` con doble clic no funciona, porque el navegador bloquea los
módulos de JavaScript en archivos locales.

## Controles

| Acción | Teclado | Teléfono |
| --- | --- | --- |
| Moverse | ← → o A / D | Botones ◀ ▶ |
| Saltar (mantener = salto más alto) | Espacio, W o ↑ | Botón SALTAR |
| Libreta de la detective (nivel 2) | L o E | Botón de libreta |
| Pausa | P o Esc | Botón de pausa |
| Silenciar | M | Botón de sonido |

En el teléfono se juega mejor en horizontal. El botón de pantalla completa
funciona en Android; en iPhone, Safari no lo permite.

## Personalizar

Todo lo que se cambia a menudo está en `src/config.js`:

- `texts.title`, `texts.levels`: el nombre del juego y de cada nivel en el menú.
- `texts.pipu`: todo el nivel 2 (pistas, coartadas, defensas, escena final).
- `arya`, `chif`, `tiana`, `pipu`: colores de los animales.
- `texts.finalMessage`: el mensaje final («Gracias por jugar conmigo, mi crespita hermosa»).
- `texts.bigText`: el texto grande de la escena final.
- `texts.finalNote`, `texts.endingAsk`, `texts.endingReply`: el resto de la escena final.
- `texts.subtitle`: la frase bajo el título.
- `texts.intro`: los avisos del comienzo.
- `texts.pickup`: lo que dice ella con cada gomita.
- `texts.moods`: el indicador emocional (un texto por estado).
- `texts.npc`: lo que dice él en cada punto del nivel.
- `her` y `him`: colores de pelo, piel y ropa de cada personaje.
- `physics`: velocidad, altura de salto, gravedad.
- `audio`: volumen, música sí/no, empezar en silencio.

Los niveles (plataformas, gomitas, pistas, corazoncitos, honguitos) están en
`src/levels/`. Si cambias uno, ejecuta `npm test`: comprueba con la física real
que todas las gomitas, las pistas y la meta siguen siendo alcanzables.

## Estructura

```
index.html        estructura de la página y pantallas
style.css         interfaz, diseño adaptable y controles táctiles
server.mjs        servidor local mínimo (npm start)
src/config.js     textos, colores y ajustes personalizables
src/main.js       arranque, interfaz, estados (inicio, pausa, final)
src/game.js       lógica: gomitas, emociones, pistas, sospechosos, Arya, finales
src/player.js     movimiento, salto, gravedad y colisiones
src/level.js      base común de los niveles (casillas, decoración)
src/levels/       gomitas.js (nivel 1) y pipu.js (nivel 2)
src/sprites.js    pixel art de personajes y objetos
src/renderer.js   dibujo del mundo, fondos y partículas
src/audio.js      efectos de sonido y música (Web Audio)
src/input.js      teclado y controles táctiles
tests/            pruebas de lógica (npm test)
```

## Publicarlo gratis

### Opción rápida: Netlify Drop

1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta del proyecto.
3. Te da un enlace `https://algo.netlify.app`. Crea una cuenta gratuita para que
   el enlace no caduque y para cambiarle el nombre.

### Opción con GitHub Pages

```bash
git init
git add .
git commit -m "Gomitas of Love"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gomitas-of-love.git
git push -u origin main
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
En un par de minutos queda en `https://TU_USUARIO.github.io/gomitas-of-love/`.
El repositorio tiene que ser público en el plan gratuito.

Las rutas del juego son relativas, así que funciona en cualquier subcarpeta.

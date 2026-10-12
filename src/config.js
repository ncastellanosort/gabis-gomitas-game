// ============================================================
//  GOMITAS OF LOVE — configuración personalizable
//  Cambia aquí textos, colores y ajustes sin tocar el resto.
// ============================================================

export const CONFIG = {
  // ---------- Textos ----------
  texts: {
    title: 'Gabis Hunger Games',
    subtitle: 'Dos misiones para la crespita más linda',
    // Menú de niveles
    levels: {
      gomitas: { tag: 'NIVEL 1', name: 'Gomitas of Love', desc: 'para cuando esté brava' },
      pipu: { tag: 'NIVEL 2', name: 'El asesinato de Pipu', desc: 'un caso para la detective' },
    },
    menu: 'MENÚ',
    hintKeyboard: 'Mover: ← → o A / D   ·   Saltar: Espacio, W o ↑',
    hintTouch: 'Usa los botones de la pantalla para moverte y saltar',
    rotateHint: 'Gira el teléfono: en horizontal se juega más rico',

    // Avisos que aparecen al empezar (uno tras otro)
    intro: [
      'ALERTA: novia brava detectada',
      'Misión de emergencia: encontrar las gomitas',
      'Nivel de peligro: novio en problemas',
    ],

    // Lo que dice ella al recoger cada gomita (en orden)
    pickup: [
      '¿Y esta gomita de dónde salió?',
      'Bueno... una más sí me como.',
      'Error 404: enojo no encontrado.',
      'Ay, no me hagas reír...',
      'NICOLAS!',
    ],

    // Indicador emocional del HUD (uno por cada estado, de 0 gomitas al máximo)
    moods: [
      'Brava nivel volcán',
      'Brava... pero curiosa',
      'Enojo en mantenimiento',
      'Sonrisita traicionera',
      'Derretida de ternura',
      'Enamoradísima',
    ],

    // Lo que dice él en cada punto del nivel donde aparece (en orden)
    npc: [
      '¡Amor! Traje tus gomitas... ¡ven por ellas!',
      '¿Viste? De las que te encantan.',
      '¡Acá arriba! El honguito ayuda.',
      'Esa carita ya casi sonríe...',
      '¡Qué saltos, mi amor!',
    ],

    allGomitas: '¡Todas las gomitas! Ahora ve por él',
    missingOne: 'Te falta 1 gomita, amor. ¡Aquí te espero!',
    missingMany: 'Te faltan {n} gomitas, amor. ¡Aquí te espero!',

    // Escena final
    endingAsk: '¿Ya... ya no estás brava?',
    bigText: 'TE AMO MUCHOOOO',
    endingReply: '¡Yo más! Y sí... guardé más gomitas.',
    finalMessage: 'Gracias por jugar conmigo, mi crespita hermosa',
    finalNote: 'Las gomitas ayudan, pero lo que más quiero es verte feliz.',
    replay: 'VOLVER A JUGAR',

    // ---------- Nivel 2: El asesinato de Pipu ----------
    pipu: {
      intro: [
        'CASO 001: el asesinato de Pipu',
        'Víctima: pingüino de peluche, chiquito y gordito',
        'Detective a cargo: Gabis. Asistente: Arya',
        'Usa tu linterna: alguien se esconde en la oscuridad',
      ],
      cluesLabel: 'Pistas',
      // Texto bajo el contador, según cuántas pistas lleva
      phases: [
        'Sin pistas todavía',
        'Algo huele raro...',
        'Esto se pone interesante',
        'Ya casi lo tengo',
        'Solo falta una pieza',
        'Hora de acusar (abre la libreta)',
      ],
      // Cada pista: nombre, lo que dice ella al encontrarla y lo que anota en la libreta
      clues: {
        pelos: { name: 'Pelitos naranjas', say: 'Pelitos naranjas... interesante.', note: 'Estaban junto a la silueta de tiza. ¿De quién son?' },
        huellas: { name: 'Huellas de patitas', say: '¿Parecen huellas de perrito?', note: 'Salen de la escena del crimen. ¿De perrito?' },
        foto: { name: 'Foto borrosa', say: 'Una foto: alguien de orejas largas.', note: 'Alguien de orejas largas, huyendo en la noche.' },
        babas: { name: 'Charco de babas', say: 'Guácala, babas. Muchas babas.', note: 'Fresquitas. Alguien estuvo aquí hace poco.' },
        envoltorio: { name: 'Envoltorio de gomitas', say: '¡Un paquete de gomitas vacío!', note: 'Un paquete entero, vacío. ¿De quién era?' },
      },
      unknownClue: '???',
      unknownNote: 'Pista sin encontrar',
      suspects: {
        chif: { name: 'Chif', kind: 'panda rojo' },
        tiana: { name: 'Tiana', kind: 'ovejita en pijama' },
        arya: { name: 'Arya', kind: 'tu fiel asistente' },
        nico: { name: 'Mi bobio', kind: 'el dueño de las gomitas' },
        shadow: { name: 'La sombra', kind: 'figura misteriosa' },
        carino: { name: 'Cariñosito', kind: 'testigo' },
      },
      // Coartadas al interrogarlos
      alibi: {
        chif: 'Yo estaba encima de la cama, acostado con el Cariñosito :(',
        tiana: 'Yo estaba en el piso porque Gabis me tiró contra la pared :(',
        nico: 'Yo solo vine por mis gomitas. Desaparecieron esta noche.',
        // El Cariñosito no es sospechoso: es el testigo
        carino: 'Yo estaba hablando con Pipu... ¡y de repente desapareció! :(',
      },
      notAsked: 'Aún no lo has interrogado.',
      // La sombra que huye (resulta ser su bobio buscando sus gomitas)
      shadowLines: ['¿Quién anda ahí?', '¡Otra vez esa sombra!', '¡Alto ahí! ¡Policía de peluches!'],
      shadowNote: 'Huye cada vez que te acercas.',
      nicoReveal: '¡No me acuses! Soy yo, tu bobio. Solo busco mis gomitas...',
      // Notas anónimas clavadas por el jardín
      papers: [
        'Una nota: «No sigas buscando, detective.» La firma una patita.',
        'Otra nota: «El pingüino sabía demasiado... de gomitas.»',
        'Otra más: «Lo que buscas está calientito y arropado.»',
      ],
      // Lo que dicen si vuelves cuando ya tienes todas las pistas
      hint: {
        chif: 'Oye... esa perrita estuvo sentada MUCHO rato en el mismo sitio.',
        tiana: 'Beee... ¿y quién más tiene orejas largas por aquí?',
      },
      aryaWhistle: '(aullido inocente)',
      aryaGuard: '¡Guau! (aquí no hay nada que ver)',
      revealed: '¿Y eso que estaba tapando Arya?',
      allClues: '¡Todas las pistas! Abre la libreta y acusa',
      // Tablero de acusación
      notesTitle: 'LIBRETA DE LA DETECTIVE',
      suspectsTitle: 'SOSPECHOSOS',
      accuse: 'ACUSAR',
      close: 'CERRAR',
      mystery: '???',
      mysteryKind: 'Las pistas no cuadran con nadie...',
      revealBtn: '¿QUIÉN FALTA?',
      needClues: 'Te faltan pistas, detective. Sin pruebas no hay caso.',
      defense: {
        chif: '¡Protesto! Mis orejas son chiquitas y redondas, y la foto muestra orejas largas.',
        tiana: 'Guatafac, mira los pelitos y las huellas.',
        nico: '¡A mí también me robaron! Y yo no dejo pelitos naranjas ni babas.',
      },
      aryaRevealed: 'Naranjita, con patitas, orejas largas y babas... ¡¿ARYA?!',
      // Escena final
      endReact: 'FUE ARIRIA? QUE?', // su reacción al descubrir a la culpable
      endHer1: 'Arya... ¿qué hay en tu camita?',
      endArya1: '(aullido MUY inocente)',
      endHer2: '¡¿PIPU?!',
      endArya2: 'Guau... solo quería tener una almohada como Pipu para dormir :(',
      endPipu: '¡BUUURP!',
      endHim: '¿Y mis gomitas? ¡Era un paquete entero!',
      endArya3: '(aullido otra vez)',
      bigText: 'CASO CERRADO',
      finalMessage: 'Pipu está vivo (y empachado de gomitas)',
      finalNote: 'Arya queda en libertad condicional. Todos pensaron que era un homicidio preterintencional.',
      wrongLabel: 'Acusaciones fallidas',
    },

    // Interfaz
    gomitasLabel: 'Gomitas',
    heartsLabel: 'Corazoncitos',
    pauseTitle: 'PAUSA',
    restartTitle: '¿Empezar de nuevo?',
    resume: 'CONTINUAR',
    restart: 'REINICIAR',
    soundOn: 'SONIDO: SÍ',
    soundOff: 'SONIDO: NO',
  },

  // ---------- Colores de los personajes ----------
  her: {
    hairDark: '#1f1410',
    hair: '#4b2a1b',
    hairLight: '#b8662e',
    skin: '#dba06c',
    skinShade: '#b97c4c',
    gold: '#ffc83d', // areticos y manillas
    top: '#1d1b22', // top negro
    topShine: '#3a3743',
    pants: '#7d7068', // café tirando a gris
    pantsShade: '#655a53',
    shoes: '#7b1e3a', // tenis color vino
    soles: '#561428', // suela, un vino más oscuro
  },
  him: {
    hair: '#17131c',
    hairLight: '#3a3552',
    skin: '#b5713f',
    skinShade: '#93562c',
    shirt: '#f7f7f7', // camiseta blanca
    shirtShade: '#cfd3dd',
    watch: '#8a8f99', // relojito gris
    pants: '#3a3f5c',
    pantsShade: '#2a2e45',
    shoes: '#ffffff', // tenis blancos
    soles: '#c9cdd8',
  },
  // Arya (cocker), Chif (panda rojo), Tiana (ovejita en pijama de conejo) y Pipu (pingüino)
  arya: { coat: '#e08a3c', ears: '#b8662e', light: '#f8cf9c', nose: '#3a2420' },
  chif: { coat: '#cf5a2c', dark: '#3a2420', light: '#fff4e6', nose: '#1a1210' },
  tiana: { pajama: '#e6cfa4', pajamaShade: '#c9ae80', earInside: '#f7a8b8', wool: '#ffffff', face: '#f6dcd0' },
  carino: { fur: '#8cc4ee', shade: '#6aa8de', cloud: '#2740a8', nose: '#2f55c8' }, // el Cariñosito
  pipu: { body: '#8e939c', belly: '#ffffff', beak: '#ffb02e', eyes: '#26262e', closedEyes: '#5d626c' },

  // ---------- Física (píxeles y segundos) ----------
  physics: {
    maxSpeed: 100,
    accel: 720,
    airAccel: 520,
    friction: 900,
    airFriction: 260,
    gravity: 900,
    maxFall: 330,
    jump: 312, // velocidad inicial del salto
    jumpCut: 120, // al soltar el botón, el salto se recorta a esta velocidad
    springJump: 455, // rebote del honguito
    coyote: 0.1, // margen para saltar justo después de dejar el borde
    jumpBuffer: 0.12, // margen para pulsar salto justo antes de aterrizar
  },

  // ---------- Audio ----------
  audio: {
    startMuted: false,
    sfxVolume: 0.5,
    musicVolume: 0.22,
    music: true,
  },
};

// ============================================================
//  GOMITAS OF LOVE — configuración personalizable
//  Cambia aquí textos, colores y ajustes sin tocar el resto.
// ============================================================

export const CONFIG = {
  // ---------- Textos ----------
  texts: {
    title: 'Gomitas of Love',
    subtitle: 'Una misión muy dulce para contentar a la crespita más linda',
    play: 'JUGAR',
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
      '¡Exceso de ternura detectado!',
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
    top: '#ffd23f',
    topShade: '#e6a21e',
    skirt: '#7c4ddb',
    skirtShade: '#5a33ad',
    shoes: '#ffffff',
    soles: '#ff7fae',
  },
  him: {
    hair: '#17131c',
    hairLight: '#3a3552',
    skin: '#b5713f',
    skinShade: '#93562c',
    jacket: '#2f62e0',
    jacketShade: '#2148b0',
    shirt: '#f4f4f4',
    pants: '#3a3f5c',
    pantsShade: '#2a2e45',
    shoes: '#f25c54',
  },

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

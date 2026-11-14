'use strict';

/* Control del PC: habla con el programa auxiliar (jarvis-pc.ps1) que corre en tu computador. */
const PC = (() => {
  const BASE = 'http://localhost:8765/';
  let token = '';
  const init = t => { token = t || ''; };
  const configured = () => !!token;

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const APPS = {
    'word': 'word', 'excel': 'excel', 'powerpoint': 'powerpoint', 'power point': 'powerpoint',
    'calculadora': 'calculadora', 'bloc de notas': 'bloc de notas', 'notas': 'bloc de notas', 'paint': 'paint',
    'explorador': 'explorador', 'explorador de archivos': 'explorador', 'chrome': 'chrome', 'google chrome': 'chrome',
    'edge': 'edge', 'vscode': 'vscode', 'vs code': 'vscode', 'visual studio code': 'vscode', 'spotify': 'spotify',
    'configuracion': 'configuracion', 'ajustes': 'configuracion', 'administrador de tareas': 'administrador de tareas'
  };
  const CARPETAS = {
    'escritorio': 'escritorio', 'documentos': 'documentos', 'descargas': 'descargas', 'imagenes': 'imagenes',
    'fotos': 'imagenes', 'musica': 'musica', 'videos': 'videos'
  };
  const sabe = n => APPS[norm(n)];
  const carpeta = n => CARPETAS[norm(n)];

  async function llamar(accion, objetivo) {
    if (!token) throw new Error('Falta la clave del auxiliar del PC en Ajustes.');
    let r;
    try {
      r = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Jarvis-Token': token },
        body: JSON.stringify({ accion, objetivo: objetivo || '' })
      });
    } catch {
      throw new Error('No encuentro el auxiliar. Abre iniciar-jarvis-pc.bat y, si Chrome pregunta, permite el acceso a dispositivos de la red local.');
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.mensaje || 'Error ' + r.status);
    return d.mensaje || 'Hecho.';
  }

  async function ejecutar({ accion, objetivo }) {
    let o = objetivo || '';
    if (accion === 'abrir' || accion === 'cerrar') {
      o = APPS[norm(o)];
      if (!o) return 'No tengo permiso para ese programa. Los permitidos son: ' + [...new Set(Object.values(APPS))].join(', ') + '.';
    } else if (accion === 'carpeta') {
      o = CARPETAS[norm(o)];
      if (!o) return 'Las carpetas permitidas son: escritorio, documentos, descargas, imagenes, musica y videos.';
    } else if (accion === 'multimedia') {
      o = norm(o).replace('pausar', 'pausa').replace('reanudar', 'pausa').replace('play', 'pausa');
    }
    if ((accion === 'apagar' || accion === 'reiniciar') &&
        !confirm(`¿Seguro que quieres ${accion} el equipo? Tendrás 30 segundos para cancelar.`)) return 'Cancelado por el usuario.';
    return llamar(accion, o);
  }

  const tool = {
    name: 'controlar_pc',
    description: 'Controla el computador del usuario con Windows: abrir o cerrar programas (word, excel, powerpoint, calculadora, bloc de notas, paint, explorador, chrome, edge, vscode, spotify, configuracion, administrador de tareas), abrir carpetas (escritorio, documentos, descargas, imagenes, musica, videos), volumen del equipo, teclas multimedia (objetivo: pausa, siguiente, anterior), minimizar todo, captura (abre la herramienta de recortes), cambiar_ventana, bloquear, apagar o reiniciar (con 30 segundos para cancelar) y cancelar_apagado. Para abrir un documento que acabas de crear con crear_carta no hace falta: se abre solo.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['abrir', 'cerrar', 'carpeta', 'volumen_subir', 'volumen_bajar', 'volumen_maximo', 'silenciar', 'multimedia', 'minimizar_todo', 'captura', 'cambiar_ventana', 'bloquear', 'apagar', 'reiniciar', 'cancelar_apagado'] },
        objetivo: { type: 'string', description: 'Programa, carpeta o control multimedia, según la acción' }
      },
      required: ['accion']
    }
  };

  return { init, configured, ejecutar, sabe, carpeta, tool };
})();

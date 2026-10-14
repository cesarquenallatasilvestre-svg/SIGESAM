'use strict';

// Los datos se guardan en el navegador de este dispositivo.
const CLAVE_REGISTROS = 'registros';
const CLAVE_ACTIVIDAD = 'actividadActual';
const MATERIAS_VALIDAS = [
  'Análisis y Diseño II',
  'Investigación Operativa II',
  'Tecnologías Emergentes I',
  'Administración de Base de Datos',
  'Ingeniería de Redes I',
  'Ingeniería de Control'
];

let registros = cargarJSON(CLAVE_REGISTROS, []);
let actividadActual = cargarJSON(CLAVE_ACTIVIDAD, null);
let temporizadorNotificacion;

function cargarJSON(clave, valorPorDefecto) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : valorPorDefecto;
  } catch (error) {
    console.error(`No se pudieron leer los datos "${clave}":`, error);
    return valorPorDefecto;
  }
}

function guardarDatos() {
  try {
    localStorage.setItem(CLAVE_REGISTROS, JSON.stringify(registros));
    localStorage.setItem(CLAVE_ACTIVIDAD, JSON.stringify(actividadActual));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar los datos:', error);
    mostrarNotificacion('No se pudieron guardar los cambios. Revisa el almacenamiento del navegador.', 'error');
    return false;
  }
}

function mostrarMensaje(elementoId, texto, tipo = 'error') {
  const elemento = document.getElementById(elementoId);
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo}`;
  elemento.style.color = tipo === 'exito' ? '#16845d' : '#c53b4c';
}

function mostrarNotificacion(texto, tipo = 'info') {
  const elemento = document.getElementById('notificacion');
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.style.background = tipo === 'error' ? '#a9273a' : tipo === 'exito' ? '#116b4b' : '#0b2f63';
  elemento.classList.add('visible');
  clearTimeout(temporizadorNotificacion);
  temporizadorNotificacion = setTimeout(() => elemento.classList.remove('visible'), 3000);
}

function obtenerFechaHora() {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-BO'),
    hora: ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

function registrarActividad() {
  const campo = document.getElementById('nuevaActividad');
  const nombreActividad = campo.value.trim();

  if (!nombreActividad) {
    mostrarMensaje('mensajeActividad', 'Escribe el nombre de la actividad.');
    campo.focus();
    return;
  }

  const { fecha, hora } = obtenerFechaHora();
  actividadActual = { nombre: nombreActividad, fecha, hora };

  if (!guardarDatos()) return;

  campo.value = '';
  mostrarActividad();
  mostrarMensaje('mensajeActividad', 'Actividad guardada correctamente.', 'exito');
  mostrarNotificacion('Actividad registrada correctamente.', 'exito');
}

function mostrarActividad() {
  const elementoActividad = document.getElementById('actividadActual');
  const elementoFecha = document.getElementById('fechaActividad');

  if (actividadActual && actividadActual.nombre) {
    elementoActividad.textContent = actividadActual.nombre;
    elementoFecha.textContent = `Registrada el ${actividadActual.fecha || '—'} · ${actividadActual.hora || ''}`;
  } else {
    elementoActividad.textContent = 'No hay ninguna actividad registrada.';
    elementoFecha.textContent = '';
  }
}

function obtenerMateriasSeleccionadas() {
  return Array.from(document.querySelectorAll('.materias input[type="checkbox"]:checked'))
    .map((materia) => materia.value)
    .filter((materia) => MATERIAS_VALIDAS.includes(materia));
}

function registrarAsistencia(evento) {
  if (evento) evento.preventDefault();

  const campoNombre = document.getElementById('nombre');
  const nombre = campoNombre.value.trim();
  const materiasSeleccionadas = obtenerMateriasSeleccionadas();

  if (!nombre) {
    mostrarMensaje('mensaje', 'Escribe tu nombre completo.');
    campoNombre.focus();
    return;
  }

  if (nombre.length < 3) {
    mostrarMensaje('mensaje', 'El nombre debe tener al menos 3 caracteres.');
    campoNombre.focus();
    return;
  }

  if (materiasSeleccionadas.length === 0) {
    mostrarMensaje('mensaje', 'Selecciona al menos una materia.');
    return;
  }

  if (!actividadActual || !actividadActual.nombre) {
    mostrarMensaje('mensaje', 'Primero registra una actividad académica.');
    document.getElementById('nuevaActividad').focus();
    return;
  }

  const { fecha, hora } = obtenerFechaHora();
  const nuevoRegistro = {
    id: crearId(),
    nombre,
    materias: materiasSeleccionadas,
    actividad: actividadActual.nombre,
    fecha,
    hora
  };

  registros.push(nuevoRegistro);
  if (!guardarDatos()) {
    registros.pop();
    return;
  }

  document.getElementById('formAsistencia').reset();
  mostrarMensaje('mensaje', 'Asistencia registrada correctamente.', 'exito');
  mostrarNotificacion(`Asistencia guardada para ${nombre}.`, 'exito');
  actualizarContador();
  mostrarRegistros();
  document.getElementById('seccionRegistros').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function crearId() {
  return (window.crypto && typeof window.crypto.randomUUID === 'function')
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function actualizarContador() {
  document.getElementById('totalRegistros').textContent = registros.length;
  // La barra crece de forma progresiva y se limita al 100 %.
  const porcentaje = Math.min(registros.length * 10, 100);
  document.getElementById('barraProgreso').style.width = `${porcentaje}%`;
  document.getElementById('barraProgreso').setAttribute('aria-valuenow', String(porcentaje));
}

function crearElemento(tag, clase, texto) {
  const elemento = document.createElement(tag);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function mostrarRegistros() {
  const lista = document.getElementById('listaRegistros');
  lista.replaceChildren();

  if (registros.length === 0) {
    const vacio = crearElemento('div', 'estado-vacio');
    vacio.append(
      crearElemento('span', '', '▤'),
      crearElemento('p', '', 'No hay registros guardados todavía.')
    );
    lista.appendChild(vacio);
    return;
  }

  // Se muestran primero los registros más recientes.
  [...registros].reverse().forEach((registro, indice) => {
    const tarjeta = crearElemento('article', 'registro');
    const numero = crearElemento('div', 'registro-numero', String(registros.length - indice));
    numero.setAttribute('aria-hidden', 'true');

    const contenido = crearElemento('div', 'registro-contenido');
    contenido.appendChild(crearElemento('h3', '', registro.nombre || 'Sin nombre'));
    contenido.appendChild(crearElemento('p', '', `Actividad: ${registro.actividad || 'Sin actividad'}`));
    contenido.appendChild(crearElemento('p', '', `Fecha: ${registro.fecha || '—'} · Hora: ${registro.hora || '—'}`));

    const etiquetas = crearElemento('div', 'etiquetas-materias');
    (Array.isArray(registro.materias) ? registro.materias : []).forEach((materia) => {
      etiquetas.appendChild(crearElemento('span', 'etiqueta-materia', materia));
    });
    contenido.appendChild(etiquetas);

    const botonEliminar = crearElemento('button', 'boton-eliminar-uno', 'Eliminar');
    botonEliminar.type = 'button';
    botonEliminar.setAttribute('aria-label', `Eliminar asistencia de ${registro.nombre || 'estudiante'}`);
    botonEliminar.addEventListener('click', () => eliminarRegistro(registro.id, registro));

    tarjeta.append(numero, contenido, botonEliminar);
    lista.appendChild(tarjeta);
  });
}

function eliminarRegistro(id, registroReferencia) {
  const indice = registros.findIndex((registro) =>
    (id && registro.id === id) || (!id && registro === registroReferencia)
  );
  if (indice === -1) return;

  const [eliminado] = registros.splice(indice, 1);
  if (!guardarDatos()) {
    registros.splice(indice, 0, eliminado);
    return;
  }

  actualizarContador();
  mostrarRegistros();
  mostrarNotificacion('Registro eliminado.', 'exito');
}

function eliminarRegistros() {
  if (registros.length === 0) {
    mostrarNotificacion('No hay registros para eliminar.');
    return;
  }

  if (!confirm('¿Seguro que quieres eliminar todos los registros? Esta acción no se puede deshacer.')) return;

  const anteriores = registros;
  registros = [];
  if (!guardarDatos()) {
    registros = anteriores;
    return;
  }

  actualizarContador();
  mostrarRegistros();
  mostrarNotificacion('Todos los registros fueron eliminados.', 'exito');
}

function generarExcel(materiaSeleccionada) {
  if (!materiaSeleccionada) {
    mostrarNotificacion('Selecciona una materia para exportar.', 'error');
    return;
  }

  if (typeof XLSX === 'undefined') {
    mostrarNotificacion('No está disponible la biblioteca Excel. Conéctate a internet y vuelve a intentarlo.', 'error');
    return;
  }

  const registrosMateria = registros.filter((registro) =>
    Array.isArray(registro.materias) && registro.materias.includes(materiaSeleccionada)
  );

  if (registrosMateria.length === 0) {
    mostrarNotificacion(`No existen asistencias para ${materiaSeleccionada}.`, 'error');
    return;
  }

  const actividades = [...new Set(registrosMateria.map((registro) => registro.actividad || 'Sin actividad'))];
  const estudiantes = [...new Set(registrosMateria.map((registro) => registro.nombre || 'Sin nombre'))];

  const planilla = estudiantes.map((nombre, indice) => {
    const fila = { 'N°': indice + 1, 'Estudiante': nombre };
    let total = 0;

    actividades.forEach((actividad) => {
      const asistio = registrosMateria.some((registro) =>
        (registro.nombre || 'Sin nombre') === nombre &&
        (registro.actividad || 'Sin actividad') === actividad
      );
      fila[actividad] = asistio ? '✓' : '';
      if (asistio) total++;
    });

    fila.Total = total;
    return fila;
  });

  const hoja = XLSX.utils.json_to_sheet(planilla);
  hoja['!cols'] = [{ wch: 6 }, { wch: 32 }, ...actividades.map(() => ({ wch: 24 })), { wch: 10 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Asistencia');

  const nombreArchivo = materiaSeleccionada
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '') + '.xlsx';

  XLSX.writeFile(libro, nombreArchivo);
  mostrarNotificacion('Planilla Excel generada correctamente.', 'exito');
}

function configurarAnimaciones() {
  const elementos = document.querySelectorAll('.revelar');

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elementos.forEach((elemento) => elemento.classList.add('visible'));
    return;
  }

  const observador = new IntersectionObserver((entradas, observer) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        observer.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.12 });

  elementos.forEach((elemento, indice) => {
    elemento.style.transitionDelay = `${Math.min(indice % 4, 3) * 75}ms`;
    observador.observe(elemento);
  });
}

function configurarEventos() {
  document.getElementById('btnRegistrarActividad').addEventListener('click', registrarActividad);
  document.getElementById('nuevaActividad').addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') registrarActividad();
  });
  document.getElementById('formAsistencia').addEventListener('submit', registrarAsistencia);
  document.getElementById('btnVerRegistros').addEventListener('click', () => {
    mostrarRegistros();
    document.getElementById('seccionRegistros').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('btnEliminarRegistros').addEventListener('click', eliminarRegistros);
  document.getElementById('btnExcel').addEventListener('click', () => {
    generarExcel(document.getElementById('materiaExcel').value);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  mostrarActividad();
  actualizarContador();
  configurarAnimaciones();
});

export function esIdPositivo(valor) {
  return Number.isInteger(Number(valor)) && Number(valor) > 0;
}

export function validarEquipo(datos) {
  const errores = [];
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return { valido: false, errores: ['El cuerpo debe ser un objeto JSON.'], equipo: null };
  }
  const codigo = typeof datos.codigo === 'string' ? datos.codigo.trim() : '';
  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  const categoria = typeof datos.categoria === 'string' ? datos.categoria.trim() : '';

  if (!codigo || codigo.length > 20) errores.push('El código es obligatorio y debe tener entre 1 y 20 caracteres.');
  if (!nombre || nombre.length > 100) errores.push('El nombre es obligatorio y no puede superar 100 caracteres.');
  if (!categoria || categoria.length > 50) errores.push('La categoría es obligatoria y no puede superar 50 caracteres.');

  return { valido: errores.length === 0, errores, equipo: { codigo, nombre, categoria } };
}

export function validarPrestamo(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return { valido: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }
  if (typeof datos.equipoId !== 'number' || !Number.isInteger(datos.equipoId) || datos.equipoId <= 0 ||
      typeof datos.usuarioId !== 'number' || !Number.isInteger(datos.usuarioId) || datos.usuarioId <= 0) {
    return { valido: false, error: 'equipoId y usuarioId deben ser identificadores enteros positivos.' };
  }
  return { valido: true, equipoId: datos.equipoId, usuarioId: datos.usuarioId };
}

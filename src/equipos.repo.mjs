import { pool } from './db.mjs';

export async function listarEquipos({ q = '', categoria = '', disponibilidad = '', orden = 'codigo', pagina = 1 }) {
  const condiciones = [];
  const valores = [];

  if (q) {
    valores.push(`%${q}%`);
    condiciones.push(`e.nombre ILIKE $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    condiciones.push(`e.categoria = $${valores.length}`);
  }
  if (disponibilidad === 'disponible' || disponibilidad === 'prestado') {
    valores.push(disponibilidad === 'disponible');
    condiciones.push(`e.disponible = $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const columnasOrden = { codigo: 'e.codigo', nombre: 'e.nombre' };
  const orderBy = columnasOrden[orden] || columnasOrden.codigo;
  const limite = 5;
  const offset = (pagina - 1) * limite;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM practica_prestamos.equipos e ${where}`,
    valores
  );
  const total = totalResult.rows[0].total;
  const result = await pool.query(
    `SELECT e.id, e.codigo, e.nombre, e.categoria, e.disponible
     FROM practica_prestamos.equipos e ${where}
     ORDER BY ${orderBy} ASC, e.id ASC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, limite, offset]
  );

  const categorias = await pool.query(
    'SELECT DISTINCT categoria FROM practica_prestamos.equipos ORDER BY categoria'
  );

  return { equipos: result.rows, total, pagina, paginas: Math.max(1, Math.ceil(total / limite)), categorias: categorias.rows.map(r => r.categoria) };
}

export async function obtenerEquipo(id) {
  const equipo = await pool.query(
    `SELECT e.id, e.codigo, e.nombre, e.categoria, e.disponible,
            u.nombre AS usuario_actual, p.id AS prestamo_actual_id,
            p.fecha_prestamo AS fecha_prestamo_actual
     FROM practica_prestamos.equipos e
     LEFT JOIN practica_prestamos.prestamos p
       ON p.equipo_id = e.id AND p.fecha_devolucion IS NULL
     LEFT JOIN practica_prestamos.usuarios u ON u.id = p.usuario_id
     WHERE e.id = $1`,
    [id]
  );
  if (!equipo.rowCount) return null;

  const historial = await pool.query(
    `SELECT p.id, u.nombre AS usuario, p.fecha_prestamo, p.fecha_devolucion
     FROM practica_prestamos.prestamos p
     JOIN practica_prestamos.usuarios u ON u.id = p.usuario_id
     WHERE p.equipo_id = $1
     ORDER BY p.fecha_prestamo DESC`,
    [id]
  );
  return { ...equipo.rows[0], historial: historial.rows };
}

export async function crearEquipo(datos) {
  const result = await pool.query(
    `INSERT INTO practica_prestamos.equipos (codigo, nombre, categoria)
     VALUES ($1, $2, $3)
     RETURNING id, codigo, nombre, categoria, disponible`,
    [datos.codigo, datos.nombre, datos.categoria]
  );
  return result.rows[0];
}

export async function actualizarEquipo(id, datos) {
  const result = await pool.query(
    `UPDATE practica_prestamos.equipos
     SET codigo = $1, nombre = $2, categoria = $3
     WHERE id = $4
     RETURNING id, codigo, nombre, categoria, disponible`,
    [datos.codigo, datos.nombre, datos.categoria, id]
  );
  return result;
}

export async function eliminarEquipo(id) {
  return pool.query('DELETE FROM practica_prestamos.equipos WHERE id = $1', [id]);
}

import { pool } from './db.mjs';

export async function crearPrestamo(equipoId, usuarioId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const equipo = await client.query(
      `UPDATE practica_prestamos.equipos
       SET disponible = FALSE
       WHERE id = $1 AND disponible = TRUE
       RETURNING id`,
      [equipoId]
    );

    if (equipo.rowCount === 0) {
      await client.query('ROLLBACK');
      return { tipo: 'ocupado' };
    }

    const prestamo = await client.query(
      `INSERT INTO practica_prestamos.prestamos (equipo_id, usuario_id)
       VALUES ($1, $2)
       RETURNING id, equipo_id, usuario_id, fecha_prestamo, fecha_devolucion`,
      [equipoId, usuarioId]
    );

    await client.query('COMMIT');
    return { tipo: 'creado', prestamo: prestamo.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function devolverPrestamo(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const devuelto = await client.query(
      `UPDATE practica_prestamos.prestamos
       SET fecha_devolucion = CURRENT_TIMESTAMP
       WHERE id = $1 AND fecha_devolucion IS NULL
       RETURNING id, equipo_id, usuario_id, fecha_prestamo, fecha_devolucion`,
      [id]
    );

    if (devuelto.rowCount === 0) {
      await client.query('ROLLBACK');
      return { tipo: 'no_activo' };
    }

    await client.query(
      `UPDATE practica_prestamos.equipos
       SET disponible = TRUE
       WHERE id = $1`,
      [devuelto.rows[0].equipo_id]
    );

    await client.query('COMMIT');
    return { tipo: 'devuelto', prestamo: devuelto.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

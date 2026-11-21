import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, comprobarConexion } from './db.mjs';
import { listarEquipos, obtenerEquipo, crearEquipo, actualizarEquipo, eliminarEquipo } from './equipos.repo.mjs';
import { crearPrestamo, devolverPrestamo } from './prestamos.service.mjs';
import { esIdPositivo, validarEquipo, validarPrestamo } from './validacion.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => res.redirect('/equipos'));

app.get('/equipos', async (req, res, next) => {
  try {
    const paginaSolicitada = Number.parseInt(req.query.pagina, 10);
    const filtros = {
      q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
      categoria: typeof req.query.categoria === 'string' ? req.query.categoria : '',
      disponibilidad: typeof req.query.disponibilidad === 'string' ? req.query.disponibilidad : '',
      orden: ['codigo', 'nombre'].includes(req.query.orden) ? req.query.orden : 'codigo',
      pagina: Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1
    };
    const datos = await listarEquipos(filtros);
    if (datos.pagina > datos.paginas) {
      return res.redirect('/equipos?' + new URLSearchParams({ ...filtros, pagina: String(datos.paginas) }));
    }
    res.render('equipos', { ...datos, filtros });
  } catch (error) { next(error); }
});

app.get('/equipos/:id', async (req, res, next) => {
  try {
    if (!esIdPositivo(req.params.id)) return res.status(400).render('error', { codigo: 400, mensaje: 'El identificador debe ser un entero positivo.' });
    const equipo = await obtenerEquipo(Number(req.params.id));
    if (!equipo) return res.status(404).render('error', { codigo: 404, mensaje: 'No existe ningún equipo con ese identificador.' });
    res.render('equipo', { equipo });
  } catch (error) { next(error); }
});

app.post('/api/equipos', async (req, res, next) => {
  try {
    const validacion = validarEquipo(req.body);
    if (!validacion.valido) return res.status(400).json({ error: 'Datos no válidos.', detalles: validacion.errores });
    const equipo = await crearEquipo(validacion.equipo);
    res.location(`/api/equipos/${equipo.id}`).status(201).json(equipo);
  } catch (error) { next(error); }
});

app.put('/api/equipos/:id', async (req, res, next) => {
  try {
    if (!esIdPositivo(req.params.id)) return res.status(400).json({ error: 'Identificador no válido.' });
    const validacion = validarEquipo(req.body);
    if (!validacion.valido) return res.status(400).json({ error: 'Datos no válidos.', detalles: validacion.errores });
    const resultado = await actualizarEquipo(Number(req.params.id), validacion.equipo);
    if (!resultado.rowCount) return res.status(404).json({ error: 'Equipo no encontrado.' });
    res.status(200).json(resultado.rows[0]);
  } catch (error) { next(error); }
});

app.delete('/api/equipos/:id', async (req, res, next) => {
  try {
    if (!esIdPositivo(req.params.id)) return res.status(400).json({ error: 'Identificador no válido.' });
    const resultado = await eliminarEquipo(Number(req.params.id));
    if (!resultado.rowCount) return res.status(404).json({ error: 'Equipo no encontrado.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/prestamos', async (req, res, next) => {
  try {
    const validacion = validarPrestamo(req.body);
    if (!validacion.valido) return res.status(400).json({ error: validacion.error });
    const resultado = await crearPrestamo(validacion.equipoId, validacion.usuarioId);
    if (resultado.tipo === 'ocupado') return res.status(409).json({ error: 'El equipo no existe o no está disponible.' });
    res.status(201).json(resultado.prestamo);
  } catch (error) { next(error); }
});

app.post('/api/prestamos/:id/devolucion', async (req, res, next) => {
  try {
    if (!esIdPositivo(req.params.id)) return res.status(400).json({ error: 'Identificador no válido.' });
    const resultado = await devolverPrestamo(Number(req.params.id));
    if (resultado.tipo === 'no_activo') return res.status(409).json({ error: 'El préstamo no existe o ya fue devuelto.' });
    res.status(200).json(resultado.prestamo);
  } catch (error) { next(error); }
});

app.get('/api/usuarios', async (req, res, next) => {
  try {
    const resultado = await pool.query('SELECT id, nombre FROM practica_prestamos.usuarios ORDER BY id');
    res.json(resultado.rows);
  } catch (error) { next(error); }
});

app.get('/api/health', async (req, res) => {
  try { res.json({ estado: 'ok', baseDatos: await comprobarConexion() }); }
  catch { res.status(500).json({ estado: 'error', mensaje: 'No se pudo conectar con la base de datos.' }); }
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use((error, req, res, next) => {
  console.error('Error de aplicación:', error.code || error.message);

  if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un recurso con ese código o el equipo ya tiene un préstamo activo.' });
  if (error.code === '23503') return res.status(409).json({ error: 'La operación no puede realizarse porque existe una relación o referencia no válida.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no tiene un formato válido.' });
  if (error.code === 'ECONNREFUSED' || error.code === '57P01') return res.status(500).json({ error: 'No se puede conectar con la base de datos.' });
  res.status(500).json({ error: 'Se ha producido un error interno.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Servidor disponible en http://localhost:${port}`));

process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });

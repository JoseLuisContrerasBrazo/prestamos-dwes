# Práctica DWES: gestión de préstamos de material informático

Aplicación de inventario y préstamos con Node.js 24, Express 5, PostgreSQL 18 en Docker Compose, `pg` 8 y EJS 3.

## 1. Requisitos

- Node.js 24 o superior.
- npm.
- Docker Desktop (con Docker Compose).
- Un cliente HTTP: Postman, Thunder Client, Insomnia o `curl`.

## 2. Instalación

Desde la carpeta raíz del proyecto:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y establece una contraseña local para `DB_PASSWORD`. No subas `.env` a GitHub.

Instala dependencias:

```bash
npm install
```

## 3. Arranque de PostgreSQL

```bash
docker compose up -d
docker compose ps
```

El contenedor monta `init.sql` y crea el esquema `practica_prestamos`, sus tablas, el índice parcial y los datos de prueba.

Para consultar los registros:

```bash
docker compose exec postgres psql -U dwes_app -d practica_prestamos
```

Dentro de `psql`:

```sql
SELECT * FROM practica_prestamos.equipos;
SELECT * FROM practica_prestamos.usuarios;
SELECT * FROM practica_prestamos.prestamos;
```

**Importante:** los scripts de `/docker-entrypoint-initdb.d` se ejecutan al inicializar un volumen vacío. Si modificas `init.sql` y quieres reiniciar los datos de desarrollo, elimina el volumen (esto borra los datos persistidos):

```bash
docker compose down -v
docker compose up -d
```

## 4. Arranque de Node.js

```bash
npm start
```

Servidor: http://localhost:3000

Comprobación: http://localhost:3000/api/health

## 5. Vistas HTML

| Método | Ruta | Función |
|---|---|---|
| GET | `/equipos` | Inventario con búsqueda, categoría, disponibilidad, orden y paginación de 5 |
| GET | `/equipos/:id` | Detalle, préstamo activo e historial |

Parámetros de `/equipos`:
- `q`: búsqueda parcial por nombre (`ILIKE`).
- `categoria`: categoría exacta.
- `disponibilidad`: `disponible` o `prestado`.
- `orden`: `codigo` o `nombre`.
- `pagina`: página positiva.

Ejemplo:
`http://localhost:3000/equipos?q=portatil&categoria=Portátiles&disponibilidad=disponible&orden=nombre&pagina=1`

## 6. API

Todos los cuerpos de escritura son JSON.

### Crear equipo

```http
POST /api/equipos
Content-Type: application/json

{
  "codigo": "CAM-001",
  "nombre": "Cámara web Logitech",
  "categoria": "Periféricos"
}
```

Respuesta esperada: `201 Created`, equipo con id y cabecera `Location`.

### Modificar equipo

```http
PUT /api/equipos/1
Content-Type: application/json

{
  "codigo": "PORT-001",
  "nombre": "Portátil Lenovo ThinkPad actualizado",
  "categoria": "Portátiles"
}
```

Respuesta: `200`; `404` si no existe. La disponibilidad no se modifica desde esta ruta.

### Eliminar equipo

```http
DELETE /api/equipos/11
```

Respuesta: `204`; `404` si no existe; `409` si tiene historial de préstamos (la FK impide borrarlo).

### Consultar usuarios de prueba

```http
GET /api/usuarios
```

Esta ruta auxiliar permite conocer los identificadores de usuarios para probar préstamos; no es una API de gestión de usuarios.

### Crear préstamo

```http
POST /api/prestamos
Content-Type: application/json

{
  "equipoId": 1,
  "usuarioId": 1
}
```

Respuesta: `201` con el préstamo. Si el equipo no está disponible, `409`.

### Devolver préstamo

```http
POST /api/prestamos/1/devolucion
```

Respuesta: `200` con los datos del préstamo devuelto. Si no existe o ya está devuelto, `409`.

## 7. Organización

```text
practica-prestamos/
├── compose.yaml
├── init.sql
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── src/
│   ├── server.mjs
│   ├── db.mjs
│   ├── validacion.mjs
│   ├── equipos.repo.mjs
│   └── prestamos.service.mjs
├── views/
│   ├── equipos.ejs
│   ├── equipo.ejs
│   └── error.ejs
└── public/
    └── estilos.css
```

- `server.mjs`: configuración Express, vistas y endpoints.
- `db.mjs`: pool reutilizable de PostgreSQL.
- `validacion.mjs`: validación de identificadores y cuerpos.
- `equipos.repo.mjs`: consultas de inventario y detalle.
- `prestamos.service.mjs`: transacciones de préstamo y devolución.
- `init.sql`: estructura, restricciones, índice parcial y datos iniciales.

## 8. Decisiones técnicas relevantes

- Todos los valores aportados por el cliente se pasan mediante parámetros `$1`, `$2`, etc.
- La columna usada en `ORDER BY` se selecciona desde una lista cerrada; nunca se concatena directamente el valor recibido.
- La creación de préstamos actualiza primero el equipo de forma condicional (`disponible = TRUE`) e inserta el préstamo en la misma transacción y con el mismo cliente de `pg`.
- El índice UNIQUE parcial impide más de un préstamo activo por equipo incluso ante peticiones concurrentes.
- La devolución actualiza condicionalmente el préstamo activo y marca el equipo como disponible dentro de una sola transacción.
- Las claves foráneas no usan `ON DELETE CASCADE`, por lo que se conserva el historial.
- Se gestionan los SQLSTATE `23505` (UNIQUE) y `23503` (FOREIGN KEY) sin exponer detalles técnicos al cliente.

## 9. Tabla de comprobaciones

Completa la columna «Resultado obtenido» después de ejecutar las pruebas en tu equipo. No se deben inventar resultados.

| Caso | Petición / pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| Alta | `POST /api/equipos` con código nuevo | 201 y `Location` | Pendiente de ejecutar |
| Modificación | `PUT /api/equipos/1` | 200 | Pendiente de ejecutar |
| Código repetido | Alta con `PORT-001` | 409 | Pendiente de ejecutar |
| Búsqueda | `/equipos?q=portatil` | Coincidencias sin distinguir mayúsculas | Pendiente de ejecutar |
| Filtros | Categoría + disponibilidad + orden + página 2 | Filtros combinados y conservados | Pendiente de ejecutar |
| Borrado sin historial | Borrar un equipo recién creado | 204 | Pendiente de ejecutar |
| Borrado inexistente | `DELETE /api/equipos/99999` | 404 | Pendiente de ejecutar |
| Borrado con historial | Borrar un equipo prestado o con préstamo devuelto | 409 | Pendiente de ejecutar |
| Préstamo correcto | Prestar equipo disponible a usuario existente | 201 y equipo no disponible | Pendiente de ejecutar |
| Préstamo duplicado | Volver a prestar el mismo equipo | 409; no duplica préstamos | Pendiente de ejecutar |
| Rollback | Prestar equipo disponible a usuario inexistente | Error controlado; equipo sigue disponible y no aparece préstamo | Pendiente de ejecutar |
| Devolución | Devolver préstamo activo | 200; fecha registrada y equipo disponible | Pendiente de ejecutar |
| Segunda devolución | Repetir la devolución | 409; no altera el equipo | Pendiente de ejecutar |
| Simultaneidad | Dos POST simultáneos al mismo equipo | Solo uno obtiene 201 | Pendiente de ejecutar |

### Prueba de simultaneidad con fetch

Ejecuta este fragmento en la consola del navegador, con el servidor activo. Cambia los IDs por un equipo disponible y dos usuarios existentes:

```js
const peticiones = [
  fetch('/api/prestamos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipoId: 11, usuarioId: 1 })
  }),
  fetch('/api/prestamos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipoId: 11, usuarioId: 2 })
  })
];

const respuestas = await Promise.all(peticiones);
console.log(await Promise.all(respuestas.map(async r => ({
  status: r.status,
  body: await r.json()
}))));
```

Debe confirmarse un único préstamo. Comprueba también la tabla `prestamos` y el estado del equipo en PostgreSQL.

## 10. Limitaciones y alcance

- No hay autenticación, sesiones, gestión de usuarios ni panel administrativo, porque no forman parte del enunciado.
- Las operaciones de escritura se prueban mediante HTTP; la interfaz EJS se limita a consultar el inventario y el detalle.
- La tabla de resultados de pruebas debe actualizarse con resultados reales de la ejecución local.

## 11. IA
- enlace chat de IA "https://chatgpt.com/share/6b018987-e0ec-83ed-b75a-fd06ca7f4e4d"

CREATE SCHEMA IF NOT EXISTS practica_prestamos;
SET search_path TO practica_prestamos, public;

CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE
        CHECK (char_length(trim(codigo)) BETWEEN 1 AND 20),
    nombre VARCHAR(100) NOT NULL
        CHECK (char_length(trim(nombre)) > 0),
    categoria VARCHAR(50) NOT NULL
        CHECK (char_length(trim(categoria)) > 0),
    disponible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
        CHECK (char_length(trim(nombre)) > 0)
);

CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS un_prestamo_activo_por_equipo
ON prestamos (equipo_id)
WHERE fecha_devolucion IS NULL;

INSERT INTO usuarios (nombre) VALUES
('Ana García'), ('Carlos López'), ('María Rodríguez')
ON CONFLICT DO NOTHING;

INSERT INTO equipos (codigo, nombre, categoria, disponible) VALUES
('PORT-001', 'Portátil Lenovo ThinkPad', 'Portátiles', TRUE),
('PORT-002', 'Portátil HP ProBook', 'Portátiles', TRUE),
('PORT-003', 'Portátil Dell Latitude', 'Portátiles', TRUE),
('TAB-001', 'Tableta Samsung Galaxy Tab', 'Tabletas', TRUE),
('TAB-002', 'iPad 10.ª generación', 'Tabletas', TRUE),
('PROY-001', 'Proyector Epson EB-E20', 'Proyectores', TRUE),
('PROY-002', 'Proyector BenQ MS550', 'Proyectores', TRUE),
('MON-001', 'Monitor Dell 24 pulgadas', 'Monitores', TRUE),
('PER-001', 'Teclado Logitech USB', 'Periféricos', TRUE),
('PER-002', 'Ratón inalámbrico Logitech', 'Periféricos', TRUE),
('PORT-004', 'Portátil ASUS VivoBook', 'Portátiles', TRUE)
ON CONFLICT (codigo) DO NOTHING;

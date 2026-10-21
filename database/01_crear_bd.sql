-- =============================================================================
-- 01_crear_bd.sql — Crea el usuario (rol) y la base de datos de la aplicación
-- =============================================================================
--
-- Ejecutar UNA SOLA VEZ con un superusuario (postgres), usando psql:
--
--   psql -U postgres -h localhost -p 5432 -v password="LA_CONTRASEÑA" -f 01_crear_bd.sql
--
-- La contraseña se pasa con -v para no dejarla escrita en el fichero.
-- Debe ser la misma que pongas en DB_PASSWORD del .env.
--
-- Ojo: no funciona desde el Query Tool de pgAdmin, porque CREATE DATABASE
-- no puede ejecutarse dentro de una transacción y pgAdmin agrupa las sentencias.
-- =============================================================================

\set ON_ERROR_STOP on

-- Rol de la aplicación: puede iniciar sesión, pero no es superusuario ni
-- puede crear otras bases de datos o roles.
CREATE ROLE control_formacion
    LOGIN
    PASSWORD :'password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Ajustes recomendados por Django para PostgreSQL. Si el rol ya los trae,
-- Django no tiene que enviarlos en cada conexión nueva.
ALTER ROLE control_formacion SET client_encoding TO 'UTF8';
ALTER ROLE control_formacion SET default_transaction_isolation TO 'read committed';
ALTER ROLE control_formacion SET timezone TO 'UTC';

-- Base de datos propiedad del rol de la aplicación. Ser el propietario le
-- permite crear tablas en el esquema public (desde PostgreSQL 15 el resto de
-- usuarios ya no puede hacerlo por defecto).
CREATE DATABASE control_formacion
    OWNER control_formacion
    ENCODING 'UTF8'
    TEMPLATE template0;

-- Solo el propietario (y los superusuarios) pueden conectarse a esta base.
REVOKE CONNECT ON DATABASE control_formacion FROM PUBLIC;

\echo
\echo 'Rol y base de datos "control_formacion" creados.'
\echo 'Siguiente paso: 02_estructura.sql (conectado como control_formacion).'
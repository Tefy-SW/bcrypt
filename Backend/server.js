const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

// Configuración principal del servidor y de la base de datos.
const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 12; // Cantidad de rondas usada para generar el hash bcrypt.
const databasePath = path.join(__dirname, 'users.db');

// Se asegura que la carpeta exista antes de crear o abrir el archivo SQLite.
fs.mkdirSync(__dirname, { recursive: true });

const database = new sqlite3.Database(databasePath);

// Ejecuta sentencias INSERT, UPDATE, DELETE o CREATE de forma asíncrona.
// Los parámetros separados de la consulta ayudan a evitar inyección SQL.
function run(query, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(query, parameters, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Obtiene un solo registro de la base de datos.
function get(query, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(query, parameters, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

// Valida los datos mínimos requeridos antes de consultar o modificar la base de datos.
function isValidCredentials(username, password) {
  return typeof username === 'string'
    && username.trim().length > 0
    && username.trim().length <= 100
    && typeof password === 'string'
    && password.length >= 6;
}

// Crea la tabla de usuarios cuando el servidor se ejecuta por primera vez.
// La contraseña se almacena únicamente en password_hash, nunca en texto plano.
async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Middleware para interpretar JSON y servir la aplicación frontend.
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Registra un usuario nuevo después de generar su hash bcrypt.
app.post('/api/register', async (request, response, next) => {
  const { username, password } = request.body || {};

  if (!isValidCredentials(username, password)) {
    response.status(400).json({
      message: 'El usuario es obligatorio y la contraseña debe tener al menos 6 caracteres.'
    });
    return;
  }

  const normalizedUsername = username.trim();

  try {
    // bcrypt genera automáticamente una sal diferente para cada contraseña.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [normalizedUsername, passwordHash]
    );

    response.status(201).json({
      message: 'Usuario registrado correctamente.',
      user: { username: normalizedUsername }
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      response.status(409).json({ message: 'El usuario ya está registrado.' });
      return;
    }
    next(error);
  }
});

// Busca el usuario y compara la contraseña recibida con el hash almacenado.
app.post('/api/login', async (request, response, next) => {
  const { username, password } = request.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    response.status(400).json({ message: 'El usuario y la contraseña son obligatorios.' });
    return;
  }

  try {
    const user = await get(
      'SELECT username, password_hash FROM users WHERE username = ?',
      [username.trim()]
    );
    // Si el usuario no existe, se rechaza el acceso sin revelar cuál dato falló.
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!passwordMatches) {
      response.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
      return;
    }

    response.json({
      message: 'Inicio de sesión exitoso.',
      user: { username: user.username }
    });
  } catch (error) {
    next(error);
  }
});

// Maneja JSON inválido y errores inesperados sin exponer detalles internos.
app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    response.status(400).json({ message: 'El cuerpo de la solicitud no es un JSON válido.' });
    return;
  }
  console.error('Error del servidor:', error);
  response.status(500).json({ message: 'Ocurrió un error interno del servidor.' });
});

// La aplicación solo empieza a aceptar solicitudes después de inicializar SQLite.
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo inicializar la base de datos:', error);
    process.exitCode = 1;
  });

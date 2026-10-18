// Alternar pestañas del formulario
function switchTab(type) {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const msgBox = document.getElementById('response-message');
  
  msgBox.className = 'message';
  msgBox.textContent = '';

  if (type === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  }
}

function showMessage(text, isError = false) {
  const box = document.getElementById('response-message');
  box.textContent = text;
  box.className = `message ${isError ? 'error' : 'success'}`;
}

// Funciones para alternar entre pantalla de Login y Portada de Bienvenida
function showWelcomeScreen(username) {
  const authSection = document.getElementById('auth-section');
  const welcomeSection = document.getElementById('welcome-dashboard');
  const displayUser = document.getElementById('display-username');

  if (!authSection || !welcomeSection) {
    console.error('No se encontraron los contenedores en el HTML. Verifica que existan id="auth-section" e id="welcome-dashboard".');
    return;
  }

  authSection.classList.add('hidden');
  welcomeSection.classList.remove('hidden');

  if (displayUser) {
    displayUser.textContent = username;
  }
}

function logout() {
  document.getElementById('welcome-dashboard').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('form-login').reset();
  showMessage('Has cerrado sesión correctamente.');
}

// Endpoint base
const API_URL = '/api';

// Manejo del Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Credenciales incorrectas');

    // Transición directa a la portada de bienvenida
    showWelcomeScreen(username);

  } catch (err) {
    // Si aún no está levantado el backend de tu compañero o falla la conexión
    showMessage(err.message, true);
  }
});

// Manejo del Registro
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm').value;

  if (password.length < 6) {
    return showMessage('La contraseña debe tener al menos 6 caracteres.', true);
  }
  if (password !== confirmPassword) {
    return showMessage('Las contraseñas no coinciden.', true);
  }

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al registrar usuario');

    showMessage('Usuario registrado con éxito. Ya puedes iniciar sesión.');
    document.getElementById('form-register').reset();
    switchTab('login');
  } catch (err) {
    showMessage(err.message, true);
  }
});
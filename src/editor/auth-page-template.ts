export const authPageTemplateHtml = `
<main class="builder-auth-page" data-builder-full-page-template="auth">
  <section class="builder-auth-brand" aria-label="Bienvenida">
    <a class="builder-auth-logo" href="#" aria-label="Inicio">
      <span aria-hidden="true">P</span>
      <strong>Tu plataforma</strong>
    </a>
    <div class="builder-auth-intro">
      <p class="builder-auth-eyebrow">Aprende · Practica · Avanza</p>
      <h1>Todo lo que necesitas, en un solo lugar.</h1>
      <p>Inicia sesión para continuar o crea una cuenta nueva en menos de un minuto.</p>
    </div>
    <div class="builder-auth-orbit" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <p class="builder-auth-copyright">Una experiencia segura con Supabase</p>
  </section>

  <section class="builder-auth-content">
    <div class="builder-auth-mobile-logo" aria-hidden="true"><span>P</span><strong>Tu plataforma</strong></div>

    <div class="builder-auth-shell" data-builder-auth-visible="signed-out">
      <div class="builder-auth-tabs" role="tablist" aria-label="Acceso a la cuenta">
        <button aria-selected="true" data-builder-auth-tab="login" role="tab" type="button">Iniciar sesión</button>
        <button aria-selected="false" data-builder-auth-tab="signup" role="tab" tabindex="-1" type="button">Crear cuenta</button>
      </div>

      <div class="builder-auth-panels">
        <form class="builder-auth-form builder-auth-login-form" data-builder-auth-action="login" data-builder-auth-panel="login">
          <header>
            <p class="builder-auth-kicker">Te damos la bienvenida</p>
            <h2>Inicia sesión</h2>
            <p>Usa el correo y la contraseña de tu cuenta.</p>
          </header>
          <label class="builder-auth-field">
            <span>Correo electrónico</span>
            <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="nombre@ejemplo.com" required>
          </label>
          <label class="builder-auth-field">
            <span>Contraseña</span>
            <input name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required>
          </label>
          <button class="builder-auth-submit" type="submit">Entrar a mi cuenta</button>
          <p class="builder-auth-status" data-builder-auth-status aria-live="polite"></p>
          <p class="builder-auth-helper">¿Aún no tienes cuenta? Selecciona <strong>Crear cuenta</strong> arriba.</p>
        </form>

        <form class="builder-auth-form builder-auth-signup-form" data-builder-auth-action="signup" data-builder-auth-panel="signup" hidden>
          <header>
            <p class="builder-auth-kicker">Comienza hoy</p>
            <h2>Crea tu cuenta</h2>
            <p>Solo necesitas un correo y una contraseña segura.</p>
          </header>
          <label class="builder-auth-field">
            <span>Correo electrónico</span>
            <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="nombre@ejemplo.com" required>
          </label>
          <label class="builder-auth-field">
            <span>Contraseña</span>
            <input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres" required>
          </label>
          <button class="builder-auth-submit" type="submit">Crear mi cuenta</button>
          <p class="builder-auth-status" data-builder-auth-status aria-live="polite"></p>
          <p class="builder-auth-helper">¿Ya tienes cuenta? Selecciona <strong>Iniciar sesión</strong> arriba.</p>
        </form>
      </div>
    </div>

    <div class="builder-auth-shell builder-auth-signed-in" data-builder-auth-visible="signed-in" hidden>
      <div class="builder-auth-success" aria-hidden="true">✓</div>
      <p class="builder-auth-kicker">Sesión activa</p>
      <h2>¡Qué bueno verte!</h2>
      <p>Ingresaste como <strong data-builder-auth-field="email">usuario@ejemplo.com</strong>.</p>
      <button class="builder-auth-submit" data-builder-auth-action="logout" type="button">Cerrar sesión</button>
    </div>

    <p class="builder-auth-legal">Al continuar, aceptas los términos de uso y la política de privacidad.</p>
  </section>
</main>`

export const authPageTemplateCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');

* { box-sizing: border-box; }
html, body { min-height: 100%; margin: 0; }
body { color: #17222b; background: #f8faf9; font-family: 'DM Sans', system-ui, sans-serif; }
button, input, select, textarea { font: inherit; }
.builder-auth-page { min-height: var(--builder-editor-viewport-height, 100vh); display: grid; grid-template-columns: minmax(320px, .92fr) minmax(500px, 1.08fr); background: #f8faf9; }
.builder-auth-brand { position: relative; min-height: var(--builder-editor-viewport-height, 100vh); padding: clamp(32px, 5vw, 72px); overflow: hidden; display: flex; flex-direction: column; color: #fff; background: linear-gradient(145deg, #102f36 0%, #155d5b 52%, #1b8580 100%); isolation: isolate; }
.builder-auth-brand::before { content: ''; position: absolute; width: 540px; height: 540px; right: -250px; top: -210px; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; box-shadow: 0 0 0 70px rgba(255,255,255,.035), 0 0 0 140px rgba(255,255,255,.025); z-index: -1; }
.builder-auth-logo, .builder-auth-mobile-logo { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; font-family: 'Manrope', sans-serif; }
.builder-auth-logo > span, .builder-auth-mobile-logo > span { width: 38px; height: 38px; display: grid; place-items: center; color: #155d5b; background: #d9fff5; border-radius: 11px; font-weight: 800; }
.builder-auth-logo strong, .builder-auth-mobile-logo strong { font-size: 17px; letter-spacing: -.02em; }
.builder-auth-intro { max-width: 570px; margin: auto 0; padding: 80px 0; }
.builder-auth-eyebrow, .builder-auth-kicker { margin: 0 0 12px; color: #78e6d7; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.builder-auth-intro h1 { max-width: 10ch; margin: 0; font-family: 'Manrope', sans-serif; font-size: clamp(42px, 5.4vw, 76px); line-height: 1.02; letter-spacing: -.055em; }
.builder-auth-intro > p:last-child { max-width: 48ch; margin: 26px 0 0; color: rgba(255,255,255,.74); font-size: clamp(16px, 1.5vw, 19px); line-height: 1.7; }
.builder-auth-copyright { margin: 0; color: rgba(255,255,255,.54); font-size: 12px; }
.builder-auth-orbit { position: absolute; right: 8%; bottom: 12%; width: 122px; height: 122px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; z-index: -1; }
.builder-auth-orbit::before { content: ''; position: absolute; inset: 25px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; }
.builder-auth-orbit span { position: absolute; width: 10px; height: 10px; background: #8cf2df; border-radius: 50%; box-shadow: 0 0 18px rgba(140,242,223,.8); }
.builder-auth-orbit span:nth-child(1) { top: -5px; left: 53px; }
.builder-auth-orbit span:nth-child(2) { right: 9px; bottom: 16px; width: 7px; height: 7px; }
.builder-auth-orbit span:nth-child(3) { left: 24px; top: 45px; width: 6px; height: 6px; }
.builder-auth-content { min-height: var(--builder-editor-viewport-height, 100vh); padding: clamp(32px, 6vw, 88px); display: flex; flex-direction: column; justify-content: center; align-items: center; }
.builder-auth-mobile-logo { display: none; align-self: flex-start; margin-bottom: 42px; color: #154b4c; }
.builder-auth-shell { width: min(100%, 490px); }
.builder-auth-tabs { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 38px; padding: 5px; background: #e9efed; border-radius: 13px; }
.builder-auth-tabs button { min-height: 42px; display: grid; place-items: center; color: #64716f; background: transparent; border: 0; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; transition: .2s ease; }
.builder-auth-tabs button:focus-visible { outline: 3px solid rgba(22,132,125,.28); outline-offset: 2px; }
.builder-auth-tabs button[aria-selected='true'] { color: #174d4c; background: #fff; box-shadow: 0 4px 18px rgba(17,59,58,.09); }
.builder-auth-panels { position: relative; }
.builder-auth-form { display: grid; gap: 20px; }
.builder-auth-form[hidden] { display: none; }
.builder-auth-form header { margin-bottom: 5px; }
.builder-auth-form h2, .builder-auth-signed-in h2 { margin: 0; font-family: 'Manrope', sans-serif; font-size: clamp(30px, 4vw, 42px); line-height: 1.15; letter-spacing: -.045em; }
.builder-auth-form header > p:last-child, .builder-auth-signed-in > p { margin: 12px 0 0; color: #667370; line-height: 1.6; }
.builder-auth-kicker { color: #167f78; }
.builder-auth-field { display: grid; gap: 8px; color: #273532; font-size: 13px; font-weight: 700; }
.builder-auth-field input, .builder-auth-field select, .builder-auth-field textarea { width: 100%; min-height: 52px; padding: 0 16px; color: #17222b; background: #fff; border: 1px solid #cbd7d4; border-radius: 11px; outline: 0; transition: border-color .2s, box-shadow .2s; }
.builder-auth-field textarea { min-height: 110px; padding-top: 14px; padding-bottom: 14px; resize: vertical; }
.builder-auth-field input::placeholder { color: #9ba7a4; }
.builder-auth-field input:focus, .builder-auth-field select:focus, .builder-auth-field textarea:focus { border-color: #16847d; box-shadow: 0 0 0 4px rgba(22,132,125,.12); }
.builder-auth-options { margin: 0; padding: 0; border: 0; }
.builder-auth-options legend { margin-bottom: 8px; }
.builder-auth-options > label, .builder-auth-checkbox { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; }
.builder-auth-options input, .builder-auth-checkbox input { width: 18px; min-height: 18px; height: 18px; padding: 0; }
.builder-auth-submit { min-height: 54px; padding: 0 20px; display: flex; align-items: center; justify-content: center; gap: 12px; color: #fff; background: #157c75; border: 0; border-radius: 11px; box-shadow: 0 10px 24px rgba(21,124,117,.18); font-weight: 700; cursor: pointer; transition: transform .2s, background .2s; }
.builder-auth-submit:hover { background: #116a65; transform: translateY(-1px); }
.builder-auth-status { min-height: 20px; margin: -8px 0 0; color: #18756f; font-size: 13px; text-align: center; }
.builder-auth-status[role='alert'] { color: #b73d48; }
.builder-auth-helper { margin: -4px 0 0; color: #667370; font-size: 14px; text-align: center; }
.builder-auth-helper strong { color: #12756f; }
.builder-auth-signed-in { padding: clamp(30px, 5vw, 48px); text-align: center; background: #fff; border: 1px solid #dce5e2; border-radius: 22px; box-shadow: 0 24px 80px rgba(21,53,51,.1); }
.builder-auth-signed-in .builder-auth-submit { width: 100%; margin-top: 28px; }
.builder-auth-success { width: 54px; height: 54px; margin: 0 auto 22px; display: grid; place-items: center; color: #116b65; background: #dff8f2; border-radius: 50%; font-size: 25px; font-weight: 800; }
.builder-auth-legal { max-width: 490px; margin: 38px 0 0; color: #8a9693; font-size: 11px; line-height: 1.6; text-align: center; }

@media (max-width: 900px) {
  .builder-auth-page { grid-template-columns: minmax(250px, .72fr) minmax(430px, 1.28fr); }
  .builder-auth-brand { padding: 34px; }
  .builder-auth-intro h1 { font-size: clamp(36px, 6vw, 54px); }
  .builder-auth-content { padding: 48px; }
}

@media (max-width: 700px) {
  .builder-auth-page { display: block; }
  .builder-auth-brand { display: none; }
  .builder-auth-content { min-height: var(--builder-editor-viewport-height, 100svh); padding: 28px clamp(20px, 7vw, 44px) 30px; justify-content: flex-start; }
  .builder-auth-mobile-logo { display: flex; }
  .builder-auth-shell { margin: auto 0; }
  .builder-auth-tabs { margin-bottom: 30px; }
  .builder-auth-form { gap: 17px; }
  .builder-auth-field input { height: 50px; }
  .builder-auth-legal { margin-top: 32px; }
}

@media (max-width: 380px) {
  .builder-auth-content { padding-left: 17px; padding-right: 17px; }
  .builder-auth-mobile-logo { margin-bottom: 28px; }
  .builder-auth-tabs { margin-bottom: 25px; }
  .builder-auth-form h2 { font-size: 29px; }
}

@media (prefers-reduced-motion: reduce) {
  .builder-auth-tabs button, .builder-auth-field input, .builder-auth-submit { transition: none; }
}
`

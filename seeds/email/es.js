const emails = [
  {
    name: 'new_account',
    subject: 'Bienvenido a Gravity',
    body: 'Gracias por registrarte en Gravity. Tu cuenta está ahora verificada.',
    button_label: 'Abrir Tablero',
    button_url: '{{domain}}/dashboard',
    locale: 'es',
  },
  {
    name: 'duplicate_user',
    subject: '¡Importante! Tu cuenta en Gravity',
    body: 'Hemos notado que ya has registrado una cuenta, así que hemos utilizado tu contraseña original para evitar confusiones en el futuro.',
    button_label: 'Iniciar Sesión',
    button_url: '{{domain}}/signin',
    locale: 'es',
  },
  {
    name: 'new_plan',
    subject: 'Tu plan en Gravity',
    body: 'Gracias por seleccionar el plan {{content.plan}}. Tu tarjeta ha sido cargada exitosamente con {{content.price}}.',
    button_label: 'Tu Tablero',
    button_url: '{{domain}}/dashboard',
    locale: 'es',
  },
  {
    name: 'new_user',
    subject: 'Bienvenido a Gravity',
    body: 'Gracias por registrarte en Gravity.',
    button_label: 'Abrir Tablero',
    button_url: '{{domain}}/dashboard',
    locale: 'es',
  },
  {
    name: 'plan_updated',
    subject: 'Tu plan de facturación ha sido actualizado',
    body: 'Esta es la confirmación de que tu plan de facturación ha sido actualizado exitosamente al plan {{content.plan}}.',
    button_label: 'Gestionar Tu Plan',
    button_url: '{{domain}}/account/billing',
    locale: 'es',
  },
  {
    name: "plan_updated_free",
    subject: "Se ha degradado tu plan de facturación",
    body: "Esta es la confirmación de que tu plan de facturación se degradará a gratuito al final de tu ciclo de facturación actual el.",
    button_label: "Gestionar tu plan",
    button_url: "{{domain}}/account/billing",
    locale: "es"
  },
  {
    name: 'card_updated',
    subject: 'Tu tarjeta de crédito ha sido actualizada',
    body: 'Esta es la confirmación de que los detalles de tu tarjeta de crédito han sido actualizados. Si no has cambiado tu tarjeta, por favor háznoslo saber.',
    button_label: 'Contactar Soporte',
    button_url: 'mailto:support@yourdomain.com',
    locale: 'es',
  },
  {
    name: 'account_closed',
    subject: 'Sentimos verte ir',
    body: 'Esta es la confirmación de que tu cuenta ha sido cerrada y todos tus datos han sido eliminados de nuestros servidores. \n Si cambias de opinión, puedes crear una nueva cuenta en cualquier momento.',
    button_label: 'Registrarse',
    button_url: '{{domain}}/signup',
    locale: 'es',
  },
  {
    name: 'invite_accepted',
    subject: 'Tu amigo aceptó tu invitación',
    body: '¡Woohoo! {{content.friend}} ha aceptado tu invitación para unirse a tu equipo.',
    button_label: 'Invitar Más Usuarios',
    button_url: '{{domain}}/account/users',
    locale: 'es',
  },
  {
    name: 'password_updated',
    subject: 'Tu contraseña ha sido cambiada',
    body: 'Tu nueva contraseña ha sido guardada. \n Si no has cambiado tu contraseña, por favor contactanos y háznoslo saber.',
    button_label: 'Contactar Soporte',
    button_url: 'mailto:support@yourdomain.com',
    locale: 'es',
  },
  {
    name: 'password_reset',
    subject: 'Has solicitado un restablecimiento de contraseña',
    body: 'Haz clic en el enlace a continuación para restablecer tu contraseña.',
    button_label: 'Restablecer Contraseña',
    button_url: '{{domain}}?token={{content.token}}',
    locale: 'es',
  },
  {
    name: 'invite',
    subject: 'Tu amigo te ha invitado a usar Gravity',
    body: 'Tu amigo {{content.friend}} te ha invitado a unirte a su equipo en Gravity. Regístrate ahora para comenzar a trabajar con {{content.friend}}.',
    button_label: 'Registrarse Ahora',
    button_url: '{{domain}}?id={{content.id}}&email={{content.email}}',
    locale: 'es',
  },
  {
    name: 'contact',
    subject: 'Nuevo mensaje a través del formulario de contacto',
    body: '{{content.name}} te ha enviado un nuevo mensaje. \n\n {{content.message}}',
    button_label: 'Responder Ahora',
    button_url: 'mailto:{{content.email}}',
    locale: 'es',
  },
  {
    name: 'feedback',
    subject: 'Nueva retroalimentación',
    body: 'Has recibido una nueva retroalimentación \n\n Valoración: {{content.rating}} \n\n{{content.comment}}',
    button_label: 'Ver Ahora',
    button_url: '{{domain}}/feedback',
    locale: 'es',
  },
  {
    name: 'magic_signin',
    subject: 'Tu enlace mágico para iniciar sesión',
    body: 'Has solicitado un enlace mágico para iniciar sesión en Gravity. Por favor, haz clic en el enlace a continuación para iniciar sesión sin tu contraseña.',
    button_label: 'Iniciar Sesión',
    button_url: '{{domain}}?token={{content.token}}',
    locale: 'es',
  },
  {
    name: 'new_signin',
    subject: 'Nuevo inicio de sesión en Gravity',
    body: 'Hemos notado un nuevo inicio de sesión en tu cuenta desde un nuevo dispositivo o ubicación. <b>¿Fuiste tú?</b>\n\n{{content.browser}} en {{content.device}}\n\n<b>IP</b>: {{content.ip}}\n\n<b>Hora</b>: {{content.time}}\n\nSi fuiste tú, puedes ignorar este mensaje. Si no fuiste tú, por favor cambia tu contraseña.',
    button_label: 'Cambiar Contraseña',
    button_url: '{{domain}}/account/password',
    locale: 'es',
  },
  {
    name: 'blocked_signin',
    subject: 'Inicio de sesión sospechoso bloqueado',
    body: 'Hemos notado un inicio de sesión sospechoso en tu cuenta y lo hemos bloqueado por motivos de seguridad. Si fuiste tú, puedes iniciar sesión usando el enlace a continuación.',
    button_label: 'Iniciar Sesión',
    button_url: '{{domain}}?token={{content.token}}',
    locale: 'es',
  },
  {
    name: 'help',
    subject: 'Nuevo mensaje de soporte',
    body: '{{content.name}} te ha enviado un nuevo mensaje.\n\n {{content.message}}',
    button_label: 'Responder Ahora',
    button_url: 'mailto:{{content.email}}',
    locale: 'es',
  },
  {
    name: 'new_log',
    subject: 'Nuevo registro en Gravity',
    body: 'Se ha realizado un nuevo registro en tu aplicación Gravity, inicia sesión en Mission Control para ver qué ocurrió.',
    button_label: 'Ver Registro',
    button_url: '{{domain}}/logs/{{content.id}}',
    locale: 'es',
  },
  {
    name: 'email_verification',
    subject: 'Por favor, verifica tu correo electrónico',
    body: 'Por favor, haz clic en el enlace a continuación para verificar tu dirección de correo electrónico.',
    button_label: 'Verificar Tu Correo Electrónico',
    button_url: '{{domain}}?token={{content.verification_token}}',
    locale: 'es',
  },
  {
    name: 'trial_expiring',
    subject: 'Tu periodo de prueba expira en 3 días',
    body: 'Tu cuenta será actualizada automáticamente usando los detalles de la tarjeta que proporcionaste.',
    button_label: 'Gestionar Tu Cuenta',
    button_url: '{{domain}}/account',
    locale: 'es',
  },
  {
    name: 'trial_expired',
    subject: 'Tu periodo de prueba ha terminado',
    body: 'Tu cuenta ha sido actualizada automáticamente al plan {{content.plan}}.',
    button_label: 'Abrir Tablero',
    button_url: '{{domain}}/dashboard',
    locale: 'es',
  },
  {
    name: 'unverified_account',
    subject: 'Recordatorio para verificar tu cuenta',
    body: 'Por favor, haz clic en el enlace a continuación para verificar tu dirección de correo electrónico.',
    button_label: 'Verificar Tu Correo Electrónico',
    button_url: '{{domain}}/signup/verify?token={{content.verification_token}}',
    locale: 'es',
  },
]

module.exports = emails;
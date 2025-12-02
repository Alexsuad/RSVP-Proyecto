# app/utils/translations.py
from typing import Dict, List

DEFAULT_LANG: str = "en"
VALID_LANGS: List[str] = ["en", "es", "ro"]

LANG_DISPLAY: Dict[str, str] = {
    "en": "English (EN)",
    "es": "Español (ES)",
    "ro": "Română (RO)",
}

TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # ==================================================
    # Español — tono cálido y cercano (alineado con WP)
    # ==================================================
    "es": {
        # --- Menú ---
        "nav.login": "Iniciar sesión",
        "nav.form": "Formulario RSVP",
        "nav.confirmed": "Confirmado",
        "nav.request": "Solicitar Acceso",
        "nav.recover": "Recuperar Código",
        "nav.login_prompt": "Iniciar sesión",
        "nav.home": "Inicio",
        # --- Login ---
        "login.title": "💍 Confirmar asistencia",
        "login.intro": "¡Qué alegría que estés aquí! Ingresa los datos de tu invitación para continuar.",
        "login.code": "Código de invitación",
        "login.contact": "Email o Teléfono (Ej: +573101234567)",
        "login.submit": "Acceder",
        "login.errors_empty": "Por favor, completa ambos campos.",
        "login.errors_contact_invalid": "Por favor, introduce un correo o teléfono válido.",
        "login.errors_auth": "Código, email o teléfono no coinciden.",
        "login.validating": "Validando…",
        "login.success": "¡Listo! Te llevamos al formulario…",
        "login.forgot": "¿Olvidaste tu código? Haz clic aquí",
        "login.server_err": "No pudimos validar en este momento. Inténtalo de nuevo en unos segundos.",
        "login.errors_rate_limit": "Has superado el número máximo de intentos. Por favor, espera unos minutos y vuelve a intentarlo.",
        "login.code_placeholder": "Ej: ALEX-1234",
        "login.contact_placeholder": "Ej: +57... o nombre@mail.com",
        # --- Solicitar Acceso ---
        "request.title": "Solicita tu acceso",
        "request.intro": "Para identificarte, indícanos tu nombre completo, los últimos 4 dígitos de tu teléfono y el email donde quieres recibir tu enlace.",
        "request.full_name": "Tu nombre completo",
        "request.phone_last4": "Últimos 4 dígitos de tu teléfono",
        "request.phone_last4_placeholder": "Ej.: 5678",
        "request.email": "Correo electrónico",
        "request.submit": "Solicitar acceso",
        "request.consent": "Acepto recibir comunicaciones de la boda por correo electrónico.",
        "request.success": "¡Listo! Te enviamos un enlace a tu correo. Revisa tu bandeja de entrada (y Spam/Promociones).",
        "request.error": "No pudimos procesar tu solicitud. Verifica los datos e inténtalo de nuevo.",
        "request.not_found_message": "❌ No pudimos verificar tus datos con la invitación. Revísalos e inténtalo de nuevo.",
        "request.resend": "¿No te llegó el correo? Haz clic aquí para reenviar.",
        "request.invalid_email": "El email no parece válido.",
        "request.invalid_phone4": "Debes ingresar exactamente 4 dígitos.",
        "request.success_message_neutral": "Si los datos coinciden con tu invitación, recibirás un enlace en tu correo. Revisa tu bandeja de entrada y también Spam/Promociones.",
        "request.success_message_ok": "✅ Datos verificados. Te enviamos un enlace a tu correo. Revisa Bandeja/Spam/Promociones.",
        "request.invalid_name": "El nombre debe tener al menos 3 caracteres.",
        "request.consent_required": "Debes aceptar el consentimiento para continuar.",
        # --- Formulario RSVP ---
        "form.hi": "Hola",
        "form.subtitle": "Confirma tu asistencia y cuéntanos algunos detalles ✨",
        "form.attending": "¿Asistirás?",
        "form.yes": "Sí",
        "form.no": "No",
        "form.select_option": "Elige una opción para continuar.",
        "form.no_attend_short": "Gracias por avisarnos. ¡Te echaremos de menos! 😔",
        "form.generic_error": "Algo salió mal al guardar tu respuesta. Inténtalo más tarde.",
        "form.error_unauthorized": "No pudimos validar tu sesión. Por favor, vuelve a iniciar sesión e inténtalo de nuevo.",
        "form.error_rate_limit": "Has realizado demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentarlo.",
        "form.error_server": "Tenemos un problema técnico en este momento. Inténtalo de nuevo en unos minutos, por favor.",
        "form.sending": "Enviando…",
        "form.submit": "Enviar respuesta",
        "form.cancel": "Cancelar",
        "form.net_err": "No pudimos contactar el servidor. Inténtalo de nuevo.",
        "form.session_expired": "Tu sesión ha expirado. Por favor, inicia sesión otra vez.",
        "form.load_error": "No pudimos cargar tus datos en este momento.",
        "form.email_or_phone_conflict": "El correo electrónico o el teléfono proporcionado ya está en uso por otro invitado.",
        "form.placeholder_email": "nombre@correo.com",
        "form.placeholder_phone": "+34 600 123 456",
        # --- Invitación / horarios ---
        "form.invite_title": "Tu invitación",
        "form.invite_full_access": "Estás invitada/o a la **Ceremonia** y a la **Recepción**. ¡Nos hace muy felices compartir este día contigo! 🕊️",
        "form.invite_reception_only": "Estás invitada/o a la **Recepción**. ¡Será un gusto celebrar juntos! 🎉",
        "form.time_ceremony": "Ceremonia",
        "form.time_reception": "Recepción",
        "form.accomp_note": "Puedes traer **hasta {max_accomp} acompañante{plural}**.",
        # --- Contacto ---
        "form.contact_title": "Datos de contacto",
        "form.contact_caption": "Usaremos estos datos para enviarte la confirmación y recordatorios. 💌",
        "form.field_email": "Email",
        "form.field_phone": "Teléfono (Ej: +573101234567)",
        "form.contact_required_one": "Por favor, indícanos al menos un correo o un teléfono.",
        "form.contact_invalid_email": "El formato del email no es válido.",
        "form.contact_invalid_phone": "El teléfono debe incluir el código de país. Ej.: +573101234567",
        # --- Alergias (titular) ---
        "form.titular_allergies": "Alergias o restricciones (titular)",
        "form.allergies_caption": "Cuéntanos si hay algo que debamos tener en cuenta para cuidar de ti. 💙",
        "form.allergies_or_restrictions": "Alergias o restricciones",
        "form.companion_allergies_label": "Alergias e intolerancias del acompañante (opcional)",
        # --- Acompañantes ---
        "form.companions_title": "Acompañantes",
        "form.companions_db_note": "La cantidad de acompañantes permitidos depende de tu invitación.",
        "form.no_companions_info": "Tu invitación no incluye acompañantes.",
        "form.bring_companions": "¿Vienes acompañada/o?",
        "form.companions_count": "¿Cuántas personas te acompañarán?",
        "form.companion_label": "Acompañante",
        "form.field_name": "Nombre",
        "form.placeholder_fullname": "Nombre y apellido",
        "form.field_name_caption": "Nombre completo del acompañante.",
        "form.child_or_adult": "Tipo",
        "form.child_or_adult_caption": "Indica si es adulto o niño.",
        "form.adult": "Adulto",
        "form.child": "Niño",
        "form.companion_name_required": "Por favor, indica el nombre de cada acompañante seleccionado.",
        # --- Mensaje opcional ---
        "form.notes.expander_label": "📝 ¿Quieres dejarnos un mensaje opcional?",
        "form.notes.placeholder": "Ej.: Llegaremos un poco tarde, preferimos una mesa tranquila…",
        # --- Página de Confirmado ---
        "ok.title": "¡Confirmación recibida!",
        "ok.msg_yes": "¡Gracias por confirmar! Tu respuesta ha sido guardada.",
        "ok.msg_no": "Hemos registrado que no podrás asistir. ¡Te echaremos de menos! 💕",
        "ok.summary": "Este es un resumen de tu confirmación:",
        "ok.main_guest": "Invitado principal",
        "ok.adults_children": "Adultos / Niños",
        "ok.allergies": "Alergias (titular)",
        "ok.companions": "Acompañantes",
        "ok.alrg_item": "Alergias",
        "ok.btn_edit": "✏️ Editar respuesta",
        "ok.btn_resend_email": "Reenviar email",
        "ok.btn_logout": "Cerrar sesión",
        "ok.load_error": "No pudimos cargar el resumen de tu confirmación.",
        "ok.sending": "Enviando...",
        "ok.resent_ok": "¡Correo de confirmación reenviado!",
        "ok.resent_fail": "No se pudo reenviar el correo.",
        "ok.no_data": "Por ahora no vemos ninguna confirmación asociada a este enlace. Si ya respondiste, prueba a abrir de nuevo el enlace del correo de invitación.",
        # --- Panel de Invitación (usado en Formulario y Confirmado) ---
        "invite.panel_title": "Tu invitación",
        "invite.scope.full": "Estás invitado/a a la **Ceremonia** y a la **Recepción**.",
        "invite.scope.reception": "Estás invitado/a a la **Recepción**.",
        "invite.times.hint": "Ceremonia {ceremony_time} · Recepție {reception_time}",
        # --- Opciones / catálogos UI ---
        "options.allergen.gluten": "Gluten",
        "options.allergen.dairy": "Lácteos",
        "options.allergen.nuts": "Frutos secos",
        "options.allergen.seafood": "Mariscos",
        "options.allergen.eggs": "Huevos",
        "options.allergen.soy": "Soja",
        "options.attendance.yes": "Sí",
        "options.attendance.no": "No",
        "options.attendance.maybe": "Tal vez",
        "options.menu.beef": "Carne",
        "options.menu.chicken": "Pollo",
        "options.menu.fish": "Pescado",
        "options.menu.veggie": "Vegetariano",
        # --- Recuperar código ---
        "recover.title": "Recuperar tu código",
        "recover.subtitle": "Ingresa tu email o teléfono usado en la invitación. Si estás en la lista, te enviaremos un mensaje.",
        "recover.email": "Email (opcional)",
        "recover.phone": "Teléfono (opcional)",
        "recover.submit": "Solicitar recuperación",
        "recover.success": "Si tu contacto está en la lista de invitados, recibirás un mensaje en breve.",
        "recover.rate_limited": "Has realizado demasiados intentos. Inténtalo nuevamente en ~{retry}.",
        "recover.invalid": "Solicitud inválida. Verifica los datos e inténtalo de nuevo.",
        "recover.generic": "No pudimos procesar la solicitud en este momento. Inténtalo más tarde.",
        "recover.network": "No hay conexión con el servidor. Detalle: {err}",
        "recover.back": "⬅️ Volver al inicio",
        "recover.go_rsvp": "Ir al formulario RSVP",
        # --- Fechas / meses ---
        "date.month.01": "enero",
        "date.month.02": "febrero",
        "date.month.03": "marzo",
        "date.month.04": "abril",
        "date.month.05": "mayo",
        "date.month.06": "junio",
        "date.month.07": "julio",
        "date.month.08": "agosto",
        "date.month.09": "septiembre",
        "date.month.10": "octubre",
        "date.month.11": "noviembre",
        "date.month.12": "diciembre",
        # --- Email / asuntos ---
        "email.subject.reminder": "Recordatorio: Confirma tu asistencia a nuestra boda",
        "email.subject.recovery": "Recuperación de código de invitado",
        "email.subject.magic_link": "Tu enlace mágico para confirmar asistencia",
        "email.subject.confirmation": "✅ Confirmación recibida • Boda Jenny & Cristian",
        "email.magic_link.text_fallback": "Abre este enlace para confirmar tu asistencia: {url}",
        # --- Emails: recordatorios, recuperación y confirmación (texto plano) ---
        "email.reminder_both": (
            "Hola {name},\n\n"
            "Este es un amable recordatorio para que confirmes tu asistencia a nuestra ceremonia y recepción.\n"
            "La fecha límite para confirmar es el {deadline}.\n\n"
            "{cta}\n\n"
            "¡Esperamos verte allí!\n\n"
            "Un abrazo,\nJenny & Cristian"
        ),
        "email.reminder_reception": (
            "Hola {name},\n\n"
            "Este es un amable recordatorio para que confirmes tu asistencia a nuestra recepción.\n"
            "La fecha límite para confirmar es el {deadline}.\n\n"
            "{cta}\n\n"
            "¡Nos encantaría celebrar contigo!\n\n"
            "Un abrazo,\nJenny & Cristian"
        ),
        "email.recovery": (
            "Hola {name},\n\n"
            "Has solicitado recuperar tu código de invitado.\n"
            "Tu código es: {guest_code}\n\n"
            "Puedes usarlo junto con tu email o teléfono para iniciar sesión en el formulario.\n"
            "{cta}\n\n"
            "Si no solicitaste este mensaje, puedes ignorarlo.\n\n"
            "Un abrazo,\nJenny & Cristian"
        ),
        "email.cta_rsvp": "👉 Confirma aquí: {url}",
        "email.confirmation_plain": (
            "Hola {name},\n\n"
            "¡Gracias por confirmar tu asistencia!\n"
            "Invitación: {invite_scope}\n"
            "Asistencia: {attending}\n"
            "{companions}\n"
            "{allergies}\n"
            "{notes}\n\n"
            "Te iremos informando con más detalles conforme se acerque la fecha.\n\n"
            "Un abrazo,\nJenny & Cristian"
        ),
        # --- Emails: código de invitación (guest code) ---
        "email.subject.guest_code": "Tu código de invitación • Boda Jenny & Cristian",
        "email.guest_code.greet": "Hola",
        "email.guest_code.intro": "Tu código de invitación es: {guest_code}",
        "email.guest_code.instruction": "Usa este código en la página de Iniciar sesión:",
        "email.guest_code.button_label": "Iniciar sesión",
        "email.guest_code.login_line": "Login: {url}",
        # --- Emails: confirmación de RSVP (resumen) ---
        "email.confirmation.greet": "Hola",
        "email.confirmation.thanks": "¡Gracias por confirmar tu asistencia!",
        "email.confirmation.scope.ceremony_reception": "Ceremonia + Recepción",
        "email.confirmation.scope.reception_only": "Solo Recepción",
        "email.confirmation.attending.yes": "Asistencia: Sí",
        "email.confirmation.attending.no": "Asistencia: No",
        "email.confirmation.attending.unknown": "Asistencia: —",
        "email.confirmation.label.invitation": "Invitación",
        "email.confirmation.label.event_date": "Fecha del evento",
        "email.confirmation.label.guests": "Invitados",
        "email.confirmation.label.menu": "Menú",
        "email.confirmation.label.companions": "Acompañantes",
        "email.confirmation.label.allergies": "Alergias",
        "email.confirmation.label.notes": "Notas",
        "email.confirmation.footer.more_details": "Te iremos informando con más detalles conforme se acerque la fecha.",
    },
    # ==================================================
    # Română — ton cald, clar, cu notă festivă
    # ==================================================
    "ro": {
        # --- Meniu ---
        "nav.login": "Autentificare",
        "nav.form": "Formular RSVP",
        "nav.confirmed": "Confirmat",
        "nav.request": "Solicită Acces",
        "nav.recover": "Recuperează Codul",
        "nav.login_prompt": "Autentificare",
        "nav.home": "Acasă",
        # --- Login ---
        "login.title": "💍 Confirmă prezența",
        "login.intro": "Ne bucurăm că ești aici! Introdu datele invitației pentru a continua.",
        "login.code": "Cod invitație",
        "login.contact": "Email sau telefon (Ex: +40722123456)",
        "login.submit": "Continuă",
        "login.errors_empty": "Te rugăm să completezi ambele câmpuri.",
        "login.errors_contact_invalid": "Te rugăm să introduci un email sau un număr de telefon valid.",
        "login.errors_auth": "Cod, email sau telefon nu corespund.",
        "login.validating": "Se verifică…",
        "login.success": "Acces permis! Te ducem la formular…",
        "login.forgot": "Ți-ai uitat codul? Apasă aici",
        "login.server_err": "Nu am putut valida acum. Te rugăm să încerci din nou în scurt timp.",
        "login.errors_rate_limit": "Ați depășit numărul maxim de încercări. Vă rugăm să așteptați câteva minute și să încercați din nou.",
        "login.code_placeholder": "Ex: ALEX-1234",
        "login.contact_placeholder": "Ex: +40... sau nume@mail.com",
        # --- Cere Accesul ---
        "request.title": "Solicită accesul",
        "request.intro": "Pentru identificare, te rugăm să ne spui numele complet, ultimele 4 cifre ale telefonului și emailul unde vrei să primești linkul.",
        "request.full_name": "Numele tău complet",
        "request.phone_last4": "Ultimele 4 cifre ale telefonului",
        "request.phone_last4_placeholder": "Ex.: 5678",
        "request.email": "Adresă de email",
        "request.submit": "Trimite linkul de acces",
        "request.consent": "Sunt de acord să primesc comunicări legate de nuntă prin email.",
        "request.success": "Gata! Ți-am trimis un link pe email. Verifică Inbox și Spam/Promotions.",
        "request.error": "Nu am putut procesa cererea. Verifică datele și încearcă din nou.",
        "request.not_found_message": "❌ Nu am putut verifica datele tale cu invitația. Te rugăm să le verifici și să încerci din nou.",
        "request.resend": "Nu ai primit emailul? Click aici pentru retrimitere.",
        "request.invalid_email": "Emailul nu pare valid.",
        "request.invalid_phone4": "Introdu exact 4 cifre.",
        "request.success_message_neutral": "Dacă datele se potrivesc invitației, vei primi un link pe email. Verifică Inbox și Spam/Promotions.",
        "request.success_message_ok": "✅ Datele au fost verificate. Ți-am trimis un link pe email. Verifică Inbox și Spam/Promotions.",
        "request.invalid_name": "Numele trebuie să aibă cel puțin 3 caractere.",
        "request.consent_required": "Trebuie să accepți consimțământul pentru a continua.",
        # --- Formular RSVP ---
        "form.hi": "Salut",
        "form.subtitle": "Confirmă prezența și spune-ne câteva detalii ✨",
        "form.attending": "Vei participa?",
        "form.yes": "Da",
        "form.no": "Nu",
        "form.select_option": "Alege o opțiune pentru a continua.",
        "form.no_attend_short": "Îți mulțumim că ne-ai anunțat. Ne va fi dor de tine. 😔",
        "form.generic_error": "A apărut o eroare la salvarea răspunsului. Te rugăm să încerci mai târziu.",
        "form.error_unauthorized": "Nu am reușit să îți validăm sesiunea. Te rugăm să te reconectezi și să încerci din nou.",
        "form.error_rate_limit": "Ai făcut prea multe încercări într-un timp scurt. Așteaptă câteva minute înainte de a încerca din nou.",
        "form.error_server": "Avem o problemă tehnică în acest moment. Te rugăm să încerci din nou peste câteva minute.",
        "form.sending": "Se trimite…",
        "form.submit": "Trimite răspunsul",
        "form.cancel": "Anulează",
        "form.net_err": "Nu se poate contacta serverul. Încearcă din nou.",
        "form.session_expired": "Sesiunea a expirat. Te rugăm să te autentifici din nou.",
        "form.load_error": "A apărut o eroare la încărcarea datelor tale.",
        "form.email_or_phone_conflict": "Adresa de e-mail sau numărul de telefon furnizat este deja folosit de un alt invitat.",
        "form.placeholder_email": "nume@exemplu.com",
        "form.placeholder_phone": "+40 600 123 456",
        # --- Invitație / program ---
        "form.invite_title": "Invitația ta",
        "form.invite_full_access": "Ești invitat(ă) la **Ceremonie** și la **Recepție**. Ne bucurăm să împărtășim această zi cu tine! 🕊️",
        "form.invite_reception_only": "Ești invitat(ă) la **Recepție**. Abia așteptăm să sărbătorim împreună! 🎉",
        "form.time_ceremony": "Ceremonie",
        "form.time_reception": "Recepție",
        "form.accomp_note": "Poți veni cu **până la {max_accomp} însoțitor(i)**.",
        # --- Contact ---
        "form.contact_title": "Date de contact",
        "form.contact_caption": "Vom folosi aceste date pentru confirmare și pentru memento-uri. 💌",
        "form.field_email": "Email",
        "form.field_phone": "Telefon (Ex: +40722123456)",
        "form.contact_required_one": "Te rugăm să oferi cel puțin un email sau un telefon.",
        "form.contact_invalid_email": "Adresa de email nu pare validă.",
        "form.contact_invalid_phone": "Telefonul trebuie să includă prefixul internațional. Ex.: +40722123456",
        # --- Alergii (titular) ---
        "form.titular_allergies": "Alergii sau restricții (titular)",
        "form.allergies_caption": "Spune-ne dacă există ceva important pentru a avea grijă de tine. 💙",
        "form.allergies_or_restrictions": "Alergii sau restricții",
        "form.companion_allergies_label": "Alergii și intoleranțe ale însoțitorului (opțional)",
        # --- Însoțitori ---
        "form.companions_title": "Însoțitori",
        "form.companions_db_note": "Numărul de însoțitori permiși depinde de invitația ta.",
        "form.no_companions_info": "Invitația ta nu include însoțitori.",
        "form.bring_companions": "Vii însoțit(ă)?",
        "form.companions_count": "Câți oameni te vor însoți?",
        "form.companion_label": "Însoțitor",
        "form.field_name": "Nume",
        "form.placeholder_fullname": "Nume și prenume",
        "form.field_name_caption": "Numele complet al însoțitorului.",
        "form.child_or_adult": "Tip",
        "form.child_or_adult_caption": "Indică dacă este adult sau copil.",
        "form.adult": "Adult",
        "form.child": "Copil",
        "form.companion_name_required": "Te rugăm să completezi numele fiecărui însoțitor selectat.",
        # --- Mesaj opțional ---
        "form.notes.expander_label": "📝 Vrei să ne lași un mesaj opțional?",
        "form.notes.placeholder": "Ex.: Venim mai târziu, preferăm o masă liniștită…",
        # --- Pagina de Confirmare ---
        "ok.title": "Confirmare primită!",
        "ok.msg_yes": "Îți mulțumim pentru confirmare! Răspunsul tău a fost salvat.",
        "ok.msg_no": "Am înregistrat că nu vei putea participa. Ne va fi dor de tine!",
        "ok.summary": "Iată un sumar al confirmării tale:",
        "ok.main_guest": "Invitat principal",
        "ok.adults_children": "Adulți / Copii",
        "ok.allergies": "Alergii (titular)",
        "ok.companions": "Însoțitori",
        "ok.alrg_item": "Alergii",
        "ok.btn_edit": "✏️ Editează răspunsul",
        "ok.btn_resend_email": "Retrimite email",
        "ok.btn_logout": "Deconectare",
        "ok.load_error": "Nu am putut încărca sumarul confirmării.",
        "ok.sending": "Se trimite...",
        "ok.resent_ok": "Emailul de confirmare a fost retrimis!",
        "ok.resent_fail": "Emailul nu a putut fi retrimis.",
        "ok.no_data": "Momentan nu vedem nicio confirmare asociată acestui link. Dacă ai răspuns deja, te rugăm să deschizi din nou linkul din emailul de invitație.",
        # --- Panou Invitație (folosit în Formular și Confirmare) ---
        "invite.panel_title": "Invitația ta",
        "invite.scope.full": "Ești invitat(ă) la **Ceremonie** și la **Recepție**.",
        "invite.scope.reception": "Ești invitat(ă) la **Recepție**.",
        "invite.times.hint": "Ceremonie {ceremony_time} · Recepție {reception_time}",
        # --- Opțiuni / cataloage UI ---
        "options.allergen.gluten": "Gluten",
        "options.allergen.dairy": "Lactate",
        "options.allergen.nuts": "Nuci",
        "options.allergen.seafood": "Fructe de mare",
        "options.allergen.eggs": "Ouă",
        "options.allergen.soy": "Soia",
        "options.attendance.yes": "Da",
        "options.attendance.no": "Nu",
        "options.attendance.maybe": "Poate",
        "options.menu.beef": "Vită",
        "options.menu.chicken": "Pui",
        "options.menu.fish": "Pește",
        "options.menu.veggie": "Vegetarian",
        # --- Recuperare cod ---
        "recover.title": "Recuperează-ți codul",
        "recover.subtitle": "Introdu emailul sau telefonul folosit în invitație. Dacă ești în listă, vei primi un mesaj.",
        "recover.email": "Email (opțional)",
        "recover.phone": "Telefon (opțional)",
        "recover.submit": "Solicită recuperarea",
        "recover.success": "Dacă datele tale se află în lista de invitați, vei primi în curând un mesaj.",
        "recover.rate_limited": "Prea multe încercări. Încearcă din nou peste ~{retry}.",
        "recover.invalid": "Cerere invalidă. Verifică datele și încearcă din nou.",
        "recover.generic": "Nu am putut procesa cererea acum. Încearcă mai târziu.",
        "recover.network": "Nu se poate contacta serverul. Detalii: {err}",
        "recover.back": "⬅️ Înapoi la început",
        "recover.go_rsvp": "Mergi la formularul RSVP",
        # --- Date / luni ---
        "date.month.01": "ianuarie",
        "date.month.02": "februarie",
        "date.month.03": "martie",
        "date.month.04": "aprilie",
        "date.month.05": "mai",
        "date.month.06": "iunie",
        "date.month.07": "iulie",
        "date.month.08": "august",
        "date.month.09": "septembrie",
        "date.month.10": "octombrie",
        "date.month.11": "noiembrie",
        "date.month.12": "decembrie",
        # --- Email / subiecte ---
        "email.subject.reminder": "Memento: Confirmă-ți prezența la nunta noastră",
        "email.subject.recovery": "Recuperare cod invitat",
        "email.subject.magic_link": "Linkul tău magic pentru confirmare",
        "email.subject.confirmation": "✅ Confirmare înregistrată • Nunta Jenny & Cristian",
        "email.magic_link.text_fallback": "Deschide acest link pentru a-ți confirma prezența: {url}",
        # --- Emails: mementouri, recuperare și confirmare (text simplu) ---
        "email.reminder_both": (
            "Bună {name},\n\n"
            "Acesta este un memento prietenos pentru a confirma participarea la ceremonia și recepție.\n"
            "Data limită pentru confirmare este {deadline}.\n\n"
            "{cta}\n\n"
            "Sperăm să te vedem acolo!\n\n"
            "Cu drag,\nJenny & Cristian"
        ),
        "email.reminder_reception": (
            "Bună {name},\n\n"
            "Acesta este un memento prietenos pentru a confirma participarea la recepția noastră.\n"
            "Data limită pentru confirmare este {deadline}.\n\n"
            "{cta}\n\n"
            "Ne-ar plăcea să sărbătorim cu tine!\n\n"
            "Cu drag,\nJenny & Cristian"
        ),
        "email.recovery": (
            "Bună {name},\n\n"
            "Ai solicitat recuperarea codului tău de invitat.\n"
            "Codul tău este: {guest_code}\n\n"
            "Îl poți folosi împreună cu emailul sau telefonul pentru autentificare în formular.\n"
            "{cta}\n\n"
            "Dacă nu ai solicitat acest mesaj, îl poți ignora.\n\n"
            "Cu drag,\nJenny & Cristian"
        ),
        "email.cta_rsvp": "👉 Confirmă aici: {url}",
        "email.confirmation_plain": (
            "Bună {name},\n\n"
            "Îți mulțumim că ai confirmat prezența!\n"
            "Invitație: {invite_scope}\n"
            "Participare: {attending}\n"
            "{companions}\n"
            "{allergies}\n"
            "{notes}\n\n"
            "Te vom ține la curent cu mai multe detalii pe măsură ce se apropie data.\n\n"
            "Cu drag,\nJenny & Cristian"
        ),
        # --- Emails: cod de invitație (guest code) ---
        "email.subject.guest_code": "Codul tău de invitație • Nunta Jenny & Cristian",
        "email.guest_code.greet": "Bună",
        "email.guest_code.intro": "Codul tău de invitație este: {guest_code}",
        "email.guest_code.instruction": "Folosește acest cod pe pagina de autentificare:",
        "email.guest_code.button_label": "Conectare",
        "email.guest_code.login_line": "Autentificare: {url}",
        # --- Emails: confirmare RSVP (rezumat) ---
        "email.confirmation.greet": "Bună",
        "email.confirmation.thanks": "Îți mulțumim că ai confirmat prezența!",
        "email.confirmation.scope.ceremony_reception": "Ceremonie + Recepție",
        "email.confirmation.scope.reception_only": "Doar Recepție",
        "email.confirmation.attending.yes": "Participare: Da",
        "email.confirmation.attending.no": "Participare: Nu",
        "email.confirmation.attending.unknown": "Participare: —",
        "email.confirmation.label.invitation": "Invitație",
        "email.confirmation.label.event_date": "Data evenimentului",
        "email.confirmation.label.guests": "Invitați",
        "email.confirmation.label.menu": "Meniu",
        "email.confirmation.label.companions": "Însoțitori",
        "email.confirmation.label.allergies": "Alergii",
        "email.confirmation.label.notes": "Note",
        "email.confirmation.footer.more_details": "Te vom ține la curent cu mai multe detalii pe măsură ce se apropie data.",
    },
    # ==================================================
    # English — warm, clear, a touch celebratory
    # ==================================================
    "en": {
        # --- Menu ---
        "nav.login": "Login",
        "nav.form": "RSVP Form",
        "nav.confirmed": "Confirmed",
        "nav.request": "Request Access",
        "nav.recover": "Recover Code",
        "nav.login_prompt": "Log in",
        "nav.home": "Home",
        # --- Login ---
        "login.title": "💍 Confirm attendance",
        "login.intro": "We’re so happy you’re here! Enter your invitation details to continue.",
        "login.code": "Invitation code",
        "login.contact": "Email or phone (E.g. +447911123456",
        "login.submit": "Continue",
        "login.errors_empty": "Please complete both fields.",
        "login.errors_contact_invalid": "Please enter a valid email address or phone number.",
        "login.errors_auth": "Code, email or phone don’t match.",
        "login.validating": "Validating…",
        "login.success": "All set! Taking you to the form…",
        "login.forgot": "Forgot your code? Click here",
        "login.server_err": "We couldn’t verify your details right now. Please try again in a moment.",
        "login.errors_rate_limit": "You have exceeded the maximum number of attempts. Please wait a few minutes and try again.",
        "login.code_placeholder": "Ex: ALEX-1234",
        "login.contact_placeholder": "Ex: +40... sau nume@mail.com",
        # --- Request Access ---
        "request.title": "Request access",
        "request.intro": "To identify you, please share your full name, the last 4 digits of your phone, and the email where you’d like to receive your access link.",
        "request.full_name": "Your full name",
        "request.phone_last4": "Last 4 digits of your phone",
        "request.phone_last4_placeholder": "E.g., 5678",
        "request.email": "Email address",
        "request.submit": "Send access link",
        "request.consent": "I agree to receive wedding communications by email.",
        "request.success": "Done! We’ve sent a link to your email. Check Inbox and Spam/Promotions.",
        "request.error": "We couldn’t process your request. Please verify your details and try again.",
        "request.not_found_message": "❌ We couldn’t verify your data with the invitation. Please check and try again.",
        "request.resend": "Didn’t get the email? Click here to resend.",
        "request.invalid_email": "The email doesn’t look valid.",
        "request.invalid_phone4": "Enter exactly 4 digits.",
        "request.success_message_neutral": "If your details match an invitation, you'll receive a link by email. Check Inbox and Spam/Promotions.",
        "request.success_message_ok": "✅ Data verified. We’ve sent you a link to your email. Please check Inbox/Spam/Promotions.",
        "request.invalid_name": "The name must have at least 3 characters.",
        "request.consent_required": "Please accept the consent to continue.",
        # --- RSVP Form ---
        "form.hi": "Hi",
        "form.subtitle": "Confirm your attendance and share a few details ✨",
        "form.attending": "Will you attend?",
        "form.yes": "Yes",
        "form.no": "No",
        "form.select_option": "Choose an option to continue.",
        "form.no_attend_short": "Thank you for letting us know. We’ll miss you! 😔",
        "form.generic_error": "Something went wrong while saving your response. Please try again later.",
        "form.error_unauthorized": "We couldn’t validate your session. Please log in again and try once more.",
        "form.error_rate_limit": "You’ve made too many attempts in a short time. Please wait a few minutes before trying again.",
        "form.error_server": "We’re having a technical issue right now. Please try again in a few minutes.",
        "form.sending": "Sending…",
        "form.submit": "Send response",
        "form.cancel": "Cancel",
        "form.net_err": "We couldn’t reach the server. Please try again.",
        "form.session_expired": "Your session has expired. Please log in again.",
        "form.load_error": "We couldn’t load your data at this time.",
        "form.email_or_phone_conflict": "The email or phone number provided is already in use by another guest.",
        "form.placeholder_email": "name@example.com",
        "form.placeholder_phone": "+34 600 123 456",
        # --- Invitation / times ---
        "form.invite_title": "Your invitation",
        "form.invite_full_access": "You’re invited to the **Ceremony** and the **Reception**. We’re thrilled to share this day with you! 🕊️",
        "form.invite_reception_only": "You’re invited to the **Reception**. We can’t wait to celebrate together! 🎉",
        "form.time_ceremony": "Ceremony",
        "form.time_reception": "Reception",
        "form.accomp_note": "You can bring **up to {max_accomp} companion{plural}**.",
        # --- Contact ---
        "form.contact_title": "Contact details",
        "form.contact_caption": "We’ll use this information to send your confirmation and reminders. 💌",
        "form.field_email": "Email",
        "form.field_phone": "Phone (E.g. +447911123456)",
        "form.contact_required_one": "Please provide at least an email or a phone number.",
        "form.contact_invalid_email": "The email doesn’t look valid.",
        "form.contact_invalid_phone": "Please include the country code in your phone number E.g., +447911123456",
        # --- Allergies (main guest) ---
        "form.titular_allergies": "Allergies or restrictions (main guest)",
        "form.allergies_caption": "Let us know anything we should consider to take good care of you. 💙",
        "form.allergies_or_restrictions": "Allergies or restrictions",
        "form.companion_allergies_label": "Companion’s allergies and intolerances (optional)",
        # --- Companions ---
        "form.companions_title": "Companions",
        "form.companions_db_note": "The number of companions allowed depends on your invitation.",
        "form.no_companions_info": "Your invitation does not include companions.",
        "form.bring_companions": "Will you bring companions?",
        "form.companions_count": "How many people will join you?",
        "form.companion_label": "Companion",
        "form.field_name": "Name",
        "form.placeholder_fullname": "First and last name",
        "form.field_name_caption": "Companion’s full name.",
        "form.child_or_adult": "Type",
        "form.child_or_adult_caption": "Indicate if they are an adult or a child.",
        "form.adult": "Adult",
        "form.child": "Child",
        "form.companion_name_required": "Please provide the name for each selected companion.",
        # --- Optional note ---
        "form.notes.expander_label": "📝 Would you like to leave an optional message?",
        "form.notes.placeholder": "E.g., We might arrive a bit late, we’d love a quiet table…",
        # --- Confirmation Page ---
        "ok.title": "Confirmation Received!",
        "ok.msg_yes": "Thank you for confirming! Your response has been saved.",
        "ok.msg_no": "We've noted that you won't be able to attend. We'll miss you!",
        "ok.summary": "Here is a summary of your confirmation:",
        "ok.main_guest": "Main Guest",
        "ok.adults_children": "Adults / Children",
        "ok.allergies": "Allergies (main guest)",
        "ok.companions": "Companions",
        "ok.alrg_item": "Allergies",
        "ok.btn_edit": "✏️ Edit response",
        "ok.btn_resend_email": "Resend email",
        "ok.btn_logout": "Log out",
        "ok.load_error": "We couldn't load your confirmation summary.",
        "ok.sending": "Sending...",
        "ok.resent_ok": "Confirmation email resent!",
        "ok.resent_fail": "Could not resend the email.",
        "ok.no_data": "We can’t see any confirmation linked to this link yet. If you already replied, please try opening the invitation email link again.",
        # --- Invitation Panel (used in Form & Confirmed) ---
        "invite.panel_title": "Your Invitation",
        "invite.scope.full": "You are invited to the **Ceremony** and the **Reception**.",
        "invite.scope.reception": "You are invited to the **Reception**.",
        "invite.times.hint": "Ceremony {ceremony_time} · Reception {reception_time}",
        # --- Options / UI catalogs ---
        "options.allergen.gluten": "Gluten",
        "options.allergen.dairy": "Dairy",
        "options.allergen.nuts": "Tree nuts",
        "options.allergen.seafood": "Seafood",
        "options.allergen.eggs": "Eggs",
        "options.allergen.soy": "Soy",
        "options.attendance.yes": "Yes",
        "options.attendance.no": "No",
        "options.attendance.maybe": "Maybe",
        "options.menu.beef": "Beef",
        "options.menu.chicken": "Chicken",
        "options.menu.fish": "Fish",
        "options.menu.veggie": "Vegetarian",
        # --- Recover Code ---
        "recover.title": "Recover your code",
        "recover.subtitle": "Enter the email or phone used in your invitation. If you are on the list, we will send you a message.",
        "recover.email": "Email (optional)",
        "recover.phone": "Phone (optional)",
        "recover.submit": "Request recovery",
        "recover.success": "If your contact is on the guest list, you will receive a message shortly.",
        "recover.rate_limited": "Too many attempts. Please try again in ~{retry}.",
        "recover.invalid": "Invalid request. Please check the data and try again.",
        "recover.generic": "We couldn't process your request at the moment. Please try again later.",
        "recover.network": "Cannot reach the server. Details: {err}",
        "recover.back": "⬅️ Back to home",
        "recover.go_rsvp": "Go to RSVP form",
        # --- Dates / months ---
        "date.month.01": "January",
        "date.month.02": "February",
        "date.month.03": "March",
        "date.month.04": "April",
        "date.month.05": "May",
        "date.month.06": "June",
        "date.month.07": "July",
        "date.month.08": "August",
        "date.month.09": "September",
        "date.month.10": "October",
        "date.month.11": "November",
        "date.month.12": "December",
        # --- Email / subjects ---
        "email.subject.reminder": "Reminder: Please RSVP for our wedding",
        "email.subject.recovery": "Guest code recovery",
        "email.subject.magic_link": "Your magic link to confirm attendance",
        "email.subject.confirmation": "✅ RSVP received • Jenny & Cristian Wedding",
        "email.magic_link.text_fallback": "Open this link to confirm your attendance: {url}",
        # --- Emails: reminders, recovery and confirmation (plain text) ---
        "email.reminder_both": (
            "Hi {name},\n\n"
            "This is a friendly reminder to confirm your attendance for our ceremony and reception.\n"
            "The deadline to RSVP is {deadline}.\n\n"
            "{cta}\n\n"
            "We hope to see you there!\n\n"
            "Best,\nJenny & Cristian"
        ),
        "email.reminder_reception": (
            "Hi {name},\n\n"
            "This is a friendly reminder to confirm your attendance for our reception.\n"
            "The deadline to RSVP is {deadline}.\n\n"
            "{cta}\n\n"
            "We would love to celebrate with you!\n\n"
            "Best,\nJenny & Cristian"
        ),
        "email.recovery": (
            "Hi {name},\n\n"
            "You requested to recover your guest code.\n"
            "Your code is: {guest_code}\n\n"
            "Use it along with your email or phone to log in to the form.\n"
            "{cta}\n\n"
            "If you did not request this, you can ignore this message.\n\n"
            "Best,\nJenny & Cristian"
        ),
        "email.cta_rsvp": "👉 Confirm here: {url}",
        "email.confirmation_plain": (
            "Hi {name},\n\n"
            "Thank you for confirming your attendance!\n"
            "Invitation: {invite_scope}\n"
            "Attendance: {attending}\n"
            "{companions}\n"
            "{allergies}\n"
            "{notes}\n\n"
            "We will keep you updated with more details as the date approaches.\n\n"
            "Best,\nJenny & Cristian"
        ),
        # --- Emails: invitation code (guest code) ---
        "email.subject.guest_code": "Your invitation code • Jenny & Cristian Wedding",
        "email.guest_code.greet": "Hi",
        "email.guest_code.intro": "Your invitation code is: {guest_code}",
        "email.guest_code.instruction": "Use this code on the login page:",
        "email.guest_code.button_label": "Log in",
        "email.guest_code.login_line": "Login: {url}",
        # --- Emails: RSVP confirmation (summary) ---
        "email.confirmation.greet": "Hi",
        "email.confirmation.thanks": "Thank you for confirming your attendance!",
        "email.confirmation.scope.ceremony_reception": "Ceremony + Reception",
        "email.confirmation.scope.reception_only": "Reception only",
        "email.confirmation.attending.yes": "Attending: Yes",
        "email.confirmation.attending.no": "Attending: No",
        "email.confirmation.attending.unknown": "Attending: —",
        "email.confirmation.label.invitation": "Invitation",
        "email.confirmation.label.event_date": "Event date",
        "email.confirmation.label.guests": "Guests",
        "email.confirmation.label.menu": "Menu",
        "email.confirmation.label.companions": "Companions",
        "email.confirmation.label.allergies": "Allergies",
        "email.confirmation.label.notes": "Notes",
        "email.confirmation.footer.more_details": "We’ll keep you updated with more details as the date approaches.",
    },
}


def normalize_lang(lang: str | None) -> str:
    code = (lang or "").lower().strip()
    return code if code in VALID_LANGS else DEFAULT_LANG


def t(key: str, lang: str | None = None) -> str:
    code = normalize_lang(lang or DEFAULT_LANG)
    bundle = TRANSLATIONS.get(code, TRANSLATIONS[DEFAULT_LANG])
    return bundle.get(key, key)

/**
 * Archivo: assets/js/pages/rsvp-form.js
 * Página: Confirmación de asistencia (RSVP)
 * Descripción general:
 *    Este módulo gestiona la carga inicial de datos del invitado autenticado,
 *    la lectura del formulario RSVP, la validación de campos, la
 *    normalización del payload y el envío de la información al backend
 *    mediante los endpoints protegidos /api/guest/me y /api/guest/me/rsvp.
 *
 * Notas para tutores y revisores:
 *    - Este archivo implementa la lógica de interfaz equivalente al
 *      formulario original en Streamlit (1_Formulario_RSVP.py), adaptada
 *      a un frontend HTML/JavaScript.
 *    - La lógica de negocio y persistencia sigue residiendo en la API
 *      desarrollada con FastAPI (backend en Python).
 *    - Los comentarios están organizados por bloques para facilitar su
 *      lectura en el contexto académico del proyecto.
 */


/* ============================================================================
   Bloque 1: Variables globales y referencias de la interfaz
   Descripción:
     - Se obtienen referencias a elementos claves de la interfaz.
     - Se lee el token de sesión almacenado al iniciar sesión.
     - Se declaran variables auxiliares para el control de acompañantes y
       metaopciones (por ejemplo, alérgenos sugeridos).
 ============================================================================ */

const form = document.getElementById("rsvp-form");
const feedbackBox = document.getElementById("form-feedback");

// Campos principales de contacto y notas del invitado titular
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const allergiesInput = document.getElementById("allergies");
const notesInput = document.getElementById("notes");

// Contenedor y botón para la gestión dinámica de acompañantes
const companionsContainer = document.getElementById("companions-container");
const addCompanionBtn = document.getElementById("add-companion-btn");

// Elementos de cabecera para mostrar información personalizada de la invitación
const guestGreetingEl = document.getElementById("guest-greeting");
const invitationSummaryEl = document.getElementById("invitation-summary");
const eventTimesEl = document.getElementById("event-times");
const companionsLimitTextEl = document.getElementById("companions-limit-text");

// Token de sesión generado al autenticarse con el código de invitado
const token = sessionStorage.getItem("rsvp_token");

// Variables auxiliares para controlar límites y metadatos
let maxAccomp = null;        // Límite de acompañantes permitido por invitación
let metaOptions = null;      // Metadatos generales de la aplicación (alérgenos, etc.)



/* ============================================================================
   Bloque 2: Redirección si no hay sesión activa
   Descripción:
     - Antes de cargar la página, se verifica que exista un token válido.
     - Si el token no existe, el usuario es redirigido a la página de login.
 ============================================================================ */

if (!token) {
  window.location.href = "/app/login.html";
}



/* ============================================================================
   Bloque 3: Carga inicial de datos del invitado autenticado
   Descripción:
     - Recupera la información del invitado mediante GET /api/guest/me.
     - Rellena los campos de contacto en el formulario.
     - Actualiza la cabecera con el nombre del invitado, resumen de la
       invitación y límite de acompañantes cuando la API lo proporciona.
 ============================================================================ */

async function cargarDatosInvitado() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/guest/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Si la sesión no es válida, se limpia el token y se vuelve al login
      if (response.status === 401) {
        sessionStorage.removeItem("rsvp_token");
        window.location.href = "/app/login.html";
        return;
      }
      throw new Error("No se pudo obtener la información del invitado.");
    }

    const data = await response.json();

    // Rellenado de campos visibles de contacto, si existen en la respuesta
    if (data.email && emailInput) {
      emailInput.value = data.email;
    }
    if (data.phone && phoneInput) {
      phoneInput.value = data.phone;
    }

    // Personalización de la cabecera: saludo con el nombre del invitado
    if (guestGreetingEl) {
      const fullName = (data.full_name && String(data.full_name).trim()) || "";
      if (fullName) {
        guestGreetingEl.textContent = `Hola, ${fullName}. En esta página podrás confirmar tu asistencia.`;
      }
    }

    // Resumen de la invitación (ceremonia/recepción) si la API expone estos datos
    if (invitationSummaryEl) {
      const invitedToCeremony = data.invited_to_ceremony;
      const invitedToReception = data.invited_to_reception;
      let summaryText = "";

      if (invitedToCeremony && invitedToReception) {
        summaryText = "Tu invitación incluye ceremonia y recepción.";
      } else if (invitedToCeremony) {
        summaryText = "Tu invitación incluye la ceremonia.";
      } else if (invitedToReception) {
        summaryText = "Tu invitación incluye la recepción.";
      }

      if (summaryText) {
        invitationSummaryEl.textContent = summaryText;
      }
    }

    // Horarios de los eventos, si el backend los expone para la vista de invitado
    if (eventTimesEl) {
      const ceremonyTime = data.ceremony_time;
      const receptionTime = data.reception_time;
      let timesText = "";

      if (ceremonyTime && receptionTime) {
        timesText = `Ceremonia: ${ceremonyTime} · Recepción: ${receptionTime}`;
      } else if (ceremonyTime) {
        timesText = `Ceremonia: ${ceremonyTime}`;
      } else if (receptionTime) {
        timesText = `Recepción: ${receptionTime}`;
      }

      if (timesText) {
        eventTimesEl.textContent = timesText;
      }
    }

    // Límite de acompañantes (max_accomp) cuando está disponible en la respuesta
    if (Object.prototype.hasOwnProperty.call(data, "max_accomp")) {
      const rawMax = data.max_accomp;
      const parsed =
        typeof rawMax === "number"
          ? rawMax
          : rawMax !== null && rawMax !== undefined && rawMax !== ""
            ? parseInt(rawMax, 10)
            : null;

      if (!Number.isNaN(parsed) && parsed !== null) {
        maxAccomp = parsed;
      }
    }

    // Actualización del texto de límite de acompañantes y estado del botón
    if (companionsLimitTextEl && maxAccomp !== null) {
      if (maxAccomp > 0) {
        const plural = maxAccomp > 1 ? "s" : "";
        companionsLimitTextEl.textContent =
          `Puedes añadir hasta ${maxAccomp} acompañante${plural} para esta invitación.`;
      } else {
        companionsLimitTextEl.textContent =
          "Esta invitación no incluye acompañantes.";
      }
    }

    if (addCompanionBtn && maxAccomp === 0) {
      addCompanionBtn.disabled = true;
      addCompanionBtn.classList.add("btn--disabled");
    }
  } catch (error) {
    if (feedbackBox) {
      feedbackBox.textContent = "Hubo un problema al cargar tus datos.";
      feedbackBox.classList.add("form-feedback--error");
    }
  }
}



/* ============================================================================
   Bloque 4: Carga de metadatos opcionales (meta/options)
   Descripción:
     - Recupera información adicional de configuración desde /api/meta/options.
     - En esta versión, los metadatos se almacenan en memoria para poder
       utilizarlos en futuras mejoras (por ejemplo, listas sugeridas de
       alérgenos), sin afectar al flujo básico de RSVP.
 ============================================================================ */

async function cargarMetaOpciones() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/meta/options", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    metaOptions = await response.json();
    // En esta iteración no se conectan directamente con la UI, pero quedan
    // disponibles para futuras mejoras (multi-select de alérgenos, etc.).
  } catch (error) {
    // La carga de meta no es crítica para el flujo básico del formulario,
    // por lo que no se muestra error al usuario final.
  }
}



/* ============================================================================
   Bloque 5: Manejo de acompañantes (estructura base)
   Descripción:
     - Crea una fila básica para un acompañante.
     - Respeta el límite máximo de acompañantes (max_accomp) cuando se ha
       obtenido desde el backend.
     - Esta estructura permite extenderse en el futuro (nombre, edad, alergias).
 ============================================================================ */

function crearFilaAcompanante() {
  // Si existe un límite y ya se alcanzó, se bloquea la creación de más filas
  if (typeof maxAccomp === "number" && maxAccomp > 0 && companionsContainer) {
    const currentCount = companionsContainer.querySelectorAll(".companion-row").length;
    if (currentCount >= maxAccomp) {
      if (feedbackBox) {
        feedbackBox.textContent = `Ya has añadido el número máximo de acompañantes (${maxAccomp}).`;
        feedbackBox.classList.add("form-feedback--error");
      }
      return;
    }
  }

  const fila = document.createElement("div");
  fila.className = "companion-row";

  fila.innerHTML = `
    <div class="form-field">
      <label class="form-field__label">Nombre del acompañante</label>
      <input type="text" class="form-field__input companion-name" placeholder="Nombre completo" />
    </div>

    <div class="form-field">
      <label class="form-field__label">Alergias o notas</label>
      <input type="text" class="form-field__input companion-allergies" placeholder="Opcional" />
    </div>
  `;

  companionsContainer.appendChild(fila);
}



/* ============================================================================
   Bloque 6: Preparación del payload para enviar al backend
   Descripción:
     - Lee todos los campos del formulario.
     - Convierte valores en booleanos u opciones válidas.
     - Normaliza cadenas vacías en null.
     - Recorre la lista de acompañantes y arma una estructura limpia.
     - Cuando el invitado indica que no asistirá, se envía una estructura
       coherente (sin acompañantes).
 ============================================================================ */

function construirPayload() {
  const attendingValue = form.elements["attending"].value;
  const attending = attendingValue === "yes";

  // Acompañantes: solo se incluyen si el invitado asistirá
  const companions = [];
  if (attending && companionsContainer) {
    const companionRows = companionsContainer.querySelectorAll(".companion-row");

    companionRows.forEach((row) => {
      const nombreInput = row.querySelector(".companion-name");
      const alergiasInput = row.querySelector(".companion-allergies");

      const nombre = nombreInput ? nombreInput.value.trim() : "";
      const alergias = alergiasInput ? alergiasInput.value.trim() : "";

      if (nombre !== "") {
        companions.push({
          name: nombre,
          allergies: alergias !== "" ? alergias : null,
        });
      }
    });
  }

  // Valores generales normalizados del titular
  const email = emailInput ? emailInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const allergies = allergiesInput ? allergiesInput.value.trim() : "";
  const notes = notesInput ? notesInput.value.trim() : "";

  // Si el invitado indica que no asistirá, se ignoran acompañantes
  if (!attending) {
    return {
      attending: false,
      companions: [],
      allergies: allergies !== "" ? allergies : null,
      notes: notes !== "" ? notes : null,
      email: email !== "" ? email : null,
      phone: phone !== "" ? phone : null,
    };
  }

  // Payload estándar para quienes sí asistirán
  return {
    attending: true,
    companions: companions,
    allergies: allergies !== "" ? allergies : null,
    notes: notes !== "" ? notes : null,
    email: email !== "" ? email : null,
    phone: phone !== "" ? phone : null,
  };
}



/* ============================================================================
   Bloque 7: Envío del formulario RSVP al backend
   Descripción:
     - Ejecuta una petición POST /api/guest/me/rsvp.
     - Valida las reglas básicas del formulario antes de enviar:
         · Selección de asistencia (sí/no).
         · Al menos un dato de contacto (correo o teléfono).
         · Coherencia mínima en los datos de acompañantes.
     - Envía el payload construido anteriormente.
     - Maneja respuestas de éxito o error y muestra mensajes al usuario.
 ============================================================================ */

async function enviarFormulario(event) {
  event.preventDefault();

  if (!form) {
    return;
  }

  if (feedbackBox) {
    feedbackBox.textContent = "";
    feedbackBox.classList.remove("form-feedback--error");
  }

  // Validación: selección obligatoria de asistencia
  const attendingValue = form.elements["attending"].value;
  if (!attendingValue) {
    if (feedbackBox) {
      feedbackBox.textContent = "Por favor, indica si podrás asistir o no a la boda.";
      feedbackBox.classList.add("form-feedback--error");
    }
    return;
  }

  // Validación: contacto (al menos uno de los dos datos)
  const email = emailInput ? emailInput.value.trim() : "";
  const phoneRaw = phoneInput ? phoneInput.value.trim() : "";
  const phoneNormalized = phoneRaw.replace(/\s+/g, "").replace(/-/g, "");

  if (!email && !phoneNormalized) {
    if (feedbackBox) {
      feedbackBox.textContent = "Debes indicar al menos un dato de contacto (correo electrónico o teléfono).";
      feedbackBox.classList.add("form-feedback--error");
    }
    return;
  }

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    if (feedbackBox) {
      feedbackBox.textContent = "El correo electrónico no tiene un formato válido.";
      feedbackBox.classList.add("form-feedback--error");
    }
    return;
  }

  if (phoneNormalized && phoneNormalized.length < 7) {
    if (feedbackBox) {
      feedbackBox.textContent = "El teléfono de contacto parece demasiado corto.";
      feedbackBox.classList.add("form-feedback--error");
    }
    return;
  }

  // Validación básica de coherencia en acompañantes:
  // si se indica alergia/notas en un acompañante pero no nombre, se avisa.
  if (companionsContainer) {
    const companionRows = companionsContainer.querySelectorAll(".companion-row");
    let invalidCompanion = false;

    companionRows.forEach((row) => {
      const nombreInput = row.querySelector(".companion-name");
      const alergiasInput = row.querySelector(".companion-allergies");

      const nombre = nombreInput ? nombreInput.value.trim() : "";
      const alergias = alergiasInput ? alergiasInput.value.trim() : "";

      if (!nombre && alergias) {
        invalidCompanion = true;
      }
    });

    if (invalidCompanion) {
      if (feedbackBox) {
        feedbackBox.textContent = "Si indicas datos de alergias o notas para un acompañante, también debes indicar su nombre.";
        feedbackBox.classList.add("form-feedback--error");
      }
      return;
    }
  }

  // Construcción del payload final tras pasar las validaciones de interfaz
  const payload = construirPayload();

  try {
    const response = await fetch("http://127.0.0.1:8000/api/guest/me/rsvp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      window.location.href = "/app/ok.html";
      return;
    }

    // Manejo de códigos de error más habituales en la lógica del backend
    if (response.status === 401) {
      // Sesión caducada o token inválido
      sessionStorage.removeItem("rsvp_token");
      window.location.href = "/app/login.html";
      return;
    }

    let message = "No se pudo registrar tu asistencia. Inténtalo más tarde.";

    if (response.status === 409) {
      // Conflictos típicos: datos de contacto ya usados en otra invitación, etc.
      message = "Parece que ya existe una confirmación con estos datos de contacto. Si crees que es un error, contacta con los novios.";
    }

    try {
      const errorBody = await response.json();
      if (errorBody && typeof errorBody.detail === "string") {
        message = errorBody.detail;
      }
    } catch (_) {
      // Si la respuesta no es JSON, se mantiene el mensaje por defecto.
    }

    if (feedbackBox) {
      feedbackBox.textContent = message;
      feedbackBox.classList.add("form-feedback--error");
    }
  } catch (error) {
    if (feedbackBox) {
      feedbackBox.textContent = "Hubo un error al procesar tu solicitud.";
      feedbackBox.classList.add("form-feedback--error");
    }
  }
}



/* ============================================================================
   Bloque 8: Eventos principales de la página
   Descripción:
     - Carga inicial de datos del invitado y metadatos.
     - Añadir acompañantes dinámicamente.
     - Enviar formulario RSVP.
 ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  cargarDatosInvitado();
  cargarMetaOpciones();

  if (addCompanionBtn) {
    addCompanionBtn.addEventListener("click", crearFilaAcompanante);
  }

  if (form) {
    form.addEventListener("submit", enviarFormulario);
  }
});

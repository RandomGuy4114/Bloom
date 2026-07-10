// Definitions

const languageStorageKey = "bloom-language";
const supportedLanguages = new Set(["en", "es"]);
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const translatableAttributes = ["aria-label", "title", "alt", "label"];
const keyedTranslations = {
  en: {
    "postType.post": "Post",
    "postType.activity": "Activity",
    "postType.event": "Event",
  },
  es: {
    "postType.post": "Publicación",
    "postType.activity": "Actividad",
    "postType.event": "Evento",
  },
};

const spanish = {
  "Bloom - Activity": "Bloom - Actividad",
  "Bloom - Communities": "Bloom - Comunidades",
  "Bloom - Community": "Bloom - Comunidad",
  "Bloom - Dashboard": "Bloom - Panel",
  "Bloom - Email Confirmed": "Bloom - Correo confirmado",
  "Bloom - Login": "Bloom - Iniciar sesión",
  "Bloom - Post": "Bloom - Publicación",
  "Bloom - Profile": "Bloom - Perfil",
  "Bloom - Register": "Bloom - Registro",
  "Bloom - Settings": "Bloom - Configuración",
  "Home": "Inicio",
  "Profile": "Perfil",
  "Activity": "Actividad",
  "Communities": "Comunidades",
  "Community": "Comunidad",
  "Settings": "Configuración",
  "Recent Activity": "Actividad reciente",
  "Here you can view your recent activity and nearby activity.": "Aquí puedes ver tu actividad reciente y la actividad cercana.",
  "All": "Todo",
  "My Activity": "Mi actividad",
  "Nearby": "Cerca",
  "Events": "Eventos",
  "Here you can view upcoming events in your area.": "Aquí puedes ver los próximos eventos de tu zona.",
  "My Events": "Mis eventos",
  "Search": "Buscar",
  "Search activity": "Buscar actividad",
  "Search events": "Buscar eventos",
  "Search my communities": "Buscar en mis comunidades",
  "Search communities": "Buscar comunidades",
  "Search posts": "Buscar publicaciones",
  "Mobile navigation": "Navegación móvil",
  "Select Language": "Seleccionar idioma",
  "Language": "Idioma",
  "Bloom Image": "Imagen de Bloom",
  "Community Hub": "Centro comunitario",
  "My Communities": "Mis comunidades",
  "Create Community": "Crear comunidad",
  "Join Community": "Unirse a la comunidad",
  "Joined": "Unido",
  "Outside Community Area": "Fuera del área de la comunidad",
  "View Community": "Ver comunidad",
  "Upcoming Events": "Próximos eventos",
  "Post": "Publicar",
  "Post title": "Título de la publicación",
  "Post content": "Contenido de la publicación",
  "Post type": "Tipo de publicación",
  "Join a community to post": "Únete a una comunidad para publicar",
  "Only administrators can post in global communities": "Solo los administradores pueden publicar en comunidades globales",
  "Only administrators can create posts in global communities.": "Solo los administradores pueden crear publicaciones en comunidades globales.",
  "Unable to verify posting access. Please try again.": "No se pudo verificar el permiso para publicar. Inténtalo de nuevo.",
  "Manage Post": "Administrar publicación",
  "Manage": "Administrar",
  "Report": "Reportar",
  "Post options": "Opciones de la publicación",
  "Are you sure you want to report this post?": "¿Seguro que quieres reportar esta publicación?",
  "You must be logged in to report a post.": "Debes iniciar sesión para reportar una publicación.",
  "You cannot report your own post.": "No puedes reportar tu propia publicación.",
  "You have already reported this post.": "Ya reportaste esta publicación.",
  "Unable to report this post. Please try again.": "No se pudo reportar esta publicación. Inténtalo de nuevo.",
  "Post reported successfully.": "Publicación reportada correctamente.",
  "Reporting post...": "Reportando publicación...",
  "You cannot manage this post.": "No puedes administrar esta publicación.",
  "Delete Post": "Eliminar publicación",
  "Edit Post": "Editar publicación",
  "My Posts": "Mis publicaciones",
  "Roadmap": "Hoja de ruta",
  "Messages": "Mensajes",
  "Coming soon.": "Próximamente.",
  "Media posts": "Publicaciones multimedia",
  "Add image upload support for richer updates.": "Añadir carga de imágenes para publicaciones más completas.",
  "Notifications": "Notificaciones",
  "Show likes, replies, and community activity in one feed.": "Mostrar reacciones, respuestas y actividad comunitaria en un solo feed.",
  "Account Settings": "Configuración de la cuenta",
  "Change Password": "Cambiar contraseña",
  "Delete Account": "Eliminar cuenta",
  "English": "Inglés",
  "Spanish": "Español",
  "Change Language": "Cambiar idioma",
  "Email Confirmed": "Correo confirmado",
  "Your email has been confirmed.": "Tu correo electrónico ha sido confirmado.",
  "Continue To Login": "Continuar al inicio de sesión",
  "Help your community grow.": "Ayuda a crecer a tu comunidad.",
  "Get Started": "Comenzar",
  "An Open Source Project By FormalBlaze": "Un proyecto de código abierto de FormalBlaze",
  "Welcome Back To Bloom!": "¡Bienvenido de nuevo a Bloom!",
  "Please enter your credentials to access your account.": "Introduce tus credenciales para acceder a tu cuenta.",
  "Don't have an account?": "¿No tienes una cuenta?",
  "Sign up": "Regístrate",
  "Log In": "Iniciar sesión",
  "Welcome To Bloom!": "¡Bienvenido a Bloom!",
  "Please enter your details to create an account.": "Introduce tus datos para crear una cuenta.",
  "Already have an account?": "¿Ya tienes una cuenta?",
  "Log in": "Inicia sesión",
  "Sign Up": "Registrarse",
  "Username": "Nombre de usuario",
  "Password": "Contraseña",
  "Email": "Correo electrónico",
  "Loading...": "Cargando...",
  "Loading your feed...": "Cargando tu feed...",
  "Loading communities...": "Cargando comunidades...",
  "Loading community...": "Cargando comunidad...",
  "Loading profile...": "Cargando perfil...",
  "Loading post...": "Cargando publicación...",
  "Loading settings...": "Cargando configuración...",
  "Loading activity...": "Cargando actividad...",
  "Publishing your post...": "Publicando...",
  "Joining community...": "Uniéndote a la comunidad...",
  "Creating community...": "Creando comunidad...",
  "Deleting post...": "Eliminando publicación...",
  "Signing in...": "Iniciando sesión...",
  "Creating your account...": "Creando tu cuenta...",
  "Updating language...": "Actualizando idioma...",
  "Please fill in all fields.": "Completa todos los campos.",
  "Error signing in. Please check your credentials and try again.": "No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.",
  "Unable to check that username. Please try again.": "No se pudo comprobar ese nombre de usuario. Inténtalo de nuevo.",
  "Username already exists. Please choose a different username.": "Ese nombre de usuario ya existe. Elige otro.",
  "Error signing up. Please try again.": "No se pudo completar el registro. Inténtalo de nuevo.",
  "Error creating profile. Please try again.": "No se pudo crear el perfil. Inténtalo de nuevo.",
  "No posts yet. Join a community or write the first update.": "Aún no hay publicaciones. Únete a una comunidad o escribe la primera.",
  "Unable to load your feed right now.": "No se puede cargar tu feed en este momento.",
  "Join a community to see posts here.": "Únete a una comunidad para ver publicaciones aquí.",
  "Please add a post title before posting.": "Añade un título antes de publicar.",
  "Please write something before posting.": "Escribe algo antes de publicar.",
  "Join a community before posting.": "Únete a una comunidad antes de publicar.",
  "Please choose a community to post to.": "Elige una comunidad donde publicar.",
  "Error creating post. Please try again.": "No se pudo crear la publicación. Inténtalo de nuevo.",
  "Welcome to Bloom!": "¡Bienvenido a Bloom!",
  "Welcome to Bloom! Here's a quick guide to get you started:": "¡Bienvenido a Bloom! Esta guía rápida te ayudará a comenzar:",
  "Join communities that interest you.": "Únete a comunidades que te interesen.",
  "Create posts and share your thoughts.": "Crea publicaciones y comparte tus ideas.",
  "Engage with other members by commenting and liking posts.": "Participa con otros miembros comentando y reaccionando a publicaciones.",
  "Enjoy your time here!": "¡Disfruta de Bloom!",
  "No community selected.": "No se seleccionó ninguna comunidad.",
  "Unable to load community details.": "No se pudieron cargar los detalles de la comunidad.",
  "Community Name": "Nombre de la comunidad",
  "No description available.": "No hay descripción disponible.",
  "Unable to load posts for this community.": "No se pudieron cargar las publicaciones de esta comunidad.",
  "No posts yet in this community.": "Aún no hay publicaciones en esta comunidad.",
  "No posts match your search.": "Ninguna publicación coincide con tu búsqueda.",
  "Unable to join the community at this time.": "No puedes unirte a la comunidad en este momento.",
  "You must be within this community's radius to join it.": "Debes estar dentro del radio de esta comunidad para unirte.",
  "Successfully joined the community!": "¡Te uniste a la comunidad correctamente!",
  "No communities are available in your area.": "No hay comunidades disponibles en tu zona.",
  "No communities match your search.": "Ninguna comunidad coincide con tu búsqueda.",
  "Location access is required to view local communities.": "Se necesita acceso a tu ubicación para ver comunidades locales.",
  "None of your communities match your search.": "Ninguna de tus comunidades coincide con tu búsqueda.",
  "You have not joined any communities yet.": "Aún no te has unido a ninguna comunidad.",
  "Location access is required to create a community.": "Se necesita acceso a tu ubicación para crear una comunidad.",
  "Please fill in both the community name and description.": "Completa el nombre y la descripción de la comunidad.",
  "Failed to create community. Please try again.": "No se pudo crear la comunidad. Inténtalo de nuevo.",
  "Community created successfully!": "¡Comunidad creada correctamente!",
  "Community Name:": "Nombre de la comunidad:",
  "Community Description:": "Descripción de la comunidad:",
  "Community Radius:": "Radio de la comunidad:",
  "100 meters": "100 metros",
  "500 meters": "500 metros",
  "2 kilometers": "2 kilómetros",
  "20 kilometers": "20 kilómetros",
  "Note: The community made will only be accessible to people near your selected radius": "Nota: la comunidad creada solo será accesible para personas dentro del radio seleccionado",
  "No post selected.": "No se seleccionó ninguna publicación.",
  "Unable to load post details.": "No se pudieron cargar los detalles de la publicación.",
  "Untitled Post": "Publicación sin título",
  "No content available.": "No hay contenido disponible.",
  "Post ID not found.": "No se encontró el identificador de la publicación.",
  "Are you sure you want to delete this post?": "¿Seguro que quieres eliminar esta publicación?",
  "Failed to delete the post. Please try again.": "No se pudo eliminar la publicación. Inténtalo de nuevo.",
  "Post deleted successfully.": "Publicación eliminada correctamente.",
  "Bio:": "Biografía:",
  "Unable to load bio.": "No se pudo cargar la biografía.",
  "No bio yet.": "Aún no hay biografía.",
  "Unable to load posts right now.": "No se pueden cargar las publicaciones en este momento.",
  "No posts yet.": "Aún no hay publicaciones.",
  "Unknown": "Desconocido",
  "Unknown User": "Usuario desconocido",
  "Unknown Community": "Comunidad desconocida",
  "Logged in user": "Usuario conectado",
  "You": "Tú",
  "in": "en",
  "Current password": "Contraseña actual",
  "New password": "Nueva contraseña",
  "Confirm new password": "Confirmar nueva contraseña",
  "Cancel": "Cancelar",
  "Update password": "Actualizar contraseña",
  "Enter and confirm a new password.": "Introduce y confirma una contraseña nueva.",
  "Passwords do not match.": "Las contraseñas no coinciden.",
  "Password change flow is ready for backend wiring.": "El cambio de contraseña aún no está conectado al servidor.",
  "This will permanently delete your account and remove your profile data.": "Esto eliminará permanentemente tu cuenta y los datos de tu perfil.",
  "Type DELETE to continue": "Escribe DELETE para continuar",
  "Delete account": "Eliminar cuenta",
  "Type DELETE exactly to confirm.": "Escribe DELETE exactamente para confirmar.",
  "Delete account flow is ready for backend wiring.": "La eliminación de cuenta aún no está conectada al servidor.",
  "Failed to update language. Please try again.": "No se pudo actualizar el idioma. Inténtalo de nuevo.",
  "No user is currently logged in.": "No hay ningún usuario conectado.",
  "Close dialog": "Cerrar diálogo",
  "No activity items match your search.": "Ninguna actividad coincide con tu búsqueda.",
  "No activity items are available.": "No hay actividad disponible.",
  "No activities match your search.": "Ninguna actividad coincide con tu búsqueda.",
  "You have not created any activities.": "No has creado ninguna actividad.",
  "You have not created any events.": "No has creado ningún evento.",
  "Location access is required to show nearby posts.": "Se necesita acceso a tu ubicación para mostrar publicaciones cercanas.",
  "No nearby activities are available.": "No hay actividades cercanas disponibles.",
  "No nearby events are available.": "No hay eventos cercanos disponibles.",
  "No activities are available.": "No hay actividades disponibles.",
  "Unable to load activities right now.": "No se pueden cargar las actividades en este momento.",
  "Unable to load events right now.": "No se pueden cargar los eventos en este momento.",
  "Loading activities and events...": "Cargando actividades y eventos...",
  "No events match your search.": "Ningún evento coincide con tu búsqueda.",
  "No events are available.": "No hay eventos disponibles."
};

let currentLanguage = supportedLanguages.has(localStorage.getItem(languageStorageKey))
  ? localStorage.getItem(languageStorageKey)
  : "en";
let originalTitle = document.title;

// Formatting

function translatePatterns(value, language) {
  if (language !== "es") {
    return value;
  }

  const patterns = [
    [/^Members: (\d+)$/, "Miembros: $1"],
    [/^Posted on: (.+)$/, "Publicado el: $1"],
    [/^Posted on (.+)$/, "Publicado el $1"],
    [/^in (.+)$/, "en $1"],
    [/^Language updated to en\.$/, "Idioma actualizado a Inglés."],
    [/^Language updated to es\.$/, "Idioma actualizado a Español."],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(value)) {
      return value.replace(pattern, replacement);
    }
  }

  return value;
}

export function t(value, variables = {}) {
  const source = String(value).replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
  const exact = currentLanguage === "es" ? spanish[source] : source;
  return exact ?? translatePatterns(source, currentLanguage);
}

// Translation

function translateTextNode(node) {
  if (node.parentElement?.closest("[data-i18n-ignore]")) {
    return;
  }

  if (!originalText.has(node)) {
    originalText.set(node, node.nodeValue);
  }

  const source = originalText.get(node);
  const trimmed = source.trim();
  if (!trimmed) {
    return;
  }

  const translated = currentLanguage === "es"
    ? spanish[trimmed] ?? translatePatterns(trimmed, currentLanguage)
    : trimmed;
  const nextValue = source.replace(trimmed, translated);
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateElementAttributes(element) {
  if (element.dataset.i18nKey) {
    const translated = keyedTranslations[currentLanguage]?.[element.dataset.i18nKey];
    if (translated && element.textContent !== translated) {
      element.textContent = translated;
    }
  }

  if (element.closest("[data-i18n-ignore]")) {
    return;
  }

  if (!originalAttributes.has(element)) {
    originalAttributes.set(element, new Map());
  }

  const attributes = originalAttributes.get(element);
  for (const name of translatableAttributes) {
    if (!element.hasAttribute(name)) {
      continue;
    }
    if (!attributes.has(name)) {
      attributes.set(name, element.getAttribute(name));
    }

    const source = attributes.get(name);
    element.setAttribute(name, currentLanguage === "es" ? spanish[source] ?? source : source);
  }
}

function translateTree(root = document.body) {
  if (!root) {
    return;
  }

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(root);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node);
    } else {
      translateElementAttributes(node);
    }
    node = walker.nextNode();
  }
}

export function applyLanguage(language = currentLanguage) {
  currentLanguage = supportedLanguages.has(language) ? language : "en";
  document.documentElement.lang = currentLanguage;
  document.title = currentLanguage === "es" ? spanish[originalTitle] ?? originalTitle : originalTitle;
  translateTree(document.body);
  window.dispatchEvent(new CustomEvent("bloom:languagechange", { detail: { language: currentLanguage } }));
}

export function setLanguage(language) {
  const selectedLanguage = supportedLanguages.has(language) ? language : "en";
  localStorage.setItem(languageStorageKey, selectedLanguage);
  applyLanguage(selectedLanguage);
}

export function getLanguage() {
  return currentLanguage;
}

// Dialogs

const nativeAlert = window.alert.bind(window);
const nativeConfirm = window.confirm.bind(window);
window.alert = (message) => nativeAlert(t(message));
window.confirm = (message) => nativeConfirm(t(message));

// Initialization

applyLanguage(currentLanguage);
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "characterData") {
      translateTextNode(mutation.target);
    }
    mutation.addedNodes.forEach(translateTree);
  }
}).observe(document.documentElement, { childList: true, characterData: true, subtree: true });

// Definitions

const languageStorageKey = "bloom-language";
const pendingAccountLanguageKey = "bloom-language-pending-account-sync";
const supportedLanguages = new Set(["en", "es"]);
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const translatableAttributes = ["aria-label", "title", "alt", "label", "placeholder"];
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
  "Bloom - Calendar": "Bloom - Calendario",
  "Bloom - Communities": "Bloom - Comunidades",
  "Bloom - Community": "Bloom - Comunidad",
  "Bloom - Sub-Community": "Bloom - Subcomunidad",
  "Bloom - Dashboard": "Bloom - Panel",
  "Bloom - Email Confirmed": "Bloom - Correo confirmado",
  "Bloom - Login": "Bloom - Iniciar sesión",
  "Bloom - Post": "Bloom - Publicación",
  "Bloom - Edit Post": "Bloom - Editar publicación",
  "Bloom - Reset Password": "Bloom - Restablecer contraseña",
  "Bloom - Profile": "Bloom - Perfil",
  "Bloom - Register": "Bloom - Registro",
  "Bloom - Business Register": "Bloom - Registro de empresa",
  "Bloom - Business Home": "Bloom - Inicio empresarial",
  "Bloom - Business Profile": "Bloom - Perfil empresarial",
  "Bloom - Business Settings": "Bloom - Configuración empresarial",
  "Bloom - Business Dashboard": "Bloom - Panel empresarial",
  "Bloom - Settings": "Bloom - Configuración",
  "Bloom - Supporter": "Bloom - Supporter",
  "Bloom - Early Access": "Bloom - Acceso anticipado",
  "Home": "Inicio",
  "Profile": "Perfil",
  "Log Out": "Cerrar sesión",
  "Logout": "Cerrar sesión",
  "Open account menu": "Abrir menú de cuenta",
  "Activity": "Actividad",
  "Calendar": "Calendario",
  "Loading calendar...": "Cargando calendario...",
  "Previous month": "Mes anterior",
  "Next month": "Mes siguiente",
  "No events scheduled for this day.": "No hay eventos programados para este día.",
  "No Location Listed": "No se indicó ninguna ubicación",
  "Map": "Mapa",
  "Bloom - Map": "Bloom - Mapa",
  "Loading map...": "Cargando mapa...",
  "Communities": "Comunidades",
  "Community": "Comunidad",
  "Settings": "Configuración",
  "Preferences": "Preferencias",
  "Manage your account, appearance, language, and preview features.": "Administra tu cuenta, apariencia, idioma y funciones de prueba.",
  "Appearance": "Apariencia",
  "Choose how Bloom looks across your account.": "Elige cómo se ve Bloom en tu cuenta.",
  "Theme": "Tema",
  "Select theme": "Seleccionar tema",
  "Apply Theme": "Aplicar tema",
  "Light": "Claro",
  "Dark": "Oscuro",
  "Forest": "Bosque",
  "Midnight": "Medianoche",
  "Sunset": "Atardecer",
  "Supporter themes are unlocked.": "Los temas de Supporter están desbloqueados.",
  "Forest, Midnight, and Sunset themes are available with Supporter.": "Los temas Bosque, Medianoche y Atardecer están disponibles con Supporter.",
  "Forest, Midnight, Frutiger Aero, and Sunset themes are available with Supporter.": "Los temas Bosque, Medianoche, Frutiger Aero y Atardecer están disponibles con Supporter.",
  "Choose the language used throughout Bloom.": "Elige el idioma que se usa en Bloom.",
  "Early Access": "Acceso anticipado",
  "Open Early Access": "Abrir Acceso anticipado",
  "Preview experimental Bloom features before their public release.": "Prueba funciones experimentales de Bloom antes de su lanzamiento público.",
  "Manage your password and account session.": "Administra tu contraseña y sesión de cuenta.",
  "Bloom Labs": "Bloom Labs",
  "Preview experimental features before they are released to everyone.": "Prueba funciones experimentales antes de su lanzamiento general.",
  "Supporter Early Access": "Acceso anticipado para Supporters",
  "You have access. New experiments will appear here when they are ready to test.": "Tienes acceso. Los nuevos experimentos aparecerán aquí cuando estén listos para probar.",
  "Supporter required": "Se requiere Supporter",
  "Early Access experiments are available to Bloom Supporters.": "Los experimentos de Acceso anticipado están disponibles para Bloom Supporters.",
  "View Bloom Supporter": "Ver Bloom Supporter",
  "Buy Bloom Supporter": "Comprar Bloom Supporter",
  "Supporter": "Supporter",
  "Bloom Supporter": "Bloom Supporter",
  "Supporter Features": "Funciones de Supporter",
  "Supporter Badge": "Insignia de Supporter",
  "Display a Supporter badge on your profile, posts, and community member listings.": "Muestra una insignia de Supporter en tu perfil, publicaciones y listas de miembros de comunidades.",
  "Longer Bios": "Biografías más largas",
  "Use up to 1,500 characters in your profile bio instead of 500.": "Usa hasta 1.500 caracteres en la biografía de tu perfil en lugar de 500.",
  "Animated Profile Pictures": "Fotos de perfil animadas",
  "Use animated GIF profile pictures and upload profile images up to 15 MB.": "Usa fotos de perfil GIF animadas y sube imágenes de perfil de hasta 15 MB.",
  "More Post Images": "Más imágenes por publicación",
  "Add up to five images per post, with a 25 MB limit for each image.": "Añade hasta cinco imágenes por publicación, con un límite de 25 MB por imagen.",
  "Larger Community Areas": "Áreas comunitarias más grandes",
  "Create communities with radiuses up to 40 kilometers.": "Crea comunidades con radios de hasta 40 kilómetros.",
  "Community Banners": "Banners de comunidad",
  "Upload and replace banners for communities you own.": "Sube y reemplaza banners de las comunidades que administras.",
  "Exclusive Themes": "Temas exclusivos",
  "Unlock the Forest, Midnight, and Sunset themes.": "Desbloquea los temas Bosque, Medianoche y Atardecer.",
  "Preview eligible experimental Bloom features before release.": "Prueba funciones experimentales de Bloom disponibles antes de su lanzamiento.",
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
  "Search Bloom": "Buscar en Bloom",
  "Search users, communities, and posts": "Buscar usuarios, comunidades y publicaciones",
  "Search results": "Resultados de búsqueda",
  "Searching...": "Buscando...",
  "Search is temporarily unavailable.": "La búsqueda no está disponible temporalmente.",
  "No results found.": "No se encontraron resultados.",
  "Location access is off, so nearby communities are not included.": "El acceso a la ubicación está desactivado, por lo que no se incluyen comunidades cercanas.",
  "Users": "Usuarios",
  "User": "Usuario",
  "Posts": "Publicaciones",
  "Global": "Global",
  "Open community": "Abrir comunidad",
  "in": "en",
  "Mobile navigation": "Navegación móvil",
  "Select Language": "Seleccionar idioma",
  "Language": "Idioma",
  "Bloom Image": "Imagen de Bloom",
  "Community Hub": "Centro comunitario",
  "Community Members": "Miembros de la comunidad",
  "Sub-Community": "Subcomunidad",
  "Sub-Communities": "Subcomunidades",
  "Members": "Miembros",
  "Create Sub-Community": "Crear subcomunidad",
  "Join Sub-Community": "Unirse a la subcomunidad",
  "Edit Sub-Community": "Editar subcomunidad",
  "Delete this sub-community and all of its posts? This cannot be undone.": "¿Eliminar esta subcomunidad y todas sus publicaciones? Esta acción no se puede deshacer.",
  "Name": "Nombre",
  "Description": "Descripción",
  "Create": "Crear",
  "Creating…": "Creando…",
  "Loading…": "Cargando…",
  "Loading sub-communities…": "Cargando subcomunidades…",
  "Loading sub-community…": "Cargando subcomunidad…",
  "No sub-communities found.": "No se encontraron subcomunidades.",
  "No posts yet in this sub-community.": "Aún no hay publicaciones en esta subcomunidad.",
  "Search sub-community posts": "Buscar publicaciones de la subcomunidad",
  "Join": "Unirse",
  "Joining…": "Uniéndose…",
  "View": "Ver",
  "Edit": "Editar",
  "Delete": "Eliminar",
  "Save": "Guardar",
  "Please log in before joining a sub-community.": "Inicia sesión antes de unirte a una subcomunidad.",
  "Unable to join sub-community": "No se pudo unir a la subcomunidad",
  "Please log in to view sub-communities.": "Inicia sesión para ver las subcomunidades.",
  "The parent community was not specified.": "No se especificó la comunidad principal.",
  "An unknown error occurred": "Ocurrió un error desconocido",
  "Invalid sub-community.": "Subcomunidad no válida.",
  "Unable to join this sub-community.": "No se pudo unir a esta subcomunidad.",
  "Edit Community": "Editar comunidad",
  "Community name": "Nombre de la comunidad",
  "Community bio": "Biografía de la comunidad",
  "Community banner": "Banner de la comunidad",
  "Remove banner": "Eliminar banner",
  "Undo banner removal": "Deshacer eliminación del banner",
  "Delete Community": "Eliminar comunidad",
  "Type {name} to permanently delete this community and all of its posts.": "Escribe {name} para eliminar permanentemente esta comunidad y todas sus publicaciones.",
  "The community name did not match. Nothing was deleted.": "El nombre de la comunidad no coincidió. No se eliminó nada.",
  "Unable to delete the community.": "No se pudo eliminar la comunidad.",
  "Deleting community...": "Eliminando comunidad...",
  "Community banner preview": "Vista previa del banner de la comunidad",
  "Current community banner": "Banner actual de la comunidad",
  "New community banner preview": "Vista previa del nuevo banner de la comunidad",
  "JPEG, PNG, or WebP. Maximum 10 MB. Selecting a new image replaces the current banner.": "JPEG, PNG o WebP. Máximo 10 MB. Seleccionar una imagen nueva reemplaza el banner actual.",
  "Community banners require Bloom Supporter. You can still edit the name and bio.": "Los banners de comunidad requieren Bloom Supporter. Aún puedes editar el nombre y la biografía.",
  "Choose a JPEG, PNG, or WebP banner that is 10 MB or smaller.": "Elige un banner JPEG, PNG o WebP de 10 MB o menos.",
  "Community names must be 1–100 characters and bios must be 1–1000 characters.": "Los nombres de comunidad deben tener entre 1 y 100 caracteres y las biografías entre 1 y 1000.",
  "Unable to update the community.": "No se pudo actualizar la comunidad.",
  "The community details were saved, but the banner could not be uploaded.": "Los datos de la comunidad se guardaron, pero no se pudo subir el banner.",
  "Saving community...": "Guardando comunidad...",
  "No members to display.": "No hay miembros para mostrar.",
  "Open author profile": "Abrir perfil del autor",
  "Open member profile": "Abrir perfil del miembro",
  "My Communities": "Mis comunidades",
  "Nearby Communities": "Comunidades cercanas",
  "Feed": "Inicio",
  "Create Community": "Crear comunidad",
  "Join Community": "Unirse a la comunidad",
  "Community Owner": "Propietario de la comunidad",
  "Private community": "Comunidad privada",
  "Private communities require owner approval before people can join, and their posts are only visible to members.": "Las comunidades privadas requieren la aprobación del propietario para unirse y sus publicaciones solo son visibles para los miembros.",
  "The community details were saved, but its privacy could not be updated.": "Los datos de la comunidad se guardaron, pero no se pudo actualizar su privacidad.",
  "Making this community public will clear its pending join requests. Continue?": "Hacer pública esta comunidad eliminará sus solicitudes de ingreso pendientes. ¿Continuar?",
  "(Private)": "(Privada)",
  "Community owners cannot leave their communities.": "Los propietarios no pueden abandonar sus comunidades.",
  "Request to Join": "Solicitar unirse",
  "Join Requests": "Solicitudes de ingreso",
  "Accept": "Aceptar",
  "Deny": "Rechazar",
  "There are no pending join requests.": "No hay solicitudes de ingreso pendientes.",
  "Unable to load join requests.": "No se pudieron cargar las solicitudes de ingreso.",
  "This request is no longer pending.": "Esta solicitud ya no está pendiente.",
  "Unable to update this join request.": "No se pudo actualizar esta solicitud de ingreso.",
  "Accepting request...": "Aceptando solicitud...",
  "Denying request...": "Rechazando solicitud...",
  "Joined": "Unido",
  "Outside Community Area": "Fuera del área de la comunidad",
  "View Community": "Ver comunidad",
  "Upcoming Events": "Próximos eventos",
  "Create Event": "Crear evento",
  "Choose a community, then click the map where the event will happen.": "Elige una comunidad y luego toca el mapa donde se realizará el evento.",
  "Event community": "Comunidad del evento",
  "Event title": "Título del evento",
  "Event description": "Descripción del evento",
  "Describe the event": "Describe el evento",
  "Event date": "Fecha del evento",
  "Please choose a valid event date.": "Elige una fecha válida para el evento.",
  "The event date cannot be in the past.": "La fecha del evento no puede estar en el pasado.",
  "Event date:": "Fecha del evento:",
  "Select a location": "Selecciona una ubicación",
  "Tap or click anywhere on the map. You can drag the marker to adjust it.": "Toca o haz clic en cualquier lugar del mapa. Puedes arrastrar el marcador para ajustarlo.",
  "No location selected": "No se seleccionó ninguna ubicación",
  "Selected event location": "Ubicación seleccionada del evento",
  "Event location map": "Mapa de ubicación del evento",
  "Event image preview": "Vista previa de la imagen del evento",
  "Create event": "Crear evento",
  "Join a community to create an event": "Únete a una comunidad para crear un evento",
  "Unable to load communities": "No se pudieron cargar las comunidades",
  "Please add an event title before publishing.": "Añade un título al evento antes de publicarlo.",
  "Please describe the event before publishing.": "Describe el evento antes de publicarlo.",
  "Please choose a community where you can create events.": "Elige una comunidad donde puedas crear eventos.",
  "Choose a location by clicking the map.": "Elige una ubicación tocando el mapa.",
  "Error creating event. Please try again.": "No se pudo crear el evento. Inténtalo de nuevo.",
  "Event created successfully.": "Evento creado correctamente.",
  "Publishing your event...": "Publicando tu evento...",
  "Post": "Publicar",
  "Post title": "Título de la publicación",
  "Post content": "Contenido de la publicación",
  "Write your post": "Escribe tu publicación",
  "Search activities": "Buscar actividades",
  "Tell your community about yourself": "Cuéntale a tu comunidad sobre ti",
  "Type DELETE": "Escribe DELETE",
  "Community name": "Nombre de la comunidad",
  "Describe your community": "Describe tu comunidad",
  "Add image": "Agregar imagen",
  "Add images": "Agregar imágenes",
  "Supporter: up to 5 images, 25 MB each.": "Supporter: hasta 5 imágenes de 25 MB cada una.",
  "Up to 1 image, 10 MB.": "Hasta 1 imagen de 10 MB.",
  "Post image preview": "Vista previa de la imagen de la publicación",
  "Choose a JPEG, PNG, WebP, or GIF image.": "Elige una imagen JPEG, PNG, WebP o GIF.",
  "Post images must be 10 MB or smaller.": "Las imágenes de publicaciones deben pesar 10 MB o menos.",
  "Unable to upload the image. Please try again.": "No se pudo subir la imagen. Inténtalo de nuevo.",
  "Post type": "Tipo de publicación",
  "Event location": "Ubicación del evento",
  "Location:": "Ubicación:",
  "Latitude, longitude": "Latitud, longitud",
  "Use current location": "Usar ubicación actual",
  "Enter a valid event location using latitude and longitude.": "Introduce una ubicación válida usando latitud y longitud.",
  "Unable to get your current location.": "No se pudo obtener tu ubicación actual.",
  "Getting your location...": "Obteniendo tu ubicación...",
  "Join a community to post": "Únete a una comunidad para publicar",
  "Only administrators can post in global communities": "Solo los administradores pueden publicar en comunidades globales",
  "Only administrators can create posts in global communities.": "Solo los administradores pueden crear publicaciones en comunidades globales.",
  "Unable to verify posting access. Please try again.": "No se pudo verificar el permiso para publicar. Inténtalo de nuevo.",
  "Manage Post": "Administrar publicación",
  "Manage": "Administrar",
  "Report": "Reportar",
  "Post options": "Opciones de la publicación",
  "Like": "Me gusta",
  "Likes": "Me gusta",
  "Reply": "Responder",
  "Replies": "Respuestas",
  "Write a reply": "Escribe una respuesta",
  "No replies yet.": "Aún no hay respuestas.",
  "Post engagement": "Interacciones de la publicación",
  "Unable to update this like. Please try again.": "No se pudo actualizar este Me gusta. Inténtalo de nuevo.",
  "Unable to load replies. Please try again.": "No se pudieron cargar las respuestas. Inténtalo de nuevo.",
  "Unable to add your reply. Please try again.": "No se pudo añadir tu respuesta. Inténtalo de nuevo.",
  "Replies must be between 1 and 2,000 characters.": "Las respuestas deben tener entre 1 y 2.000 caracteres.",
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
  "Cancel": "Cancelar",
  "Enter a title and post content.": "Escribe un título y el contenido de la publicación.",
  "Invalid post.": "Publicación no válida.",
  "Unable to load this post.": "No se pudo cargar esta publicación.",
  "Only the post owner can edit this post.": "Solo el autor puede editar esta publicación.",
  "Unable to update the post. Please try again.": "No se pudo actualizar la publicación. Inténtalo de nuevo.",
  "Saving post...": "Guardando publicación...",
  "Loading post editor...": "Cargando editor de publicación...",
  "My Posts": "Mis publicaciones",
  "Edit Profile": "Editar perfil",
  "Display name": "Nombre para mostrar",
  "Display name must be between 1 and 50 characters.": "El nombre para mostrar debe tener entre 1 y 50 caracteres.",
  "Profile picture": "Foto de perfil",
  "Post author profile picture": "Foto de perfil del autor de la publicación",
  "Profile picture preview": "Vista previa de la foto de perfil",
  "Bio": "Biografía",
  "JPEG, PNG, WebP, or GIF. Maximum 5 MB.": "JPEG, PNG, WebP o GIF. Máximo 5 MB.",
  "JPEG, PNG, or WebP. Maximum 5 MB. Animated GIF avatars require Supporter.": "JPEG, PNG o WebP. Máximo 5 MB. Los avatares GIF animados requieren Supporter.",
  "JPEG, PNG, or WebP. Animated GIF supported. Maximum 15 MB.": "JPEG, PNG o WebP. Se admiten GIF animados. Máximo 15 MB.",
  "Save changes": "Guardar cambios",
  "Choose a JPEG, PNG, WebP, or GIF image.": "Elige una imagen JPEG, PNG, WebP o GIF.",
  "Profile pictures must be 5 MB or smaller.": "Las fotos de perfil deben pesar 5 MB o menos.",
  "Animated GIF profile pictures require Supporter.": "Las fotos de perfil GIF animadas requieren Supporter.",
  "Username must be between 3 and 30 characters.": "El nombre de usuario debe tener entre 3 y 30 caracteres.",
  "Bio must be 500 characters or fewer.": "La biografía debe tener 500 caracteres o menos.",
  "Unable to upload your profile picture. Please try again.": "No se pudo subir tu foto de perfil. Inténtalo de nuevo.",
  "That username is already in use.": "Ese nombre de usuario ya está en uso.",
  "Unable to update your profile. Please try again.": "No se pudo actualizar tu perfil. Inténtalo de nuevo.",
  "Your profile could not be saved. Check that its text follows the community guidelines and try again.": "No se pudo guardar tu perfil. Comprueba que el texto cumpla las normas de la comunidad e inténtalo de nuevo.",
  "That username does not meet the community guidelines. Please choose another one.": "Ese nombre de usuario no cumple las normas de la comunidad. Elige otro.",
  "The post could not be published. Check that its text and images follow the community guidelines, then try again.": "No se pudo publicar. Comprueba que el texto y las imágenes cumplan las normas de la comunidad e inténtalo de nuevo.",
  "The event could not be published. Check that its text and images follow the community guidelines, then try again.": "No se pudo publicar el evento. Comprueba que el texto y las imágenes cumplan las normas de la comunidad e inténtalo de nuevo.",
  "The profile picture could not be uploaded. Check that it follows the community guidelines and try again.": "No se pudo subir la foto de perfil. Comprueba que cumpla las normas de la comunidad e inténtalo de nuevo.",
  "Saving profile...": "Guardando perfil...",
  "Profile updated successfully.": "Perfil actualizado correctamente.",
  "Roadmap": "Hoja de ruta",
  "Messages": "Mensajes",
  "Direct Messages": "Mensajes directos",
  "Contacts": "Contactos",
  "Select a contact to start chatting": "Selecciona un contacto para comenzar a chatear",
  "People you connect with will appear here.": "Las personas con las que te conectes aparecerán aquí.",
  "Your encrypted conversation will appear here.": "Tu conversación cifrada aparecerá aquí.",
  "Unable to load your contacts right now.": "No se pueden cargar tus contactos en este momento.",
  "Type a message...": "Escribe un mensaje...",
  "Type a message": "Escribir un mensaje",
  "Attach an image": "Adjuntar una imagen",
  "Send message": "Enviar mensaje",
  "Send": "Enviar",
  "Coming soon.": "Próximamente.",
  "Media posts": "Publicaciones multimedia",
  "Add image upload support for richer updates.": "Añadir carga de imágenes para publicaciones más completas.",
  "Notifications": "Notificaciones",
  "Show likes, replies, and community activity in one feed.": "Mostrar reacciones, respuestas y actividad comunitaria en un solo feed.",
  "Account Settings": "Configuración de la cuenta",
  "Connect": "Conectar",
  "Optionally use background location to alert you when you cross paths with an opted-in member of one of your communities.": "Usa opcionalmente la ubicación en segundo plano para recibir una alerta cuando te cruces con un miembro de una de tus comunidades que también haya activado la función.",
  "Enable proximity alerts": "Activar alertas de proximidad",
  "Connect is off.": "Conectar está desactivado.",
  "Connect is on. Bloom may use your location in the background.": "Conectar está activo. Bloom puede usar tu ubicación en segundo plano.",
  "Connect is off and your stored location was deleted.": "Conectar está desactivado y tu ubicación guardada fue eliminada.",
  "Connect can alert you when you cross paths with an opted-in member of one of your communities.": "Conectar puede avisarte cuando te cruces con un miembro de una de tus comunidades que también haya activado la función.",
  "Checking Connect...": "Comprobando Conectar...",
  "Manage Connect Settings": "Administrar configuración de Conectar",
  "Connected people": "Personas conectadas",
  "People you encounter through Connect will appear here.": "Las personas que encuentres mediante Conectar aparecerán aquí.",
  "Open Connect": "Abrir Conectar",
  "Connect is active. Background location alerts are enabled.": "Conectar está activo. Las alertas de ubicación en segundo plano están habilitadas.",
  "Connect is off. Enable it in Settings when you want to use proximity alerts.": "Conectar está desactivado. Actívalo en Configuración cuando quieras usar alertas de proximidad.",
  "Someone from Bloom is nearby": "Alguien de Bloom está cerca",
  "You just crossed paths with someone from one of your communities.": "Acabas de cruzarte con alguien de una de tus comunidades.",
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
  "Making local connections easier": "Facilitando las conexiones locales",
  "An Open Source Project By FormalBlaze": "Un proyecto de código abierto de FormalBlaze",
  "An open-source project by FormalBlaze": "Un proyecto de código abierto de FormalBlaze",
  "Why Bloom?": "¿Por qué Bloom?",
  "Bloom is meant to make the process of connecting with your local community easier and more enjoyable.": "Bloom busca hacer que conectar con tu comunidad local sea más fácil y agradable.",
  "Bloom helps you connect with people nearby, making it easy to share events, ideas, suggestions, and more.": "Bloom te ayuda a conectar con personas cercanas para compartir eventos, ideas, sugerencias y mucho más.",
  "Bloom And Open Source": "Bloom y el código abierto",
  "Bloom and Open Source": "Bloom y el código abierto",
  "Bloom is open source, so anyone can contribute. This supports a transparent, community-driven approach to building software.": "Bloom es de código abierto, por lo que cualquiera puede contribuir. Esto promueve una forma transparente y comunitaria de crear software.",
  "Support Bloom": "Apoya a Bloom",
  "If you enjoy using Bloom, consider supporting the project. Your contributions help keep Bloom free and open source for everyone.": "Si disfrutas usando Bloom, considera apoyar el proyecto. Tus contribuciones ayudan a mantener Bloom gratuito y de código abierto para todos.",
  "A beautiful flower": "Una flor hermosa",
  "A map of the local area": "Un mapa de la zona local",
  "The Bloom Homepage": "La página de inicio de Bloom",
  "View on GitHub": "Ver en GitHub",
  "View Bloom on GitHub": "Ver Bloom en GitHub",
  "GitHub": "GitHub",
  "Issues": "Incidencias",
  "Terms": "Términos",
  "Privacy": "Privacidad",
  "Contact Us": "Contáctanos",
  "Credits": "Créditos",
  "People connecting through their local community": "Personas conectándose a través de su comunidad local",
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
  "Birthday": "Fecha de nacimiento",
  "Register a Business Account": "Registrar una cuenta empresarial",
  "Business Username": "Nombre de usuario de la empresa",
  "Business account created! Please check your email to confirm it.": "¡Cuenta empresarial creada! Revisa tu correo para confirmarla.",
  "Creating your business account...": "Creando tu cuenta empresarial...",
  "Business Home": "Inicio empresarial",
  "Bloom for Business": "Bloom para empresas",
  "Welcome to your business account": "Te damos la bienvenida a tu cuenta empresarial",
  "Connect with nearby communities and manage your presence on Bloom.": "Conecta con comunidades cercanas y administra tu presencia en Bloom.",
  "Business Profile": "Perfil empresarial",
  "View and update the public profile people see across Bloom.": "Consulta y actualiza el perfil público que las personas ven en Bloom.",
  "Open Profile": "Abrir perfil",
  "Find local communities where your business can participate.": "Encuentra comunidades locales donde tu empresa pueda participar.",
  "Browse Communities": "Explorar comunidades",
  "See activities and events from communities you have joined.": "Consulta actividades y eventos de las comunidades a las que te has unido.",
  "View Activity": "Ver actividad",
  "Manage your language, theme, password, and account preferences.": "Administra tu idioma, tema, contraseña y preferencias de cuenta.",
  "Open Settings": "Abrir configuración",
  "Loading your business account...": "Cargando tu cuenta empresarial...",
  "Business Settings": "Configuración empresarial",
  "Business Dashboard": "Panel empresarial",
  "Manage preferences for your business account.": "Administra las preferencias de tu cuenta empresarial.",
  "Manage the information customers can use to identify and contact your business.": "Administra la información que los clientes pueden usar para identificar y contactar a tu empresa.",
  "Business Information": "Información de la empresa",
  "Business name": "Nombre de la empresa",
  "Business description": "Descripción de la empresa",
  "Business address or location": "Dirección o ubicación de la empresa",
  "Latitude": "Latitud",
  "Longitude": "Longitud",
  "Use My Current Location": "Usar mi ubicación actual",
  "Contact Information": "Información de contacto",
  "Public contact email": "Correo público de contacto",
  "Public phone number": "Teléfono público",
  "Website": "Sitio web",
  "Save Business Profile": "Guardar perfil empresarial",
  "Edit Business Profile": "Editar perfil empresarial",
  "A summary of your business account and public information.": "Un resumen de tu cuenta empresarial e información pública.",
  "Profile completion": "Perfil completado",
  "Account status": "Estado de la cuenta",
  "Contact methods": "Métodos de contacto",
  "Location status": "Estado de ubicación",
  "Not added": "No agregada",
  "Address added": "Dirección agregada",
  "Complete": "Completa",
  "Complete your business profile": "Completa tu perfil empresarial",
  "Add information to help people understand and contact your business.": "Agrega información para que las personas comprendan y contacten a tu empresa.",
  "Business profile saved.": "Perfil empresarial guardado.",
  "Loading your business profile...": "Cargando tu perfil empresarial...",
  "Saving your business profile...": "Guardando tu perfil empresarial...",
  "Loading business settings...": "Cargando la configuración empresarial...",
  "Loading business dashboard...": "Cargando el panel empresarial...",
  "Business Communities": "Comunidades empresariales",
  "Business": "Empresa",
  "Create a promoted community at a custom location with an active Bloom Business Patreon membership.": "Crea una comunidad promocionada en una ubicación personalizada con una membresía activa de Bloom Business en Patreon.",
  "Your Bloom Business Patreon membership is active.": "Tu membresía de Bloom Business en Patreon está activa.",
  "An active Bloom Business Patreon membership is required.": "Se requiere una membresía activa de Bloom Business en Patreon.",
  "Create Business Community": "Crear comunidad empresarial",
  "Connect Business Patreon": "Conectar Patreon empresarial",
  "Your Business Communities": "Tus comunidades empresariales",
  "You have not created a business community yet.": "Aún no has creado una comunidad empresarial.",
  "Publish a Business Post": "Publicar como empresa",
  "Posts may occasionally be recommended to nearby Bloom users within the community radius.": "Las publicaciones pueden recomendarse ocasionalmente a usuarios cercanos dentro del radio de la comunidad.",
  "Business community": "Comunidad empresarial",
  "Publish Business Post": "Publicar contenido empresarial",
  "Community name": "Nombre de la comunidad",
  "Description": "Descripción",
  "Location name or address": "Nombre o dirección de la ubicación",
  "Promotion radius": "Radio de promoción",
  "Creating business community...": "Creando la comunidad empresarial...",
  "Publishing your business post...": "Publicando tu contenido empresarial...",
  "Business post published.": "Contenido empresarial publicado.",
  "Use at least 8 characters with uppercase, lowercase, and a number.": "Usa al menos 8 caracteres con mayúsculas, minúsculas y un número.",
  "I agree to the": "Acepto los",
  "Terms of Service": "Términos de servicio",
  "Privacy Policy": "Política de privacidad",
  "Forgot password?": "¿Olvidaste tu contraseña?",
  "Enter your email address first.": "Introduce primero tu correo electrónico.",
  "If an account exists for that email, a reset link has been sent.": "Si existe una cuenta con ese correo, se ha enviado un enlace de restablecimiento.",
  "Unable to send a password reset email. Please try again.": "No se pudo enviar el correo de restablecimiento. Inténtalo de nuevo.",
  "Sending reset link...": "Enviando enlace de restablecimiento...",
  "Reset Password": "Restablecer contraseña",
  "Choose a new password for your Bloom account.": "Elige una nueva contraseña para tu cuenta de Bloom.",
  "New password": "Nueva contraseña",
  "Confirm new password": "Confirma la nueva contraseña",
  "Update password": "Actualizar contraseña",
  "Passwords do not match.": "Las contraseñas no coinciden.",
  "This password reset link is invalid or has expired.": "Este enlace de restablecimiento no es válido o ha caducado.",
  "Unable to update your password. Request a new reset link.": "No se pudo actualizar la contraseña. Solicita un nuevo enlace.",
  "Updating password...": "Actualizando contraseña...",
  "Deleting account...": "Eliminando cuenta...",
  "Email": "Correo electrónico",
  "Loading...": "Cargando...",
  "Loading your feed...": "Cargando tu feed...",
  "Loading communities...": "Cargando comunidades...",
  "Loading community...": "Cargando comunidad...",
  "Loading profile...": "Cargando perfil...",
  "Loading post...": "Cargando publicación...",
  "Loading settings...": "Cargando configuración...",
  "Loading early access...": "Cargando acceso anticipado...",
  "Updating theme...": "Actualizando tema...",
  "Unable to update theme. Please try again.": "No se pudo actualizar el tema. Inténtalo de nuevo.",
  "Loading supporter page...": "Cargando la página de Supporter...",
  "Support Bloom on Patreon, then connect your Patreon account to unlock Supporter features.": "Apoya a Bloom en Patreon y conecta tu cuenta para desbloquear las funciones de Supporter.",
  "Connect Patreon": "Conectar Patreon",
  "Connect Patreon to verify your Supporter membership.": "Conecta Patreon para verificar tu membresía de Supporter.",
  "Your Patreon Supporter membership is active.": "Tu membresía de Patreon Supporter está activa.",
  "This Patreon account does not have the required active membership.": "Esta cuenta de Patreon no tiene la membresía activa requerida.",
  "Your Patreon membership is not currently active.": "Tu membresía de Patreon no está activa actualmente.",
  "This Patreon account is already linked to another Bloom account.": "Esta cuenta de Patreon ya está vinculada a otra cuenta de Bloom.",
  "Patreon authorization was canceled.": "Se canceló la autorización de Patreon.",
  "Unable to verify your Patreon membership. Please try again.": "No se pudo verificar tu membresía de Patreon. Inténtalo de nuevo.",
  "Unable to connect Patreon. Please try again.": "No se pudo conectar Patreon. Inténtalo de nuevo.",
  "Connecting to Patreon...": "Conectando con Patreon...",
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
  "Unable to load posts for this community.": "No se pudieron cargar las publicaciones de esta comunidad.",
  "No posts yet in this community.": "Aún no hay publicaciones en esta comunidad.",
  "No posts match your search.": "Ninguna publicación coincide con tu búsqueda.",
  "Unable to join the community at this time.": "No puedes unirte a la comunidad en este momento.",
  "You must be within this community's radius to join it.": "Debes estar dentro del radio de esta comunidad para unirte.",
  "Successfully joined the community!": "¡Te uniste a la comunidad correctamente!",
  "Leave Community": "Salir de la comunidad",
  "Are you sure you want to leave this community?": "¿Seguro que quieres salir de esta comunidad?",
  "Unable to leave the community at this time.": "No puedes salir de la comunidad en este momento.",
  "You left the community.": "Saliste de la comunidad.",
  "Leaving community...": "Saliendo de la comunidad...",
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
  "Community Image:": "Imagen de la comunidad:",
  "Community image": "Imagen de la comunidad",
  "Optional square image. JPEG, PNG, or WebP. Maximum 5 MB.": "Imagen cuadrada opcional. JPEG, PNG o WebP. Máximo 5 MB.",
  "Community image preview": "Vista previa de la imagen de la comunidad",
  "Current community image": "Imagen actual de la comunidad",
  "New community image preview": "Vista previa de la nueva imagen de la comunidad",
  "Remove community image": "Eliminar imagen de la comunidad",
  "Undo image removal": "Deshacer eliminación de la imagen",
  "JPEG, PNG, or WebP. Maximum 5 MB. Leave empty to keep the current image.": "JPEG, PNG o WebP. Máximo 5 MB. Déjalo vacío para conservar la imagen actual.",
  "The community details were saved, but the community image could not be uploaded.": "Los datos de la comunidad se guardaron, pero no se pudo subir su imagen.",
  "The community details were saved, but the community image could not be updated.": "Los datos de la comunidad se guardaron, pero no se pudo actualizar su imagen.",
  "Choose a JPEG, PNG, or WebP community image that is 5 MB or smaller.": "Elige una imagen de comunidad JPEG, PNG o WebP de 5 MB o menos.",
  "The community was created, but its image could not be uploaded.": "La comunidad se creó, pero no se pudo subir su imagen.",
  "Community Radius:": "Radio de la comunidad:",
  "100 meters": "100 metros",
  "500 meters": "500 metros",
  "2 kilometers": "2 kilómetros",
  "25 kilometers": "25 kilómetros",
  "40 kilometers": "40 kilómetros",
  "Supporters can create communities with up to a 40 kilometer radius.": "Los Supporters pueden crear comunidades con un radio de hasta 40 kilómetros.",
  "Standard accounts can create communities with up to a 25 kilometer radius.": "Las cuentas estándar pueden crear comunidades con un radio de hasta 25 kilómetros.",
  "Note: The community made will only be accessible to people near your selected radius": "Nota: la comunidad creada solo será accesible para personas dentro del radio seleccionado",
  "No post selected.": "No se seleccionó ninguna publicación.",
  "Unable to load post details.": "No se pudieron cargar los detalles de la publicación.",
  "Post ID not found.": "No se encontró el identificador de la publicación.",
  "Are you sure you want to delete this post?": "¿Seguro que quieres eliminar esta publicación?",
  "Failed to delete the post. Please try again.": "No se pudo eliminar la publicación. Inténtalo de nuevo.",
  "Post deleted successfully.": "Publicación eliminada correctamente.",
  "Bio:": "Biografía:",
  "Unable to load posts right now.": "No se pueden cargar las publicaciones en este momento.",
  "No posts yet.": "Aún no hay publicaciones.",
  "No posts are visible from your joined communities.": "No hay publicaciones visibles de las comunidades a las que te uniste.",
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
  "No activities are available in your communities.": "No hay actividades disponibles en tus comunidades.",
  "No events are available in your communities.": "No hay eventos disponibles en tus comunidades.",
  "Unable to load activities right now.": "No se pueden cargar las actividades en este momento.",
  "Unable to load events right now.": "No se pueden cargar los eventos en este momento.",
  "Loading activities and events...": "Cargando actividades y eventos...",
  "No events match your search.": "Ningún evento coincide con tu búsqueda.",
  "No events are available.": "No hay eventos disponibles.",
  "Konami Code activated! You found the secret!": "¡Código Konami activado! ¡Encontraste el secreto!"
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
    [/^(.+) \/ month$/, "$1 / mes"],
    [/^(\d+) characters maximum with Supporter\.$/, "$1 caracteres como máximo con Supporter."],
    [/^(\d+) characters maximum\.$/, "$1 caracteres como máximo."],
    [/^Bio must be (\d+) characters or fewer\.$/, "La biografía debe tener $1 caracteres o menos."],
    [/^Profile pictures must be (\d+) MB or smaller\.$/, "Las fotos de perfil deben pesar $1 MB o menos."],
    [/^You can upload up to (\d+) images? per post\.$/, "Puedes subir hasta $1 imágenes por publicación."],
    [/^Each post image must be (\d+) MB or smaller\.$/, "Cada imagen debe pesar $1 MB o menos."],
    [/^([\d.,]+) kilometers$/, "$1 kilómetros"],
    [/^(\d+) meters$/, "$1 metros"],
    [/^in (.+)$/, "en $1"],
    [/^Part of (.+)$/, "Parte de $1"],
    [/^Unable to load sub-communities: (.+)$/, "No se pudieron cargar las subcomunidades: $1"],
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
  const template = String(value);
  const localizedTemplate = currentLanguage === "es" ? (spanish[template] ?? template) : template;
  const source = localizedTemplate.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
  return translatePatterns(source, currentLanguage);
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

export function hasPendingAccountLanguage() {
  return localStorage.getItem(pendingAccountLanguageKey) === "true";
}

export function clearPendingAccountLanguage() {
  localStorage.removeItem(pendingAccountLanguageKey);
}

function initializeLanguageButton() {
  const button = document.getElementById("languageButton");
  if (!button || button.dataset.languageReady === "true") return;
  button.dataset.languageReady = "true";

  const updateButton = () => {
    const switchToSpanish = currentLanguage === "en";
    button.textContent = switchToSpanish ? "Cambiar idioma" : "Change language";
    button.setAttribute("aria-label", switchToSpanish ? "Cambiar idioma a español" : "Change language to English");
    button.setAttribute("title", switchToSpanish ? "Cambiar idioma a español" : "Change language to English");
  };

  button.addEventListener("click", () => {
    localStorage.setItem(pendingAccountLanguageKey, "true");
    setLanguage(currentLanguage === "en" ? "es" : "en");
  });
  window.addEventListener("bloom:languagechange", updateButton);
  updateButton();
}

// Dialogs

const nativeAlert = window.alert.bind(window);
const nativeConfirm = window.confirm.bind(window);
window.alert = (message) => nativeAlert(t(message));
window.confirm = (message) => nativeConfirm(t(message));

// Initialization

applyLanguage(currentLanguage);
initializeLanguageButton();
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "characterData") {
      translateTextNode(mutation.target);
    }
    mutation.addedNodes.forEach((node) => {
      translateTree(node);
      if (node.nodeType === Node.ELEMENT_NODE
        && (node.id === "languageButton" || node.querySelector?.("#languageButton"))) {
        initializeLanguageButton();
      }
    });
  }
}).observe(document.documentElement, { childList: true, characterData: true, subtree: true });

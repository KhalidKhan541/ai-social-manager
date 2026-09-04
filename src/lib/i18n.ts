const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "pt", "ja", "zh"];
const STORAGE_KEY = "locale";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale: Locale;
}

const defaultConfig: I18nConfig = {
  defaultLocale: DEFAULT_LOCALE as Locale,
  supportedLocales: SUPPORTED_LOCALES as Locale[],
  fallbackLocale: DEFAULT_LOCALE as Locale,
};

const translations: Record<Locale, TranslationDict> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      previous: "Previous",
      close: "Close",
      open: "Open",
      yes: "Yes",
      no: "No",
      ok: "OK",
      done: "Done",
      submit: "Submit",
      reset: "Reset",
      clear: "Clear",
      select: "Select",
      all: "All",
      none: "None",
      more: "More",
      less: "Less",
      showMore: "Show more",
      showLess: "Show less",
      viewAll: "View all",
      viewDetails: "View details",
      noResults: "No results found",
      emptyState: "Nothing to see here yet",
    },
    auth: {
      login: "Log in",
      logout: "Log out",
      signup: "Sign up",
      forgotPassword: "Forgot password?",
      resetPassword: "Reset password",
      changePassword: "Change password",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      rememberMe: "Remember me",
      orContinueWith: "Or continue with",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      verifyEmail: "Verify your email",
      verificationSent: "Verification email sent",
    },
    navigation: {
      dashboard: "Dashboard",
      posts: "Posts",
      calendar: "Calendar",
      analytics: "Analytics",
      inbox: "Inbox",
      campaigns: "Campaigns",
      media: "Media",
      settings: "Settings",
      billing: "Billing",
      team: "Team",
      help: "Help",
    },
    post: {
      createPost: "Create post",
      editPost: "Edit post",
      deletePost: "Delete post",
      schedulePost: "Schedule post",
      publishNow: "Publish now",
      scheduledFor: "Scheduled for",
      published: "Published",
      draft: "Draft",
      scheduled: "Scheduled",
      failed: "Failed",
      content: "Content",
      media: "Media",
      hashtags: "Hashtags",
      mentions: "Mentions",
      characterCount: "Character count",
      platforms: "Platforms",
      selectPlatforms: "Select platforms",
      aiGenerate: "Generate with AI",
      regenerate: "Regenerate",
      improveWriting: "Improve writing",
      makeShorter: "Make shorter",
      makeLonger: "Make longer",
      addHashtags: "Add hashtags",
      translate: "Translate",
    },
    analytics: {
      overview: "Overview",
      engagement: "Engagement",
      reach: "Reach",
      impressions: "Impressions",
      followers: "Followers",
      growth: "Growth",
      topPosts: "Top posts",
      bestTimes: "Best times to post",
      contentPerformance: "Content performance",
      audienceInsights: "Audience insights",
      exportReport: "Export report",
      dateRange: "Date range",
      today: "Today",
      thisWeek: "This week",
      thisMonth: "This month",
      lastMonth: "Last month",
      customRange: "Custom range",
    },
    inbox: {
      unifiedInbox: "Unified Inbox",
      unread: "Unread",
      read: "Read",
      replied: "Replied",
      archived: "Archived",
      reply: "Reply",
      forward: "Forward",
      archive: "Archive",
      delete: "Delete",
      markAsRead: "Mark as read",
      markAsUnread: "Mark as unread",
      noMessages: "No messages",
      typeMessage: "Type a message...",
      send: "Send",
    },
    settings: {
      general: "General",
      profile: "Profile",
      account: "Account",
      notifications: "Notifications",
      security: "Security",
      integrations: "Integrations",
      appearance: "Appearance",
      language: "Language",
      timezone: "Timezone",
      theme: "Theme",
      darkMode: "Dark mode",
      lightMode: "Light mode",
      systemMode: "System",
    },
    billing: {
      currentPlan: "Current plan",
      upgrade: "Upgrade",
      downgrade: "Downgrade",
      cancelSubscription: "Cancel subscription",
      paymentMethod: "Payment method",
      invoices: "Invoices",
      usage: "Usage",
      limits: "Limits",
      nextBilling: "Next billing",
      amount: "Amount",
      date: "Date",
      status: "Status",
      plan: "Plan",
      features: "Features",
    },
    errors: {
      required: "This field is required",
      invalidEmail: "Please enter a valid email",
      invalidPassword: "Password must be at least 8 characters",
      passwordMismatch: "Passwords do not match",
      networkError: "Network error. Please try again.",
      serverError: "Server error. Please try again later.",
      unauthorized: "You are not authorized to perform this action",
      notFound: "Resource not found",
      rateLimited: "Too many requests. Please try again later.",
      fileTooLarge: "File is too large",
      invalidFileType: "Invalid file type",
    },
  },
  es: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      update: "Actualizar",
      search: "Buscar",
      filter: "Filtrar",
      sort: "Ordenar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      confirm: "Confirmar",
      back: "Volver",
      next: "Siguiente",
      previous: "Anterior",
      close: "Cerrar",
      open: "Abrir",
      yes: "Sí",
      no: "No",
      ok: "Aceptar",
      done: "Listo",
      submit: "Enviar",
      reset: "Restablecer",
      clear: "Limpiar",
      select: "Seleccionar",
      all: "Todos",
      none: "Ninguno",
      more: "Más",
      less: "Menos",
      showMore: "Mostrar más",
      showLess: "Mostrar menos",
      viewAll: "Ver todo",
      viewDetails: "Ver detalles",
      noResults: "No se encontraron resultados",
      emptyState: "Nada que ver aquí todavía",
    },
    auth: {
      login: "Iniciar sesión",
      logout: "Cerrar sesión",
      signup: "Registrarse",
      forgotPassword: "¿Olvidaste tu contraseña?",
      resetPassword: "Restablecer contraseña",
      changePassword: "Cambiar contraseña",
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      rememberMe: "Recordarme",
      orContinueWith: "O continuar con",
      noAccount: "¿No tienes una cuenta?",
      hasAccount: "¿Ya tienes una cuenta?",
      verifyEmail: "Verifica tu correo electrónico",
      verificationSent: "Correo de verificación enviado",
    },
    navigation: {
      dashboard: "Panel",
      posts: "Publicaciones",
      calendar: "Calendario",
      analytics: "Analíticas",
      inbox: "Bandeja de entrada",
      campaigns: "Campañas",
      media: "Medios",
      settings: "Configuración",
      billing: "Facturación",
      team: "Equipo",
      help: "Ayuda",
    },
    post: {
      createPost: "Crear publicación",
      editPost: "Editar publicación",
      deletePost: "Eliminar publicación",
      schedulePost: "Programar publicación",
      publishNow: "Publicar ahora",
      scheduledFor: "Programada para",
      published: "Publicado",
      draft: "Borrador",
      scheduled: "Programado",
      failed: "Fallido",
      content: "Contenido",
      media: "Medios",
      hashtags: "Hashtags",
      mentions: "Menciones",
      characterCount: "Conteo de caracteres",
      platforms: "Plataformas",
      selectPlatforms: "Seleccionar plataformas",
      aiGenerate: "Generar con IA",
      regenerate: "Regenerar",
      improveWriting: "Mejorar escritura",
      makeShorter: "Hacer más corto",
      makeLonger: "Hacer más largo",
      addHashtags: "Agregar hashtags",
      translate: "Traducir",
    },
    analytics: {
      overview: "Resumen",
      engagement: "Interacción",
      reach: "Alcance",
      impressions: "Impresiones",
      followers: "Seguidores",
      growth: "Crecimiento",
      topPosts: "Mejores publicaciones",
      bestTimes: "Mejores horarios para publicar",
      contentPerformance: "Rendimiento del contenido",
      audienceInsights: "Información de la audiencia",
      exportReport: "Exportar informe",
      dateRange: "Rango de fechas",
      today: "Hoy",
      thisWeek: "Esta semana",
      thisMonth: "Este mes",
      lastMonth: "Mes pasado",
      customRange: "Rango personalizado",
    },
    inbox: {
      unifiedInbox: "Bandeja unificada",
      unread: "No leído",
      read: "Leído",
      replied: "Respondido",
      archived: "Archivado",
      reply: "Responder",
      forward: "Reenviar",
      archive: "Archivar",
      delete: "Eliminar",
      markAsRead: "Marcar como leído",
      markAsUnread: "Marcar como no leído",
      noMessages: "No hay mensajes",
      typeMessage: "Escribe un mensaje...",
      send: "Enviar",
    },
    settings: {
      general: "General",
      profile: "Perfil",
      account: "Cuenta",
      notifications: "Notificaciones",
      security: "Seguridad",
      integrations: "Integraciones",
      appearance: "Apariencia",
      language: "Idioma",
      timezone: "Zona horaria",
      theme: "Tema",
      darkMode: "Modo oscuro",
      lightMode: "Modo claro",
      systemMode: "Sistema",
    },
    billing: {
      currentPlan: "Plan actual",
      upgrade: "Mejorar",
      downgrade: "Degradar",
      cancelSubscription: "Cancelar suscripción",
      paymentMethod: "Método de pago",
      invoices: "Facturas",
      usage: "Uso",
      limits: "Límites",
      nextBilling: "Próxima facturación",
      amount: "Monto",
      date: "Fecha",
      status: "Estado",
      plan: "Plan",
      features: "Características",
    },
    errors: {
      required: "Este campo es obligatorio",
      invalidEmail: "Por favor, ingresa un correo electrónico válido",
      invalidPassword: "La contraseña debe tener al menos 8 caracteres",
      passwordMismatch: "Las contraseñas no coinciden",
      networkError: "Error de red. Por favor, inténtalo de nuevo.",
      serverError: "Error del servidor. Por favor, inténtalo más tarde.",
      unauthorized: "No estás autorizado para realizar esta acción",
      notFound: "Recurso no encontrado",
      rateLimited: "Demasiadas solicitudes. Por favor, inténtalo más tarde.",
      fileTooLarge: "El archivo es demasiado grande",
      invalidFileType: "Tipo de archivo no válido",
    },
  },
};

let currentLocale: Locale = DEFAULT_LOCALE as Locale;
let config: I18nConfig = { ...defaultConfig };

export function setLocale(locale: Locale): void {
  if (!config.supportedLocales.includes(locale)) {
    console.warn(`Locale "${locale}" is not supported`);
    return;
  }
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getSupportedLocales(): Locale[] {
  return config.supportedLocales;
}

export function initI18n(customConfig?: Partial<I18nConfig>): void {
  config = { ...defaultConfig, ...customConfig };
  
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && config.supportedLocales.includes(stored)) {
      currentLocale = stored;
    } else {
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (config.supportedLocales.includes(browserLang)) {
        currentLocale = browserLang;
      }
    }
    document.documentElement.lang = currentLocale;
  }
}

function getNestedValue(obj: TranslationDict, path: string): string | undefined {
  const keys = path.split(".");
  let current: string | TranslationDict | undefined = obj;

  for (const key of keys) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let value = getNestedValue(translations[currentLocale] || {}, key);

  if (value === undefined && currentLocale !== config.fallbackLocale) {
    value = getNestedValue(translations[config.fallbackLocale] || {}, key);
  }

  if (value === undefined) {
    console.warn(`Translation missing: ${key}`);
    return key;
  }

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    }
  }

  return value;
}

export function tExists(key: string): boolean {
  let value = getNestedValue(translations[currentLocale] || {}, key);
  
  if (value === undefined && currentLocale !== config.fallbackLocale) {
    value = getNestedValue(translations[config.fallbackLocale] || {}, key);
  }

  return value !== undefined;
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(currentLocale, options);
}

export function formatTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(currentLocale, options);
}

export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(currentLocale, options);
}

export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(currentLocale, options).format(num);
}

export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat(currentLocale, {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("time.justNow");
  if (minutes < 60) return t("time.minutesAgo", { count: minutes });
  if (hours < 24) return t("time.hoursAgo", { count: hours });
  if (days < 7) return t("time.daysAgo", { count: days });
  return formatDate(d);
}

export { translations, config };

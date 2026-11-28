import type { Translations } from "./types";

export const es = {
  common: {
    appName: "KredoWork",
    changeLanguage: "Idioma",
    navAria: "Navegación principal",
    solanaDevnet: "Modo de prueba · Solana",
    devnetNote:
      "Plataforma en modo de prueba seguro con saldo ficticio sin valor monetario real.",
    backHome: "Volver al inicio",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    footerNavAria: "Navegación del pie de página",
    builtOnSolana: "Impulsado por Solana · Modo prueba",
    openCoordination: "Alcance claro. Pagos asegurados.",
    builtForMaintainers:
      "Hecho para quienes construyen y mantienen software abierto.",
    brandHome: "KredoWork inicio",
  },
  languages: {
    english: "English",
    spanish: "Español",
  },
  nav: {
    about: "Cómo funciona",
    bounties: "Explorar tareas",
    register: "Comenzar",
    accountAccess: "Entrar / Registrarse",
    home: "Inicio",
  },
  home: {
    workOpen: "El buen trabajo",
    deserves: "merece",
    rewards: "pago seguro.",
    reward: "Recompensa",
    workflowAria: "Cómo funciona KredoWork",
    bottomAria: "Conoce la plataforma",
    lede: "KredoWork conecta equipos que necesitan avanzar con desarrolladores listos para entregar. Cada tarea tiene requisitos claros, recompensa reservada desde el inicio y pago automático al aprobarse, sin intermediarios.",
    createAccount: "Empezar ahora",
    learnMore: "Ver cómo funciona",
    devnetTrust:
      "Pruébalo gratis en modo de prueba, sin arriesgar dinero real.",
    bottomLabel: "Una forma más justa de colaborar",
    bottomStrong:
      "Objetivos claros desde el día uno. Pago automático al entregar.",
    bottomHowItWorks: "Cómo funciona",
    bottomOpenTasks: "Ver tareas abiertas",
    trustCaption: "Cada entrega suma a tu historial.",
    taskScopeLabel: "entregables claros",
    reviewByCommunity: "revisión transparente",
    escrowStatus: "pago asegurado desde el inicio",
    workDefined:
      "Requisitos, plazos y recompensa quedan definidos antes de escribir una sola línea de código.",
    fundsEscrowed:
      "El dinero queda protegido y reservado desde el primer momento hasta que se revise tu entrega.",
    communityReviewed:
      "La revisión tiene un plazo fijo y, una vez aprobada, el pago se libera automáticamente.",
  },
  bounties: {
    title: "Tareas abiertas.",
    updated: "Activo en modo de prueba",
    filterLabel: "Filtrar por estado",
    searchAria: "Buscar tareas",
    searchPlaceholder: "Buscar por tarea o espacio",
    listHeadTask: "Tarea / espacio",
    listHeadEscrow: "Recompensa",
    listHeadDeadline: "Fecha límite",
    listHeadApproval: "Revisión",
    listHeadSpec: "Detalle",
    vaultLocked: "reservados de antemano",
    daysRemaining: "Quedan {{days}} días",
    finished: "Cerrada",
    copyHash: "Copiar código de verificación {{hash}}",
    viewBounty: "Ver {{title}}",
    emptyTitleQuery: "No encontramos tareas con ese filtro.",
    emptyNone: "No hay tareas en estado «{{status}}» ahora mismo.",
    emptySubQuery: "Prueba con otro término o espacio de trabajo.",
    emptyDisputed: "Las entregas en revisión por desacuerdo aparecerán aquí.",
    emptyDefault: "Explora otras pestañas para encontrar tareas disponibles.",
    emptyButton: "Ver tareas abiertas",
    showing: "Mostrando {{from}} de {{to}} tareas",
    tasks: "tareas",
    viewAllTasks: "Ver todas las tareas",
    proofOpen: "Reglas transparentes",
    proofTasks: "entregas verificadas",
    proofNoMasterKey: "Sin intermediarios",
    proofEscrow: "Pagos protegidos",
    proofAria: "Garantías de la plataforma",
    footerBuilt: "Construido sobre Solana",
    status: {
      OPEN: "Abierta",
      CLAIMED: "En progreso",
      SUBMITTED: "En revisión",
      PRE_APPROVED: "Aprobada · Pago pendiente",
      COMPLETED: "Pagada",
      EXPIRED: "Vencida",
      DISPUTED: "En disputa",
      REJECTED: "Requiere ajustes",
    },
  },
  about: {
    clearerWay: "Una forma más clara",
    toBuild: "de construir",
    together: "en equipo.",
    intro:
      "KredoWork convierte necesidades técnicas en tareas claras con pago asegurado. Los equipos reciben entregas confiables y quienes construyen cobran sin perseguir facturas.",
    step1Title: "Elige una tarea",
    step1Body:
      "Conoce los requisitos exactos, el plazo y la recompensa garantizada antes de empezar.",
    step2Title: "Envía tu entrega",
    step2Body:
      "Comparte tu avance para revisión mientras la recompensa sigue protegida.",
    step3Title: "Cobra automáticamente",
    step3Body:
      "Al aprobarse tu trabajo, recibes el pago al instante y sumas reputación verificable.",
    transparent: "Justo por diseño",
    guaranteesKicker: "Protecciones integradas",
    guaranteesTitle: "Reglas que cuidan a ambas partes",
    guaranteesSubtitle:
      "Se cumplen automáticamente mediante reglas digitales, sin depender de promesas.",
    guarantee1Title: "Sin intermediarios",
    guarantee1Body:
      "Nadie puede congelar ni desviar el dinero reservado. Los pagos avanzan únicamente según las entregas aprobadas.",
    guarantee2Title: "Sin fondos atrapados",
    guarantee2Body:
      "Cada etapa tiene un tiempo límite claro. Si una revisión se detiene o el plazo vence, los fondos se liberan o devuelven automáticamente.",
    guarantee3Title: "Reputación comprobable",
    guarantee3Body:
      "Tanto quienes construyen como quienes revisan crean un historial público y verificable con cada tarea completada.",
    guarantee4Title: "Resolución justa de desacuerdos",
    guarantee4Body:
      "Si surge una diferencia sobre una entrega, revisores independientes evalúan las pruebas con depósitos reembolsables para dar un fallo rápido.",
    flowKicker: "Cómo avanza una tarea",
    flowTitle: "De tarea publicada a pago completado",
    flowItem1: "Tarea publicada con recompensa asegurada",
    flowItem2: "Entrega enviada y verificada",
    flowItem3: "Revisión con plazo fijo (o mediación justa)",
    flowItem4: "Pago automático e historial actualizado",
    calloutLabel: "Pruébalo gratis en modo de prueba",
    calloutTitle1: "Construye un historial",
    calloutTitle2: "que cualquiera pueda verificar.",
    createAccount: "Comenzar ahora",
  },
  account: {
    metaTitle: "Tu perfil — KredoWork",
    metaDescription:
      "Administra tu perfil de KredoWork, GitHub y tu wallet de Solana.",
    profile: "Tu",
    toKredoWork: "perfil.",
    lede: "Administra tus cuentas vinculadas y mantén tu perfil listo para recibir recompensas.",
    githubAccount: "Perfil de GitHub",
    active: "Conectado",
    goToKredoWork: "Explorar tareas",
    displayNameLabel: "Nombre visible",
    displayNamePlaceholder: "Tu nombre o alias de desarrollador",
    changePhoto: "Cambiar foto",
    photoHint: "JPG, PNG o WEBP · Máx. 2 MB",
    saveChanges: "Guardar cambios",
    saving: "Guardando…",
    savedSuccess: "Perfil actualizado.",
    saveError: "No se pudo guardar tu perfil. Inténtalo de nuevo.",
    invalidImage: "Selecciona una imagen JPG, PNG, WEBP o GIF menor a 2 MB.",
    viewPublicProfile: "Ver historial público",
  },
  register: {
    enter: "Construye trabajo real.",
    conversation: "Cobra sin fricción.",
    intro:
      "Participa en tareas técnicas abiertas con alcance claro, recompensas aseguradas desde el día uno y pagos automáticos al aprobarse tu trabajo.",
    networkNote: "Modo de prueba gratuito · Sin dinero real en riesgo",
    createAccount: "Comenzar ahora",
    chooseMethod:
      "Elige cómo entrar. Podrás vincular el otro método cuando quieras.",
    connectWallet: "Continuar con Wallet de Solana",
    solanaDevnet: "Necesaria para recibir pagos y firmar entregas",
    continueGitHub: "Continuar con GitHub",
    connectingGitHub: "Conectando con GitHub…",
    githubSub: "Muestra tu perfil técnico y vincula tus PRs",
    oauthNote:
      "Sin contraseñas que recordar. Ambos accesos se unifican en un solo perfil.",
    legal:
      "Al continuar, aceptas las reglas de participación de KredoWork. Plataforma en modo de prueba seguro sin dinero real.",
  },
  workspace: {
    authorityReviewerInfo:
      "Tu wallet conectada administrará este espacio de trabajo.",
    independentReviewers:
      "Para garantizar imparcialidad, quien publica o entrega una tarea no puede aprobarla. Añade revisores independientes que validen entregas y actúen como árbitros si surge algún desacuerdo.",
    reviewersInvalid:
      "Añade entre 1 y 8 direcciones de wallet de Solana válidas y sin repetir.",
    windowsInvalid:
      "Todos los plazos de revisión deben ser números enteros mayores a cero.",
  },
  wallet: {
    pickerAria: "Selecciona una wallet",
    noAccount:
      "Tu wallet no devolvió ninguna cuenta. Desbloquéala e inténtalo de nuevo.",
    connectFailed:
      "No se pudo conectar tu wallet. Asegúrate de que esté desbloqueada e inténtalo de nuevo.",
    noCompatible:
      "No detectamos una wallet de Solana. Instala Phantom, Solflare o Backpack y recarga la página.",
    connecting: "Conectando…",
    connectWallet: "Conectar wallet",
    disconnectWallet: "Desconectar wallet",
    devnetBalance: "Saldo de prueba: {{balance}} SOL",
    verifyAndLink: "Verificar y vincular wallet",
    walletVerified: "Wallet verificada y vinculada a tu perfil.",
    walletNotVerified: "Conectada: firma una vez para confirmar que es tuya.",
    walletLinkFailed:
      "No se pudo verificar la propiedad de esta wallet. Inténtalo de nuevo.",
    walletLinkSuccess: "Wallet verificada y vinculada a tu perfil.",
    githubConnected: "GitHub conectado",
    githubNotConnected: "GitHub aún sin vincular",
    initializeReputation: "Activar historial público",
  },
  auth: {
    githubSignInFailed:
      "No se pudo iniciar sesión con GitHub. Inténtalo de nuevo.",
    githubProfileUnavailable:
      "GitHub no pudo compartir los datos de tu perfil. Inténtalo de nuevo en unos momentos.",
    signOutFailed: "No se pudo cerrar la sesión. Inténtalo de nuevo.",
    signingOut: "Cerrando sesión…",
    signOut: "Cerrar sesión",
  },
} satisfies Translations;

export const PERMISSIONS = {
  // Documents
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_UPDATE: 'document:update',
  DOCUMENT_DELETE: 'document:delete',

  // Epreuves
  EPREUVE_CREATE: 'epreuve:create',
  EPREUVE_READ: 'epreuve:read',
  EPREUVE_UPDATE: 'epreuve:update',
  EPREUVE_DELETE: 'epreuve:delete',

  // Quiz
  QUIZ_CREATE: 'quiz:create',
  QUIZ_READ: 'quiz:read',
  QUIZ_UPDATE: 'quiz:update',
  QUIZ_DELETE: 'quiz:delete',

  // References (universites, filieres, matieres)
  REFERENCE_CREATE: 'reference:create',
  REFERENCE_READ: 'reference:read',
  REFERENCE_UPDATE: 'reference:update',
  REFERENCE_DELETE: 'reference:delete',

  // Users
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_SUSPEND: 'user:suspend',
  USER_ROLE_CHANGE: 'user:role:change',

  // Vérification académique (dossiers + justificatifs)
  VERIFICATION_REVIEW: 'verification:review',

  // Roles & Permissions
  ROLE_MANAGE: 'role:manage',

  // Settings
  SETTING_MANAGE: 'setting:manage',
  SETTING_READ: 'setting:read',

  // Notifications
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_READ: 'notification:read',

  // Admin panel
  ADMIN_ACCESS: 'admin:access',
  ADMIN_DASHBOARD: 'admin:dashboard',

  // Sync
  SYNC_READ: 'sync:read',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_GROUPS = {
  Documents: [
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_DELETE,
  ],
  Epreuves: [
    PERMISSIONS.EPREUVE_CREATE,
    PERMISSIONS.EPREUVE_READ,
    PERMISSIONS.EPREUVE_UPDATE,
    PERMISSIONS.EPREUVE_DELETE,
  ],
  Quiz: [
    PERMISSIONS.QUIZ_CREATE,
    PERMISSIONS.QUIZ_READ,
    PERMISSIONS.QUIZ_UPDATE,
    PERMISSIONS.QUIZ_DELETE,
  ],
  References: [
    PERMISSIONS.REFERENCE_CREATE,
    PERMISSIONS.REFERENCE_READ,
    PERMISSIONS.REFERENCE_UPDATE,
    PERMISSIONS.REFERENCE_DELETE,
  ],
  Users: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_SUSPEND,
    PERMISSIONS.USER_ROLE_CHANGE,
  ],
  Verification: [
    PERMISSIONS.VERIFICATION_REVIEW,
  ],
  Roles: [
    PERMISSIONS.ROLE_MANAGE,
  ],
  Settings: [
    PERMISSIONS.SETTING_MANAGE,
    PERMISSIONS.SETTING_READ,
  ],
  Notifications: [
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.NOTIFICATION_READ,
  ],
  Admin: [
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.ADMIN_DASHBOARD,
  ],
  Sync: [
    PERMISSIONS.SYNC_READ,
  ],
} as const;

export const DEFAULT_ROLES = [
  {
    name: 'admin',
    label: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    isActive: true,
  },
  {
    name: 'moderator',
    label: 'Modérateur',
    description: 'Gestion du contenu (documents, épreuves, quiz) sans gestion des utilisateurs',
    permissions: [
      PERMISSIONS.DOCUMENT_CREATE, PERMISSIONS.DOCUMENT_READ, PERMISSIONS.DOCUMENT_UPDATE, PERMISSIONS.DOCUMENT_DELETE,
      PERMISSIONS.EPREUVE_CREATE, PERMISSIONS.EPREUVE_READ, PERMISSIONS.EPREUVE_UPDATE, PERMISSIONS.EPREUVE_DELETE,
      PERMISSIONS.QUIZ_CREATE, PERMISSIONS.QUIZ_READ, PERMISSIONS.QUIZ_UPDATE, PERMISSIONS.QUIZ_DELETE,
      PERMISSIONS.REFERENCE_CREATE, PERMISSIONS.REFERENCE_READ, PERMISSIONS.REFERENCE_UPDATE, PERMISSIONS.REFERENCE_DELETE,
      PERMISSIONS.NOTIFICATION_READ,
      PERMISSIONS.ADMIN_ACCESS,
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: 'user',
    label: 'Utilisateur',
    description: 'Utilisateur standard — étudiant',
    permissions: [
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.EPREUVE_READ,
      PERMISSIONS.QUIZ_READ,
      PERMISSIONS.REFERENCE_READ,
      PERMISSIONS.NOTIFICATION_READ,
      PERMISSIONS.SYNC_READ,
    ],
    isSystem: true,
    isActive: true,
  },
];

export const DEFAULT_SETTINGS = [
  {
    key: 'allowed_email_domains',
    value: ['univ-yde1.cm', 'univ-yde2.cm', 'univ-dla.cm', 'uy1.univ.cm', 'uy2.univ.cm', 'udm.univ.cm', 'gmail.com'],
    type: 'array' as const,
    category: 'security',
    description: 'Domaines email autorisés à l\'inscription. Laisser vide pour autoriser tous les domaines.',
    isPublic: true,
  },
  {
    key: 'restrict_email_domains',
    value: true,
    type: 'boolean' as const,
    category: 'security',
    description: 'Activer la restriction des domaines email à l\'inscription',
    isPublic: true,
  },
  {
    key: 'max_file_size_mb',
    value: 50,
    type: 'number' as const,
    category: 'upload',
    description: 'Taille maximale des fichiers uploadés en MB',
    isPublic: false,
  },
  {
    key: 'app_name',
    value: 'NextLearn',
    type: 'string' as const,
    category: 'general',
    description: 'Nom de l\'application',
    isPublic: true,
  },
  {
    key: 'maintenance_mode',
    value: false,
    type: 'boolean' as const,
    category: 'general',
    description: 'Mode maintenance — désactive l\'accès à l\'API pour les utilisateurs non-admin',
    isPublic: true,
  },
  {
    key: 'otp_expiry_minutes',
    value: 10,
    type: 'number' as const,
    category: 'security',
    description: 'Durée de validité du code OTP en minutes',
    isPublic: false,
  },
  {
    key: 'max_login_attempts',
    value: 5,
    type: 'number' as const,
    category: 'security',
    description: 'Nombre maximum de tentatives de connexion avant blocage temporaire',
    isPublic: false,
  },
  {
    key: 'allow_self_registration',
    value: true,
    type: 'boolean' as const,
    category: 'security',
    description: 'Autoriser l\'auto-inscription des utilisateurs',
    isPublic: true,
  },
];

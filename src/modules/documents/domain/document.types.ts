export interface DocumentFilters {
  matiereId?: string;
  niveau?: string;
  type?: string;
  universiteId?: string;
  anneeAcademique?: string;
}

export interface CreateDocumentDto {
  titre: string;
  description: string;
  type: string;
  matiereId: string;
  enseignantId?: string;
  universiteId?: string;
  niveau: string;
  anneeAcademique: string;
}

export interface UpdateDocumentDto {
  titre?: string;
  description?: string;
  type?: string;
  matiereId?: string;
  enseignantId?: string;
  universiteId?: string;
  niveau?: string;
  anneeAcademique?: string;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  matiereId?: string;
  niveau?: string;
  type?: string;
  search?: string;
}

export interface RatingDto {
  note: number;
}

export interface DocumentFilters {
  matiereId?: number;
  niveau?: string;
  type?: string;
  universiteId?: number;
  anneeAcademique?: string;
}

export interface CreateDocumentDto {
  titre: string;
  description: string;
  type: string;
  matiereId: number;
  enseignantId?: number;
  universiteId?: number;
  niveau: string;
  anneeAcademique: string;
}

export interface UpdateDocumentDto {
  titre?: string;
  description?: string;
  type?: string;
  matiereId?: number;
  enseignantId?: number;
  universiteId?: number;
  niveau?: string;
  anneeAcademique?: string;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  matiereId?: number;
  niveau?: string;
  type?: string;
  search?: string;
}

export interface RatingDto {
  note: number;
}

export interface UpdateProgressDto {
  pageCourante: number;
  tempsTotalSecondes?: number;
}

export interface CreateSessionDto {
  documentId: string;
  dureeSecondes: number;
  pagesLues: number;
}

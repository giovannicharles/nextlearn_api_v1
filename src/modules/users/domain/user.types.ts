export interface UpdateProfileDto {
  nom?: string;
  prenom?: string;
  universite?: string;
  filiere?: string;
  niveau?: string;
  langue?: string;
  avatarUrl?: string;
}

export interface ChangePinDto {
  currentPin: string;
  newPin: string;
}

export interface UpdateFcmTokenDto {
  fcmToken: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

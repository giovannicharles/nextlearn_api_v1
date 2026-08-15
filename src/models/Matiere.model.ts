import mongoose, { Schema, Document } from 'mongoose';

export interface IMatiere extends Document {
  id: string;
  nom: string;
  actif: boolean;
  filiereId?: string;
  /** Niveau où la matière est enseignée (code N1..N5) — dernier étage de la cascade. */
  niveau?: string;
  /** Semestre porté par la matière, et non par le document. */
  semestre?: string;
}

const matiereSchema = new Schema<IMatiere>(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    filiereId: {
      type: String,
      ref: 'Filiere',
      index: true,
    },
    niveau: {
      type: String,
      index: true,
    },
    semestre: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Un même intitulé peut exister sur deux niveaux ou deux semestres (« English »
// en S1 et en S2) : l'unicité porte donc sur le quadruplet complet.
matiereSchema.index({ nom: 1, filiereId: 1, niveau: 1, semestre: 1 }, { unique: true });
matiereSchema.index({ filiereId: 1, niveau: 1 });

export const Matiere = mongoose.models.Matiere || mongoose.model<IMatiere>('Matiere', matiereSchema);

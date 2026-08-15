import { Document, Epreuve, Quiz, Question, Enseignant, Universite, Filiere, Matiere } from '../../models/index';
import { NotFoundError, ValidationError } from '../../shared/errors/index';
import { parsePagination, createPaginationMeta } from '../../shared/utils/pagination';

export class AdminContentService {
  // ==================== Documents ====================
  async listDocuments(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.universiteId) query.universiteId = filters.universiteId;
    query.actif = filters.actif !== undefined ? (filters.actif === 'true' || filters.actif === true) : true;
    if (filters.search) {
      query.$or = [
        { titre: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const REF_POPULATE = [
      { path: 'matiereId', select: 'nom' },
      { path: 'enseignantId', select: 'nom' },
      { path: 'universiteId', select: 'nom' },
      { path: 'filiereId', select: 'nom' },
    ];

    const skip = (page - 1) * limit;
    const [documents, total] = await Promise.all([
      Document.find(query).populate(REF_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Document.countDocuments(query),
    ]);

    return {
      data: documents,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getDocumentById(id: string) {
    const doc = await Document.findById(id)
      .populate([
        { path: 'matiereId', select: 'nom' },
        { path: 'enseignantId', select: 'nom' },
        { path: 'universiteId', select: 'nom' },
        { path: 'filiereId', select: 'nom' },
      ])
      .lean();
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }

  async toggleDocumentActive(id: string) {
    const doc = await Document.findById(id);
    if (!doc) throw new NotFoundError('Document');
    await Document.updateOne({ _id: id }, { $set: { actif: !doc.actif } });
    return { id: doc._id, actif: !doc.actif };
  }

  async bulkDocumentAction(action: string, ids: string[]) {
    if (!ids || ids.length === 0) throw new ValidationError('Aucun document sélectionné');

    let result;
    switch (action) {
      case 'activate':
        result = await Document.updateMany({ _id: { $in: ids } }, { $set: { actif: true } });
        break;
      case 'deactivate':
        result = await Document.updateMany({ _id: { $in: ids } }, { $set: { actif: false } });
        break;
      case 'delete':
        result = await Document.deleteMany({ _id: { $in: ids } });
        break;
      default:
        throw new ValidationError(`Action non reconnue: ${action}`);
    }
    const affected = 'modifiedCount' in result ? result.modifiedCount : result.deletedCount;
    return { action, affected, total: ids.length };
  }

  // ==================== Epreuves ====================
  async listEpreuves(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};

    if (filters.niveau) query.niveau = filters.niveau;
    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.annee) query.annee = Number(filters.annee);
    if (filters.universiteId) query.universiteId = filters.universiteId;
    query.actif = filters.actif !== undefined ? (filters.actif === 'true' || filters.actif === true) : true;

    const skip = (page - 1) * limit;
    const [epreuves, total] = await Promise.all([
      Epreuve.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Epreuve.countDocuments(query),
    ]);

    return {
      data: epreuves,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getEpreuveById(id: string) {
    const epreuve = await Epreuve.findById(id).lean();
    if (!epreuve) throw new NotFoundError('Épreuve');
    return epreuve;
  }

  async toggleEpreuveActive(id: string) {
    const epreuve = await Epreuve.findById(id);
    if (!epreuve) throw new NotFoundError('Épreuve');
    await Epreuve.updateOne({ _id: id }, { $set: { actif: !epreuve.actif } });
    return { id: epreuve._id, actif: !epreuve.actif };
  }

  async bulkEpreuveAction(action: string, ids: string[]) {
    if (!ids || ids.length === 0) throw new ValidationError('Aucune épreuve sélectionnée');

    let result;
    switch (action) {
      case 'activate':
        result = await Epreuve.updateMany({ _id: { $in: ids } }, { $set: { actif: true } });
        break;
      case 'deactivate':
        result = await Epreuve.updateMany({ _id: { $in: ids } }, { $set: { actif: false } });
        break;
      case 'delete':
        result = await Epreuve.deleteMany({ _id: { $in: ids } });
        break;
      default:
        throw new ValidationError(`Action non reconnue: ${action}`);
    }
    const affected = 'modifiedCount' in result ? result.modifiedCount : result.deletedCount;
    return { action, affected, total: ids.length };
  }

  // ==================== Quiz ====================
  async listQuizzes(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};

    if (filters.matiereId) query.matiereId = filters.matiereId;
    if (filters.documentId) query.documentId = filters.documentId;
    query.actif = filters.actif !== undefined ? (filters.actif === 'true' || filters.actif === true) : true;
    if (filters.search) {
      query.titre = { $regex: filters.search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [quizzes, total] = await Promise.all([
      Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Quiz.countDocuments(query),
    ]);

    return {
      data: quizzes,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getQuizById(id: string) {
    const quiz = await Quiz.findById(id).lean();
    if (!quiz) throw new NotFoundError('Quiz');
    return quiz;
  }

  async getQuizWithQuestions(id: string) {
    const quiz = await Quiz.findById(id).lean();
    if (!quiz) throw new NotFoundError('Quiz');
    const questions = await Question.find({ quizId: id }).sort({ ordre: 1 }).lean();
    return { ...quiz, questions };
  }

  async toggleQuizActive(id: string) {
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new NotFoundError('Quiz');
    await Quiz.updateOne({ _id: id }, { $set: { actif: !quiz.actif } });
    return { id: quiz._id, actif: !quiz.actif };
  }

  async bulkQuizAction(action: string, ids: string[]) {
    if (!ids || ids.length === 0) throw new ValidationError('Aucun quiz sélectionné');

    let result;
    switch (action) {
      case 'activate':
        result = await Quiz.updateMany({ _id: { $in: ids } }, { $set: { actif: true } });
        break;
      case 'deactivate':
        result = await Quiz.updateMany({ _id: { $in: ids } }, { $set: { actif: false } });
        break;
      case 'delete':
        result = await Quiz.deleteMany({ _id: { $in: ids } });
        break;
      default:
        throw new ValidationError(`Action non reconnue: ${action}`);
    }
    const affected = 'modifiedCount' in result ? result.modifiedCount : result.deletedCount;
    return { action, affected, total: ids.length };
  }

  async updateQuestion(questionId: string, data: any) {
    const question = await Question.findByIdAndUpdate(questionId, data, { new: true }).lean();
    if (!question) throw new NotFoundError('Question');
    return question;
  }

  async listQuestionsByQuiz(quizId: string) {
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz');
    const questions = await Question.find({ quizId }).sort({ ordre: 1 }).lean();
    return questions;
  }

  // ==================== Enseignants ====================
  async listEnseignants(filters: any) {
    const { page, limit } = parsePagination(filters);
    const query: any = {};
    if (filters.search) {
      query.nom = { $regex: filters.search, $options: 'i' };
    }
    if (filters.universiteId) query.universiteId = filters.universiteId;

    const skip = (page - 1) * limit;
    const [enseignants, total] = await Promise.all([
      Enseignant.find(query).sort({ nom: 1 }).skip(skip).limit(limit).lean(),
      Enseignant.countDocuments(query),
    ]);

    return {
      data: enseignants,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async createEnseignant(data: { nom: string; email?: string; universiteId?: string }) {
    if (!data.nom) throw new ValidationError('Le nom est requis');
    return await Enseignant.create(data);
  }

  async updateEnseignant(id: string, data: any) {
    const enseignant = await Enseignant.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!enseignant) throw new NotFoundError('Enseignant');
    return enseignant;
  }

  async deleteEnseignant(id: string) {
    const enseignant = await Enseignant.findById(id);
    if (!enseignant) throw new NotFoundError('Enseignant');
    await Enseignant.deleteOne({ _id: id });
  }

  // ==================== Content Overview ====================
  async contentOverview() {
    const [
      docsByType, docsActive, docsInactive,
      epreuvesActive, epreuvesInactive,
      quizActive, quizInactive,
      enseignantsCount,
      recentDocuments, recentEpreuves, recentQuizzes,
    ] = await Promise.all([
      Document.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Document.countDocuments({ actif: true }),
      Document.countDocuments({ actif: false }),
      Epreuve.countDocuments({ actif: true }),
      Epreuve.countDocuments({ actif: false }),
      Quiz.countDocuments({ actif: true }),
      Quiz.countDocuments({ actif: false }),
      Enseignant.countDocuments(),
      Document.find().sort({ createdAt: -1 }).limit(5).select('titre type actif createdAt').lean(),
      Epreuve.find().sort({ createdAt: -1 }).limit(5).select('matiereId annee actif createdAt').lean(),
      Quiz.find().sort({ createdAt: -1 }).limit(5).select('titre actif createdAt').lean(),
    ]);

    return {
      documents: {
        total: docsByType.reduce((s, d) => s + d.count, 0),
        active: docsActive,
        inactive: docsInactive,
        byType: docsByType.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {} as Record<string, number>),
      },
      epreuves: {
        active: epreuvesActive,
        inactive: epreuvesInactive,
        total: epreuvesActive + epreuvesInactive,
      },
      quizzes: {
        active: quizActive,
        inactive: quizInactive,
        total: quizActive + quizInactive,
      },
      enseignants: enseignantsCount,
      recent: {
        documents: recentDocuments,
        epreuves: recentEpreuves,
        quizzes: recentQuizzes,
      },
    };
  }
}

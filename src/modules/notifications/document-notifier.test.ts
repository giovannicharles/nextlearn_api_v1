import { describe, it, expect } from 'vitest';
import { DocumentNotifierService } from './document-notifier.service';

const base = { id: 'doc1', titre: 'Algèbre', niveau: 'L3' };

describe('ciblage des notifications (ET strict)', () => {
  it('contraint toujours sur le niveau', () => {
    const q = DocumentNotifierService.buildAudienceQuery(base);
    expect(q.niveau).toBe('L3');
  });

  it('ajoute filière et université quand elles sont renseignées', () => {
    const q = DocumentNotifierService.buildAudienceQuery({
      ...base,
      filiereId: 'f1',
      universiteId: 'u1',
    });
    expect(q.filiereId).toBe('f1');
    expect(q.universiteId).toBe('u1');
  });

  it('n’impose aucune contrainte d’université si le contenu est générique', () => {
    const q = DocumentNotifierService.buildAudienceQuery({ ...base, filiereId: 'f1' });
    expect(q.filiereId).toBe('f1');
    expect('universiteId' in q).toBe(false);
  });

  it('n’impose aucune contrainte de filière si elle est absente', () => {
    const q = DocumentNotifierService.buildAudienceQuery({ ...base, universiteId: 'u1' });
    expect('filiereId' in q).toBe(false);
    expect(q.universiteId).toBe('u1');
  });

  it('traite null comme absent, pas comme une contrainte', () => {
    const q = DocumentNotifierService.buildAudienceQuery({
      ...base,
      filiereId: null,
      universiteId: null,
    });
    expect('filiereId' in q).toBe(false);
    expect('universiteId' in q).toBe(false);
  });

  it('exclut les comptes non actifs et les non-étudiants', () => {
    const q = DocumentNotifierService.buildAudienceQuery(base);
    expect(q.status).toBe('active');
    expect(q.role).toBe('user');
  });

  it('exclut les comptes en attente de vérification', () => {
    const q = DocumentNotifierService.buildAudienceQuery(base) as any;
    // Seuls les comptes sans dossier ou approuvés sont ciblés.
    expect(q.$or).toEqual([
      { verificationStatus: { $exists: false } },
      { verificationStatus: null },
      { verificationStatus: 'approuve' },
    ]);
  });
});

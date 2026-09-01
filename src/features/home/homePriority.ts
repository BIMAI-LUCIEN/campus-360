import type { StageApplication, StageJob } from '../../types';

export type HomeDestination = 'applications' | 'stages' | 'documents' | 'account' | 'resources';

export type StudentDocumentSummary = {
  id: string;
  title: string;
  template_type: string;
  updated_at: string;
};

export type HomePriority = {
  kind: 'application' | 'stage' | 'document' | 'profile' | 'resource';
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  destination: HomeDestination;
  progress?: number;
};

type HomePriorityInput = {
  applications: StageApplication[];
  jobs: StageJob[];
  documents: StudentDocumentSummary[];
  profileComplete: boolean;
  now?: Date;
};

const daysSince = (value: string, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000));

const documentLabel = (templateType: string) => {
  if (templateType === 'cv') return 'CV';
  if (templateType === 'lettre_motivation') return 'lettre';
  if (templateType === 'memoire') return 'mémoire';
  if (templateType === 'stage') return 'rapport de stage';
  return 'document';
};

export function resolveHomePriority({
  applications,
  jobs,
  documents,
  profileComplete,
  now = new Date(),
}: HomePriorityInput): HomePriority {
  const interview = applications.find((application) => application.status === 'INTERVIEW');
  if (interview) {
    return {
      kind: 'application',
      eyebrow: 'ENTRETIEN À PRÉPARER',
      title: interview.job?.title ?? 'Une entreprise veut avancer avec toi',
      description: `Prépare tes réponses et vérifie ton dossier pour ${interview.job?.company?.name ?? "l'entreprise"}.`,
      actionLabel: 'Voir ma candidature',
      destination: 'applications',
      progress: 82,
    };
  }

  const followUp = applications.find(
    (application) => application.status === 'PENDING' && daysSince(application.appliedAt, now) >= 7,
  );
  if (followUp) {
    return {
      kind: 'application',
      eyebrow: 'RELANCE DISPONIBLE',
      title: `Relance ${followUp.job?.company?.name ?? "l'entreprise"} au bon moment`,
      description: 'Ta candidature a plus de sept jours. Une relance courte peut faire la différence.',
      actionLabel: 'Préparer la relance',
      destination: 'applications',
      progress: 64,
    };
  }

  const topJob = jobs.find((job) => (job.matchScore ?? 0) >= 80) ?? jobs[0];
  if (topJob) {
    return {
      kind: 'stage',
      eyebrow: 'MEILLEUR MATCH',
      title: `${topJob.matchScore ?? 0}% pour ${topJob.title}`,
      description: `${topJob.company?.name ?? 'Une entreprise'} recherche des compétences proches des tiennes.`,
      actionLabel: 'Voir cette offre',
      destination: 'stages',
      progress: topJob.matchScore ?? 0,
    };
  }

  const recentDocument = [...documents].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )[0];
  if (recentDocument) {
    return {
      kind: 'document',
      eyebrow: 'TRAVAIL EN COURS',
      title: `Continue ton ${documentLabel(recentDocument.template_type)}`,
      description: recentDocument.title,
      actionLabel: 'Reprendre la rédaction',
      destination: 'documents',
      progress: 62,
    };
  }

  if (!profileComplete) {
    return {
      kind: 'profile',
      eyebrow: 'PROFIL À COMPLÉTER',
      title: 'Débloque des stages plus pertinents',
      description: 'Ajoute tes compétences et ton parcours pour améliorer immédiatement ton matching.',
      actionLabel: 'Compléter mon profil',
      destination: 'account',
      progress: 35,
    };
  }

  return {
    kind: 'resource',
    eyebrow: 'PROCHAINE ÉTAPE',
    title: 'Prépare ta prochaine réussite',
    description: 'Explore les ressources adaptées à ta filière ou crée un CV prêt à envoyer.',
    actionLabel: 'Explorer Campus 360',
    destination: 'resources',
  };
}

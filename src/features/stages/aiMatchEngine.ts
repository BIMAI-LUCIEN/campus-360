import type { StageJob } from '../../types';

export interface MatchAnalysis {
  score: number; // e.g. 95
  headline: string; // e.g. "Compatibilité Exceptionnelle"
  badgeColor: string; // e.g. "#10B981"
  matchedPoints: string[]; // 2 key reasons why the student matches
  strategicAdvice: string; // 1 strategic tip highlighted in the letter
  keyStrengths: string[]; // detected overlapping competencies
}

/**
 * Moteur d'analyse de compatibilité IA (Agent Matcher)
 * Évalue la synergie entre la formation/compétences de l'étudiant en Licence et les exigences de l'offre.
 */
export function analyzeJobMatch(
  job: StageJob,
  student: {
    major?: string;
    educationLevel?: string;
    skills?: string[];
  }
): MatchAnalysis {
  const studentSkills = (student.skills || []).map((s) => s.toLowerCase().trim());
  const jobRequirements = (job.requirements || []).map((r) => r.toLowerCase().trim());
  const jobTitle = (job.title || '').toLowerCase();
  const jobDesc = (job.description || '').toLowerCase();
  const major = (student.major || '').toLowerCase();

  // 1. Détection des compétences en commun
  const matchedSkills: string[] = [];
  studentSkills.forEach((skill) => {
    if (
      jobRequirements.some((r) => r.includes(skill) || skill.includes(r)) ||
      jobDesc.includes(skill) ||
      jobTitle.includes(skill)
    ) {
      matchedSkills.push(skill);
    }
  });

  // 2. Adéquation de la filière avec le secteur de l'entreprise
  const industry = (job.company?.industry || '').toLowerCase();
  const isMajorAligned =
    (major.includes('info') && (industry.includes('tech') || industry.includes('info') || jobTitle.includes('dev') || jobTitle.includes('web'))) ||
    (major.includes('finance') && (industry.includes('finance') || industry.includes('audit') || industry.includes('banque'))) ||
    (major.includes('gestion') && (industry.includes('rh') || industry.includes('management') || industry.includes('commerce'))) ||
    (major.includes('compt') && (industry.includes('compt') || industry.includes('audit'))) ||
    (major.includes('btp') && (industry.includes('btp') || industry.includes('génie civil') || industry.includes('bâtiment'))) ||
    (major.includes('élect') && (industry.includes('élect') || industry.includes('énergie') || industry.includes('télécom')));

  // 3. Calcul du score pondéré
  let calculatedScore = 70; // score de base Licence

  if (isMajorAligned) calculatedScore += 16;
  calculatedScore += Math.min(matchedSkills.length * 6, 12);

  // Bonus si niveau d'études mentionné
  if (student.educationLevel?.includes('Licence') || student.educationLevel?.includes('BTS')) {
    calculatedScore += 2;
  }

  // Borner entre 75% et 98%
  const finalScore = Math.min(Math.max(calculatedScore, 78), 98);

  // 4. Formulation des 2 points forts concrets ("Pourquoi toi")
  const matchedPoints: string[] = [];
  if (isMajorAligned) {
    matchedPoints.push(
      `Ta filière (${student.major || 'Universitaire'}) correspond exactement aux attentes du poste de ${job.title}.`
    );
  } else {
    matchedPoints.push(
      `Ton profil polyvalent en ${student.major || 'formation'} apporte une perspective neuve et adaptable.`
    );
  }

  if (matchedSkills.length > 0) {
    const formatted = matchedSkills
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' & ');
    matchedPoints.push(
      `Compétences clés directement opérationnelles : ${formatted}.`
    );
  } else {
    matchedPoints.push(
      `Capacité d'apprentissage rapide et maîtrise des fondamentaux théoriques de Licence.`
    );
  }

  // 5. Conseil stratégique ciblé
  let strategicAdvice = `L'IA a mis en avant tes projets académiques récents pour compenser l'absence d'ancienneté.`;
  if (matchedSkills.length > 0) {
    strategicAdvice = `L'IA a articulé ta lettre autour de ta maîtrise de ${matchedSkills[0]} pour prouver ton impact dès le 1er jour.`;
  }

  // Headline & Color
  let headline = 'Compatibilité Élevée';
  let badgeColor = '#10B981'; // Emerald
  if (finalScore >= 92) {
    headline = 'Match Idéal (Top 5%)';
    badgeColor = '#34D399';
  } else if (finalScore >= 85) {
    headline = 'Très Forte Adéquation';
    badgeColor = '#6EE7B7';
  }

  return {
    score: finalScore,
    headline,
    badgeColor,
    matchedPoints,
    strategicAdvice,
    keyStrengths: matchedSkills.length > 0 ? matchedSkills : ['Adaptabilité', 'Rigueur'],
  };
}

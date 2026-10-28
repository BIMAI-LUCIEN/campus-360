// Database of 18 authentic, distinct higher education exams in Cameroon
export const allExams = [
  // ─── 1. ENSPY Maths Concours ──────────────────────────────────────────────
  {
    id: 'concours-enspy-maths-2023',
    title: "Concours ENSPY 2023 — Épreuve de Mathématiques (1ère année)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Ingénierie',
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Algèbre Bilinéaire & Formes Quadratiques",
        points: "6 points",
        context: "Soit E = R^4 muni de sa base canonique B = (e1, e2, e3, e4). On considère la forme quadratique q définie sur E par : q(x) = x1^2 + 2x2^2 + 5x3^2 + x4^2 + 2x1*x2 + 4x2*x3 - 2x1*x4.",
        items: [
          {
            lead: "1. Décomposition en carrés de Gauss et classification :",
            sub: [
              "a) Appliquer l'algorithme de réduction de Gauss à la forme quadratique q pour l'écrire sous forme d'une somme algébrique de carrés de formes linéaires indépendantes.",
              "b) Déterminer le rang et la signature (p, q) de Sylvester de la forme quadratique q. La forme q est-elle définie positive, semi-définie ou dégénérée ?",
              "c) Déterminer une base q-orthonormée de E et donner l'expression du cône isotrope C(q) = {x dans E | q(x) = 0}."
            ]
          },
          {
            lead: "2. Réduction d'endomorphisme et sous-espaces propres :",
            sub: [
              "a) Soit la matrice M(m) associée au système avec m paramètre réel. Calculer le polynôme caractéristique P(lambda) = det(M - lambda*I).",
              "b) Discuter selon les valeurs de m de la diagonalisabilité de M(m) sur le corps des réels R."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Analyse & Calcul Intégral Impropre",
        points: "7 points",
        context: "On s'intéresse à l'intégrale de Dirichlet I = Integrale de 0 a +infini de (sin(t) / t) dt et à la fonction paramétrique F(x) = Integrale de 0 a +infini de (e^(-x*t) * sin(t) / t) dt définie pour x >= 0.",
        items: [
          {
            lead: "1. Étude de convergence de l'intégrale de Dirichlet :",
            sub: [
              "a) Montrer que l'intégrale I n'est pas absolument convergente (étudier l'intégrale de |sin(t)|/t sur chaque intervalle [k*pi, (k+1)*pi]).",
              "b) En intégrant par parties sur [1, A], prouver que l'intégrale impropre converge au sens de Riemann lorsque A tend vers +infini."
            ]
          },
          {
            lead: "2. Dérivation sous le signe intégral et valeur exacte :",
            sub: [
              "a) Justifier que F est dérivable sur ]0, +infini[ et calculer F'(x) explicitement sous forme d'une fraction rationnelle simple.",
              "b) En déduire l'expression de F(x) à une constante additive près. Calculer la limite de F(x) lorsque x tend vers +infini.",
              "c) En déduire la valeur exacte de l'intégrale de Dirichlet I = F(0) = pi / 2."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Problème d'Ingénierie - Séries de Fourier",
        points: "7 points",
        context: "Modélisation de la diffusion thermique dans une barre conductrice de l'ENSPY. La température initiale à t=0 est une fonction 2*pi-périodique paire f définie sur [-pi, pi] par f(x) = pi - |x|.",
        items: [
          {
            lead: "1. Analyse harmonique du signal thermique :",
            sub: [
              "a) Calculer les coefficients de Fourier a_0 et a_n de la fonction f pour tout entier n >= 1 (justifier l'annulation des b_n).",
              "b) Énoncer le théorème de Dirichlet. Justifier son application à f et écrire la série de Fourier convergeant vers f(x)."
            ]
          },
          {
            lead: "2. Applications et calculs de sommes remarquables :",
            sub: [
              "a) En évaluant la série de Fourier en x = 0, démontrer rigoureusement que Somme(n=0 a +infini, 1 / (2n+1)^2) = pi^2 / 8.",
              "b) En appliquant la formule de Parseval à f, calculer la somme de la série harmonique d'ordre 4 : Somme(n=1 a +infini, 1 / n^4) = pi^4 / 90.",
              "c) En déduire le profil d'atténuation temporelle u(x, t) = Somme c_n * e^(-n^2 * D * t) * cos(n*x)."
            ]
          }
        ]
      }
    ]
  },

  // ─── 2. ENSPY Physique Concours ───────────────────────────────────────────
  {
    id: 'concours-enspy-physique-2023',
    title: "Concours ENSPY 2023 — Épreuve de Physique (1ère année)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Électrique & Télécoms',
    subject: 'Mécanique du Point & Électromagnétisme',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Mécanique Rationnelle & Oscillateurs Amortis",
        points: "6 points",
        context: "Un capteur accéléromètre est modélisé par une masse m = 0.25 kg fixée à un ressort horizontal de raideur k = 100 N/m et soumise à un frottement visqueux fluide f = -h*v (h = 0.5 kg/s).",
        items: [
          {
            lead: "1. Équation différentielle du mouvement libre :",
            sub: [
              "a) Établir dans le référentiel galiléen du laboratoire l'équation différentielle régissant l'élongation x(t).",
              "b) Exprimer la pulsation propre omega_0, le facteur d'amortissement lambda et le facteur de qualité Q du système. Quel est le régime d'oscillation ?",
              "c) Calculer la pseudo-période T et le décrément logarithmique delta = ln(x(t) / x(t + T))."
            ]
          },
          {
            lead: "2. Régime forcé et résonance mécanique :",
            sub: [
              "a) Le support subit une vibration s(t) = S0*cos(omega*t). Exprimer l'amplitude complexe Xm(omega) de la masse.",
              "b) Déterminer la pulsation de résonance en amplitude omega_r et calculer la surtension à la résonance."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Électromagnétisme & Induction de Faraday",
        points: "7 points",
        context: "Deux rails conducteurs horizontaux parallèles de résistance négligeable, distants de L = 20 cm, sont plongés dans un champ magnétique vertical uniforme B = 0.5 T ascendant. Une barre de masse m = 50 g glisse sans frottement.",
        items: [
          {
            lead: "1. Loi de Faraday et force de Laplace :",
            sub: [
              "a) La barre est lancée à t=0 avec une vitesse initiale v0 = 4 m/s. Le circuit est fermé par une résistance R = 2 Ohms. Calculer la fem induite e(t).",
              "b) Déterminer le sens du courant induit d'après la loi de Lenz. Exprimer l'intensité i(t) en fonction de B, L, R et de la vitesse v(t).",
              "c) Déterminer la force électromagnétique de Laplace agissant sur la barre et établir l'équation différentielle sur v(t)."
            ]
          },
          {
            lead: "2. Bilan d'énergie et temps de freinage :",
            sub: [
              "a) Résoudre v(t) en faisant apparaître la constante de temps tau = m*R / (B^2 * L^2). Calculer numériquement tau.",
              "b) Calculer l'énergie mécanique initiale et l'énergie totale dissipée par effet Joule dans la résistance. Conclure."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Optique Ondulatoire & Interférences",
        points: "7 points",
        context: "Un dispositif interférentiel de type fentes d'Young est éclairé par une source laser hélium-néon émettant à la longueur d'onde lambda = 632.8 nm. L'écart entre fentes est a = 0.4 mm, l'écran est à D = 2.0 m.",
        items: [
          {
            lead: "1. Calcul de l'interfrange et profil d'intensité :",
            sub: [
              "a) Exprimer la différence de marche delta(x) en un point d'abscisse x de l'écran. En déduire le déphasage phi(x).",
              "b) Exprimer l'éclairement I(x) sur l'écran et calculer l'interfrange i = lambda*D / a.",
              "c) Combien de franges brillantes observe-t-on dans un intervalle central de largeur 2 cm ?"
            ]
          },
          {
            lead: "2. Diffraction par une fente de largeur finie :",
            sub: [
              "a) On tient compte de la largeur e = 0.08 mm de chaque fente. Écrire la fonction d'intensité modulée par le terme de diffraction.",
              "b) Déterminer l'ordre des franges d'interférence qui s'annulent sous le premier minimum de diffraction."
            ]
          }
        ]
      }
    ]
  },

  // ─── 3. ENSPY INF 101 SN ──────────────────────────────────────────────────
  {
    id: 'sn-enspy-inf101-2024',
    title: "Session Normale (SN) — INF 101 : Algorithmique et Langage C (Niveau 1 Ingénieur)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Logiciel',
    subject: 'Algorithmique et Programmation C',
    level: 'Niveau 1 Ingénieur',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Exercice 1 : Arithmétique des Pointeurs et Modèle Mémoire",
        points: "5 points",
        context: "Compréhension fine de l'organisation mémoire (Stack, Heap, Data, BSS) et de l'arithmétique des pointeurs sous architecture 64 bits.",
        codeBlock: "int tab[5] = {10, 25, 42, 77, 99};\nint *ptr = tab + 2;\nprintf(\"%d, %d, %ld\\n\", *ptr, *(ptr - 1), ptr - tab);",
        items: [
          {
            lead: "1. Analyse du fragment de code ci-dessus :",
            sub: [
              "a) Qu'affiche exactement le fragment de code C lors de son exécution sous Linux 64 bits ? Justifier chaque valeur.",
              "b) Expliquer la différence entre static int count = 0 déclaré à l'intérieur d'une fonction et int count = 0 (automatique).",
              "c) Pourquoi l'expression sizeof(ptr) retourne-t-elle 8 alors que sizeof(tab) retourne 20 ?"
            ]
          },
          {
            lead: "2. Débogage de fuite mémoire (Valgrind) :",
            sub: [
              "a) Identifier l'erreur fatale dans : char *s = malloc(10); strcpy(s, \"Campus360\"); free(s); printf(\"%s\", s);",
              "b) Expliquer ce qu'est un déréférencement de pointeur pendant (dangling pointer) et comment l'éviter systématiquement."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 2 : Structures de Données Dynamiques - Liste Doublement Chaînée",
        points: "7 points",
        context: "Conception du moteur d'ordonnancement de tâches temps réel pour un automate industriel développé au laboratoire de génie informatique de l'ENSPY.",
        codeBlock: "typedef struct Task {\n    int id;\n    char name[32];\n    int priority;\n    struct Task *prev;\n    struct Task *next;\n} Task;\n\ntypedef struct Scheduler {\n    Task *head;\n    Task *tail;\n    int count;\n} Scheduler;",
        items: [
          {
            lead: "1. Fonctions de gestion de la liste chaînée :",
            sub: [
              "a) Écrire la fonction Task* create_task(int id, const char *name, int prio) avec allocation dynamique et vérification de NULL.",
              "b) Écrire la fonction void insert_sorted(Scheduler *s, Task *t) insérant la tâche par ordre décroissant de priorité.",
              "c) Écrire la fonction Task* pop_highest_priority(Scheduler *s) qui extrait la tâche en tête de liste et met à jour les pointeurs.",
              "d) Écrire la fonction void free_scheduler(Scheduler *s) assurant la libération intégrale sans mémoire orpheline."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 3 : Arbres Binaires de Recherche (ABR) & Dictionnaire",
        points: "8 points",
        context: "Indexation lexicographique des matricules d'étudiants de l'ENSPY pour une recherche en temps O(log n).",
        items: [
          {
            lead: "1. Définition et insertion dans l'ABR :",
            sub: [
              "a) Définir la structure ABRNode contenant le matricule (chaîne de 12 caractères), la moyenne (float) et les fils gauche/droit.",
              "b) Écrire en langage C la fonction récursive ABRNode* insert_node(ABRNode *root, const char *mat, float moy).",
              "c) Écrire la fonction ABRNode* search_node(ABRNode *root, const char *mat) retournant le pointeur vers l'étudiant ou NULL."
            ]
          },
          {
            lead: "2. Parcours et propriétés de l'arbre :",
            sub: [
              "a) Écrire la fonction void print_inorder(ABRNode *root) affichant tous les matricules par ordre alphabétique croissant.",
              "b) Écrire la fonction int tree_height(ABRNode *root) calculant récursivement la hauteur maximale de l'arbre.",
              "c) Quel est le pire cas de complexité d'un ABR et comment un arbre AVL permet-il de garantir une complexité logarithmique ?"
            ]
          }
        ]
      }
    ]
  },

  // ─── 4. FMSB Concours Biologie ────────────────────────────────────────────
  {
    id: 'concours-fmsb-biologie-2023',
    title: "Concours National Médecine 2023 — Épreuve de Biologie & SVT (FMSB Yaoundé)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Biologie Cellulaire & Moléculaire",
        points: "6 points",
        context: "Structure et thermodynamique membranaire de l'érythrocyte humain et homéostasie hydro-électrolytique.",
        items: [
          {
            lead: "1. Architecture membranaire et perméabilité :",
            sub: [
              "a) Décrire le modèle de la mosaïque fluide de Singer et Nicolson. Quel est le rôle des radeaux lipidiques (lipid rafts) riches en cholestérol et sphingomyélines ?",
              "b) Comparer le transport facilité du glucose par GLUT-1 et le transport actif secondaire du glucose par SGLT-1 au niveau des entérocytes.",
              "c) Exposer le mécanisme enzymatique et le bilan stoechiométrique de la pompe Na+/K+ ATPase dépendante de l'ATP."
            ]
          },
          {
            lead: "2. Régulation du cycle cellulaire et oncogenèse :",
            sub: [
              "a) Décrire le rôle du complexe Cycline B / CDK1 (MPF) dans le déclenchement de la mitose.",
              "b) Expliquer comment la protéine p53 agit en tant que 'gardien du génome' lors de cassures double brin de l'ADN."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Génétique Humaine & Drépanocytose au Cameroun",
        points: "7 points",
        context: "La drépanocytose est une hémoglobinopathie autosomique récessive due à une mutation ponctuelle au codon 6 du gène HBB (chromosome 11p15.5) substituant l'acide glutamique par la valine (HbS).",
        items: [
          {
            lead: "1. Transmission génétique et conseil génétique :",
            sub: [
              "a) Un couple camerounais se présente en consultation prémaritale. L'homme est phénotypiquement sain mais hétérozygote AS, la femme est également AS. Quelle est la probabilité d'avoir un enfant atteint SS à chaque grossesse ?",
              "b) Déterminer la probabilité que sur une fratrie de 3 enfants, aucun ne soit atteint de drépanocytose majeure.",
              "c) Pourquoi l'allèle HbS a-t-il été maintenu à une fréquence élevée (supérieure à 20%) dans le bassin forestier du Cameroun ? Définir l'avantage hétérozygote face au paludisme à Plasmodium falciparum."
            ]
          },
          {
            lead: "2. Diagnostic moléculaire et électrophorèse :",
            sub: [
              "a) Expliquer le principe de la migration électrophorétique de l'hémoglobine à pH alcalin (8.6) sur acétate de cellulose.",
              "b) Pourquoi l'hémoglobine HbS migre-t-elle moins vite vers l'anode que l'hémoglobine normale HbA ?"
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Physiologie Endocrinienne & Immunologie",
        points: "7 points",
        context: "Régulation neuro-hormonale de la glycémie et réponse immunitaire face aux antigènes bactériens et viraux.",
        items: [
          {
            lead: "1. Axe endocrinien insuline-glucagon :",
            sub: [
              "a) Préciser les types cellulaires des îlots de Langerhans sécrétant l'insuline et le glucagon, et leurs effets métaboliques respectifs.",
              "b) Décrire la cascade de phosphorylation intracellulaire déclenchée par la liaison de l'insuline à son récepteur tyrosine kinase (IRS, PI3K, Akt, translocation de GLUT-4).",
              "c) Différencier sur les plans étiologique et physiopathologique le diabète de type 1 du diabète de type 2."
            ]
          },
          {
            lead: "2. Immunologie clinique :",
            sub: [
              "a) Décrire les étapes de la sélection clonale des lymphocytes T dans le thymus (sélection positive corticale et négative médullaire).",
              "b) Définir la commutation isotypique des immunoglobulines (passage d'IgM à IgG) et le rôle des lymphocytes T CD4+ auxiliaires (Th2)."
            ]
          }
        ]
      }
    ]
  },

  // ─── 5. FMSB ANAT 101 SN ──────────────────────────────────────────────────
  {
    id: 'sn-fmsb-anat101-2024',
    title: "Session Normale (SN) — ANAT 101 : Anatomie Générale & Ostéologie (Niveau 1 Médecine)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Anatomie & Embryologie',
    level: 'Niveau 1 Médecine',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Ostéologie & Arthrologie du Membre Thoracique",
        points: "6 points",
        context: "Étude morphologique de la ceinture scapulaire et du squelette du bras chez le sujet adulte.",
        items: [
          {
            lead: "1. Morphologie de l'humérus et de la scapula :",
            sub: [
              "a) Décrire l'épiphyse proximale de l'humérus : tête humérale, col anatomique, tubercule majeur (trochiter), tubercule mineur (trochin) et sillon intertuberculaire (gouttière bicipitale).",
              "b) Quels muscles de la coiffe des rotateurs s'insèrent respectivement sur les 3 facettes du tubercule majeur ?",
              "c) Définir le col chirurgical de l'humérus et indiquer la structure vasculo-nerveuse majeure qui lui est intimement liée."
            ]
          },
          {
            lead: "2. Articulation gléno-humérale (scapulo-humérale) :",
            sub: [
              "a) Préciser le type d'articulation (énarthrose ou sphéroïde) et ses degrés de liberté dans l'espace.",
              "b) Décrire le rôle biomécanique du labrum (bourrelet glénoïdien) et des ligaments gléno-huméraux supérieur, moyen et inférieur."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Myologie & Systématisation du Plexus Brachial",
        points: "7 points",
        context: "Innervation motrice et sensitive du membre supérieur à partir des rameaux ventraux des racines rachidiennes cervicales et thoraciques.",
        items: [
          {
            lead: "1. Constitution anatomique du plexus brachial :",
            sub: [
              "a) Énumérer les 5 racines rachidiennes constituant le plexus brachial (C5, C6, C7, C8, T1).",
              "b) Détailler la formation des 3 troncs primaires (supérieur, moyen, inférieur) et des 3 faisceaux (latéral, médial, postérieur) par rapport à l'artère axillaire.",
              "c) Préciser l'origine radiculaire et le faisceau de provenance des 5 grandes branches terminales : nerf musculocutané, nerf médian, nerf ulnaire, nerf radial, nerf axillaire."
            ]
          },
          {
            lead: "2. Topographie des loges musculaires du bras :",
            sub: [
              "a) Décrire les insertions, l'innervation et l'action principale du muscle biceps brachial et du muscle brachial antérieur.",
              "b) Quelle est l'innervation motrice exclusive de la loge postérieure du bras (muscle triceps brachial) ?"
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Cas Clinique d'Urgence & Anatomie Appliquée",
        points: "7 points",
        context: "Cas clinique réel d'accidenté de la circulation reçu au pavillon des urgences de l'Hôpital Central de Yaoundé.",
        items: [
          {
            lead: "1. Observation clinique :",
            sub: [
              "Monsieur T., 28 ans, livreur à moto à Yaoundé, chute sur son bras droit. La radiographie met en évidence une fracture spiroïde déplacée du tiers moyen de la diaphyse humérale.",
              "À l'examen clinique, le patient présente une impossibilité d'étendre le poignet et les premières phalanges des doigts, réalisant l'attitude de 'main tombante en col de cygne'. Il signale également une anesthésie de la face dorsale de la première commissure interdigitale."
            ]
          },
          {
            lead: "2. Questions d'évaluation anatomo-clinique :",
            sub: [
              "a) Quel est le nerf lésé au niveau du sillon du nerf radial (gouttière de torsion) de l'humérus ?",
              "b) Justifier la sémiologie motrice observée au niveau de l'avant-bras et de la main en rappelant les muscles énervés.",
              "c) Quel vaisseau artériel chemine de concert avec ce nerf dans le sillon spiral et risque d'être comprimé ou lacéré par les fragments osseux ?",
              "d) Si la fracture avait siégé au niveau du col chirurgical, quel autre nerf et quelle anomalie motrice (paralysie du deltoïde) aurions-nous constatés ?"
            ]
          }
        ]
      }
    ]
  },

  // ─── 6. UY1 INF 111 SN ────────────────────────────────────────────────────
  {
    id: 'sn-uy1-inf111-2024',
    title: "Session Normale (SN) — INF 111 : Algorithmique et Structures de Données 1 (Licence 1)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algorithmique et Programmation C',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Exercice 1 : Preuve d'Invariants de Boucle et Complexité",
        points: "6 points",
        context: "Formalisation de la correction partielle et totale d'algorithmes itératifs par la méthode de Hoare.",
        items: [
          {
            lead: "1. Algorithme d'Euclide pour le PGCD :",
            sub: [
              "On considère l'algorithme suivant : Tant que b != 0 faire : r = a mod b ; a = b ; b = r ; FinTantQue ; Retourner a.",
              "a) Énoncer la propriété d'invariant de boucle liant PGCD(a, b) aux valeurs initiales (a0, b0).",
              "b) Démontrer par induction que cet invariant est préservé à chaque itération de la boucle.",
              "c) Prouver la terminaison de l'algorithme en définissant un variant de boucle strictement décroissant et minoré par 0."
            ]
          },
          {
            lead: "2. Notations asymptotiques de Landau :",
            sub: [
              "a) Donner la définition formelle de f(n) = O(g(n)), f(n) = Omega(g(n)) et f(n) = Theta(g(n)).",
              "b) Classer par ordre croissant de complexité asymptotique : n^2, 2^n, n*log(n), n!, log(n), n^(3/2)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 2 : Algorithmes de Tri Comparatifs et Analyse",
        points: "7 points",
        context: "Conception, pseudo-code et analyse mathématique de la complexité des algorithmes de tri diviser pour régner.",
        items: [
          {
            lead: "1. Algorithme de Tri Fusion (Merge Sort) :",
            sub: [
              "a) Écrire en pseudo-code rigoureux la procédure FUSION(T, debut, milieu, fin) fusionnant deux sous-tableaux triés.",
              "b) Écrire la fonction récursive TRI_FUSION(T, debut, fin).",
              "c) Établir l'équation de récurrence de la complexité temporelle T(n) = 2*T(n/2) + Theta(n).",
              "d) À l'aide du théorème maître (Master Theorem), résoudre l'équation et prouver que T(n) = Theta(n*log n) dans le pire, meilleur et moyen cas."
            ]
          },
          {
            lead: "2. Comparaison avec le Tri Rapide (QuickSort) :",
            sub: [
              "a) Quel est le pire cas du Tri Rapide et dans quelle configuration de tableau initial survient-il ?",
              "b) Comment le choix d'un pivot aléatoire ou de la médiane des trois permet-il d'éviter ce pire cas ?"
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 3 : Piles, Files & Évaluation d'Expressions Postfixées",
        points: "7 points",
        context: "Implémentation d'une structure de Pile (LIFO) pour l'évaluation d'expressions arithmétiques en notation polonaise inverse (NPI).",
        items: [
          {
            lead: "1. Implémentation de la pile par liste simplement chaînée :",
            sub: [
              "a) Définir les types structurés Element (valeur entière, pointeur suivant) et Pile (pointeur sommet).",
              "b) Écrire l'algorithme empiler(P, valeur) avec allocation dynamique et dépiler(P) retournant l'entier dépilé.",
              "c) Quelle est la complexité en temps des opérations empiler et dépiler ? Justifier."
            ]
          },
          {
            lead: "2. Évaluation de l'expression NPI :",
            sub: [
              "On donne la chaîne postfixée suivante : '12 4 / 5 + 3 * 6 -'.",
              "a) Dérouler pas à pas l'état de la pile au fur et à mesure de la lecture des jetons de l'expression.",
              "b) Donner le résultat final de l'évaluation.",
              "c) Écrire l'algorithme complet evaluer_NPI(chaine) utilisant les primitives de la pile."
            ]
          }
        ]
      }
    ]
  },

  // ─── 7. UY1 INF 211 SN ────────────────────────────────────────────────────
  {
    id: 'sn-uy1-inf211-2024',
    title: "Session Normale (SN) — INF 211 : Bases de Données Relationnelles et SQL (Licence 2)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Bases de Données (SQL)',
    level: 'Licence 2 (Niveau 2)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Exercice 1 : Conception MERISE & Schéma Relationnel",
        points: "6 points",
        context: "Système de gestion des soutenances de mémoires à l'Université de Yaoundé I. Des jurys composés d'enseignants évaluent des étudiants soutenant sur un thème validé par un département.",
        items: [
          {
            lead: "1. Modèle Conceptuel des Données (MCD) :",
            sub: [
              "a) Identifier les entités (Étudiant, Enseignant, Soutenance, Département) et leurs propriétés.",
              "b) Définir les associations 'Présider', 'Rapporter', 'Examiner' et justifier les cardinalités min/max (0,1), (1,1), (1,n).",
              "c) Préciser les règles de gestion traduisant l'obligation qu'un président de jury ait au moins le grade de Maître de Conférences."
            ]
          },
          {
            lead: "2. Passage au Modèle Logique Relationnel (MLD) :",
            sub: [
              "a) Écrire le schéma relationnel complet en soulignant les clés primaires et en préfixant d'un '#' les clés étrangères.",
              "b) Vérifier le respect de l'intégrité référentielle sur la table Soutenance."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 2 : Théorie de la Normalisation & Formes Normales",
        points: "7 points",
        context: "Soit la relation R(NumEtud, Nom, CodeUE, TitreUE, CodeEnseignant, NomEnseignant, Note, Salle) et l'ensemble F des dépendances fonctionnelles : DF1: NumEtud -> Nom ; DF2: CodeUE -> TitreUE, CodeEnseignant ; DF3: CodeEnseignant -> NomEnseignant ; DF4: NumEtud, CodeUE -> Note ; DF5: CodeUE, Salle -> NumEtud.",
        items: [
          {
            lead: "1. Recherche des clés candidates de R :",
            sub: [
              "a) Calculer la fermeture de l'attribut {NumEtud, CodeUE} par rapport à F.",
              "b) Montrer que {NumEtud, CodeUE, Salle} contient une clé candidate et déterminer toutes les clés candidates de R."
            ]
          },
          {
            lead: "2. Normalisation progressive en 3FN et BCNF :",
            sub: [
              "a) La relation R est-elle en 2ème Forme Normale (2FN) ? Justifier en citant les dépendances partielles.",
              "b) La relation R est-elle en 3ème Forme Normale (3FN) ? Identifier les dépendances transitives.",
              "c) Proposer une décomposition de R en relations normalisées 3FN préservant toutes les dépendances et sans perte d'information."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 3 : Requêtes SQL Avancées & Algèbre Relationnelle",
        points: "7 points",
        context: "Écriture de requêtes d'interrogation et de statistiques universitaires sous PostgreSQL.",
        items: [
          {
            lead: "1. Algèbre Relationnelle :",
            sub: [
              "a) Exprimer par les opérateurs relationnels (sélection, projection, jointure naturelle) la liste des étudiants ayant obtenu une note >= 16 dans l'UE 'INF 211'.",
              "b) Exprimer par l'opérateur de division relationnelle la liste des étudiants ayant validé toutes les UE du semestre 3."
            ]
          },
          {
            lead: "2. Requêtes SQL complexes :",
            sub: [
              "a) Écrire la requête SQL affichant le matricule, nom, et moyenne générale pondérée par crédits de chaque étudiant, classée par ordre décroissant de moyenne.",
              "b) Écrire la requête SQL retournant les UE ayant un taux d'échec (note < 10) supérieur à 40% des inscrits (utiliser HAVING count(*)...).",
              "c) Écrire un trigger PostgreSQL empêchant d'attribuer une note inférieure à 0 ou supérieure à 20 lors d'un INSERT ou UPDATE."
            ]
          }
        ]
      }
    ]
  },

  // ─── 8. UY1 MAT 111 SN ────────────────────────────────────────────────────
  {
    id: 'sn-uy1-mat111-2024',
    title: "Session Normale (SN) — MAT 111 : Algèbre Linéaire et Espaces Vectoriels (Licence 1)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algèbre Linéaire',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Exercice 1 : Espaces Vectoriels, Sous-Espaces & Sommes Directes",
        points: "6 points",
        context: "Soit E = R^4 et les deux sous-ensembles : F = {(x,y,z,t) dans R^4 | x + 2y - z = 0 et y + z - 2t = 0} et G = Vect((1, 0, 1, 0), (0, 1, 0, 1)).",
        items: [
          {
            lead: "1. Propriétés et bases des sous-espaces F et G :",
            sub: [
              "a) Démontrer rigoureusement que F est un sous-espace vectoriel de E.",
              "b) Déterminer une base et la dimension de F. F et G ont-ils la même dimension ?",
              "c) Déterminer une base et la dimension de l'intersection F inter G."
            ]
          },
          {
            lead: "2. Formule de Grassmann et somme :",
            sub: [
              "a) Appliquer la formule de Grassmann pour calculer la dimension de F + G.",
              "b) La somme F + G est-elle directe ? F et G sont-ils supplémentaires dans R^4 ? Justifier."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 2 : Applications Linéaires & Théorème du Rang",
        points: "7 points",
        context: "Soit f l'application linéaire de R^3 dans R^3 définie par f(x, y, z) = (2x - y + z, x + 2y - z, 3x + y).",
        items: [
          {
            lead: "1. Matrice associée et étude du noyau :",
            sub: [
              "a) Écrire la matrice A de f dans la base canonique de R^3.",
              "b) Déterminer une équation cartésienne et une base du noyau Ker(f). L'application f est-elle injective ?",
              "c) Quel est le rang de l'application f ? Énoncer le théorème du rang et vérifier son exactitude pour f."
            ]
          },
          {
            lead: "2. Image et projecteur :",
            sub: [
              "a) Déterminer une base de Im(f). f est-elle surjective ?",
              "b) Montrer que Ker(f) et Im(f) sont en somme directe dans R^3.",
              "c) Déterminer la matrice dans la base canonique du projecteur p sur Im(f) parallèlement à Ker(f)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Exercice 3 : Systèmes Linéaires & Inversion Matricielle (Gauss-Jordan)",
        points: "7 points",
        context: "Résolution d'un système linéaire à paramètre réel m et inversion d'une matrice carrée d'ordre 3.",
        items: [
          {
            lead: "1. Système de Cramer paramétrique :",
            sub: [
              "Soit le système (S) : x + y + m*z = 1 ; x + m*y + z = 1 ; m*x + y + z = 1.",
              "a) Calculer le déterminant Delta(m) de la matrice du système. Pour quelles valeurs de m le système est-il de Cramer ?",
              "b) Résoudre le système lorsque Delta(m) != 0 en utilisant les formules de Cramer ou la méthode du pivot de Gauss.",
              "c) Discuter de l'existence et du nombre de solutions dans les cas particuliers m = 1 et m = -2."
            ]
          },
          {
            lead: "2. Inversion matricielle :",
            sub: [
              "Pour m = 0, inverser la matrice A(0) par la méthode des opérations élémentaires de lignes de Gauss-Jordan [A | I3]."
            ]
          }
        ]
      }
    ]
  },

  // ─── 9. UY2 ECO 111 SN ────────────────────────────────────────────────────
  {
    id: 'sn-uy2-eco111-2024',
    title: "Session Normale (SN) — ECO 111 : Introduction à la Microéconomie (Licence 1)",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Microéconomie',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Théorie des Préférences & Choix du Consommateur",
        points: "6 points",
        context: "Analyse axiomatique des choix du consommateur rationnel en environnement de certitude.",
        items: [
          {
            lead: "1. Axiomes de la rationalité et courbes d'indifférence :",
            sub: [
              "a) Énoncer et expliciter les trois axiomes fondamentaux des préférences : complétude, transitivité et non-satiété (monotonicité).",
              "b) Définir géométriquement et économiquement une courbe d'indifférence. Pourquoi deux courbes d'indifférence ne peuvent-elles jamais se couper ?",
              "c) Définir le Taux Marginal de Substitution (TMS_x1,x2) et montrer qu'il est égal au rapport des utilités marginales Um1 / Um2."
            ]
          },
          {
            lead: "2. Contrainte budgétaire :",
            sub: [
              "a) Écrire l'équation de la droite de budget pour deux biens de prix p1 et p2 et un revenu nominal R.",
              "b) Déterminer la pente de la droite de budget et expliquer ce qu'elle représente sur le marché."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Résolution Analytique de l'Équilibre du Consommateur",
        points: "7 points",
        context: "Un étudiant de l'Université de Yaoundé II consacre son budget mensuel R = 60 000 FCFA à la consommation de deux biens : le transport urbain x1 (p1 = 500 FCFA) et l'alimentation x2 (p2 = 1 000 FCFA). Ses préférences sont modélisées par la fonction d'utilité Cobb-Douglas : U(x1, x2) = (x1)^0.4 * (x2)^0.6.",
        items: [
          {
            lead: "1. Optimisation sous contrainte par le multiplicateur de Lagrange :",
            sub: [
              "a) Poser le programme de maximisation du consommateur et écrire le Lagrangien L(x1, x2, lambda).",
              "b) Établir les Conditions du Premier Ordre (CPO) par dérivation partielle par rapport à x1, x2 et lambda.",
              "c) Démontrer la condition d'optimalité TMS = p1 / p2."
            ]
          },
          {
            lead: "2. Détermination du panier optimal :",
            sub: [
              "a) Calculer les quantités optimales consommées x1* et x2*. Calculer le niveau d'utilité maximale atteint.",
              "b) Déduire l'expression générale des fonctions de demande marshalliennes x1*(p1, p2, R) et x2*(p1, p2, R)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Élasticités & Décomposition de Slutsky",
        points: "7 points",
        context: "Suite à une mesure fiscale sur les carburants au Cameroun, le prix du transport passe à p1' = 800 FCFA.",
        items: [
          {
            lead: "1. Calcul des élasticités de la demande :",
            sub: [
              "a) Calculer l'élasticité-prix directe de la demande du bien 1. S'agit-il d'une demande élastique ou inélastique ?",
              "b) Calculer l'élasticité-revenu de chaque bien. Conclure sur la nature des biens (normaux, supérieurs, ou inférieurs).",
              "c) Calculer l'élasticité-prix croisée. Les deux biens sont-ils substituables ou complémentaires ?"
            ]
          },
          {
            lead: "2. Effet de substitution et effet de revenu selon Slutsky :",
            sub: [
              "a) Calculer le revenu compensé R' permettant à l'étudiant d'acheter le panier initial au nouveau vecteur de prix (p1', p2).",
              "b) Calculer le panier intermédiaire x^int et décomposer la variation totale de consommation Delta(x1) en Effet de Substitution (ES) et Effet de Revenu (ER).",
              "c) Représenter graphiquement cette décomposition sur un diagramme clair."
            ]
          }
        ]
      }
    ]
  },

  // ─── 10. UY2 CPT 111 SN ───────────────────────────────────────────────────
  {
    id: 'sn-uy2-cpt111-2024',
    title: "Session Normale (SN) — CPT 111 : Comptabilité Générale I - SYSCOHADA (Licence 1)",
    university: 'Université de Douala',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Comptabilité Générale (SYSCOHADA)',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Principes Fondamentaux de l'Acte Uniforme OHADA",
        points: "5 points",
        context: "Cadre conceptuel du Système Comptable OHADA Révisé (SYSCOHADA) en vigueur dans les 17 États membres.",
        items: [
          {
            lead: "1. Principes comptables et conventions :",
            sub: [
              "a) Énoncer et définir 4 principes comptables fondamentaux du SYSCOHADA : principe de prudence, continuité de l'exploitation, coût historique, spécialisation des exercices.",
              "b) Expliquer la règle de la partie double et démontrer l'égalité fondamentale du bilan : Actif = Capitaux Propres + Passif Externe.",
              "c) Décrire l'architecture des classes de comptes du plan comptable général OHADA (Comptes de bilan : classes 1 à 5 ; Comptes de gestion : classes 6 à 8)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Grand Cas Pratique d'Enregistrement au Journal Général",
        points: "8 points",
        context: "L'entreprise industrielle camerounaise 'SANAGA AGRO SARL' a réalisé les opérations suivantes au cours du mois de novembre 2023 (TVA au taux en vigueur de 19.25%) :",
        table: {
          headers: ["Date", "Opération & Pièce justificative", "Montant Brut HT", "Conditions de règlement"],
          rows: [
            ["03/11", "Facture V-101 : Vente de marchandises", "5 000 000 F", "Remise 5%, Escompte 2%, Chèque bancaire"],
            ["08/11", "Facture A-45 : Achat de matières premières", "3 200 000 F", "Frais de port 150 000 F, Règlement à 60 jours"],
            ["14/11", "Facture d'Avoir AV-12 accordée au client", "400 000 F", "Retour de marchandises non conformes"],
            ["22/11", "Acquisition machine industrielle (Fact. E-8)", "8 500 000 F", "Installation 500 000 F, Virement bancaire 50%"],
            ["28/11", "Paiement salaires bruts du personnel", "4 200 000 F", "Retenues CNPS 4.2%, IRPP 10%, Solde par virement"]
          ]
        },
        items: [
          {
            lead: "1. Travail à faire pour la Partie II :",
            sub: [
              "a) Établir le décompte complet de la facture de vente V-101 (Net commercial, Escompte financier, Net financier, TVA 19.25%, Net à payer TTC).",
              "b) Présenter les écritures comptables complètes au Journal général en précisant les numéros de compte à 4 chiffres selon le plan comptable OHADA, les intitulés et les libellés de chaque pièce justificative."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Travaux d'Inventaire, Amortissements & Clôture",
        points: "7 points",
        context: "Régularisations de fin d'exercice au 31 décembre 2023 pour la société SANAGA AGRO SARL.",
        items: [
          {
            lead: "1. Tableau d'amortissement de matériel industriel :",
            sub: [
              "Le matériel acquis le 22/11/2023 pour un coût d'acquisition total de 9 000 000 FCFA HT est amortissable sur 5 ans selon le mode linéaire. Mise en service le 01/12/2023.",
              "a) Calculer la première annuité d'amortissement au 31/12/2023 en appliquant la règle du prorata temporis.",
              "b) Dresser le tableau d'amortissement linéaire prévisionnel sur les 5 exercices.",
              "c) Passer l'écriture de dotation aux amortissements au journal au 31/12/2023 (compte 6813 et 2841)."
            ]
          },
          {
            lead: "2. Régularisation des stocks et bilan de clôture :",
            sub: [
              "Le stock initial de marchandises au 01/01/2023 était de 2 800 000 FCFA. L'inventaire physique au 31/12/2023 valorise le stock final à 3 400 000 FCFA.",
              "a) Passer les écritures d'annulation du stock initial et de constatation du stock final.",
              "b) Quel est l'impact de la variation de stock (compte 6031) sur le résultat d'exploitation ?"
            ]
          }
        ]
      }
    ]
  },

  // ─── 11. UY2 DRT 111 SN ───────────────────────────────────────────────────
  {
    id: 'sn-uy2-drt111-2024',
    title: "Session Normale (SN) — DRT 111 : Droit Constitutionnel et Institutions Politiques (Licence 1)",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Juridiques et Politiques (FSJP)',
    subject: 'Droit Constitutionnel',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Théorie Générale de l'État & Régimes Politiques",
        points: "6 points",
        context: "Sujet au choix du candidat (traiter la Dissertation OU le Commentaire de texte).",
        items: [
          {
            lead: "SUJET 1 : Dissertation Juridique (20 points)",
            sub: [
              "« La séparation des pouvoirs dans la Constitution camerounaise du 18 janvier 1996 révisée : mythe doctrinal ou réalité institutionnelle ? »",
              "Consignes impératives : Le candidat rédigera une introduction structurée en 7 étapes (Accroche, Définition des termes, Évolution historique, Intérêt du sujet, Problématique, Annonce du plan en deux parties I et II avec sous-parties A et B)."
            ]
          },
          {
            lead: "1. Questions préliminaires de cadrage théorique :",
            sub: [
              "a) Exposer la thèse de Montesquieu dans 'De l'esprit des lois' (1748) sur la séparation des pouvoirs législatif, exécutif et judiciaire.",
              "b) Distinguer la séparation stricte des pouvoirs (régime présidentiel) de la séparation souple (régime parlementaire avec mécanismes de responsabilité politique mutuelle)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Analyse Institutionnelle de la Constitution Camerounaise",
        points: "7 points",
        context: "Examen des dispositions des Titres II (Du Pouvoir Exécutif), III (Du Pouvoir Législatif) et V (Du Pouvoir Judiciaire).",
        items: [
          {
            lead: "1. Première Partie du Plan (I) : La consécration formelle d'un équilibre institutionnel",
            sub: [
              "a) Sous-partie A : La rationalisation de l'exécutif bicéphale (Président de la République chef de l'État et Premier Ministre chef du gouvernement).",
              "b) Sous-partie B : L'avènement d'un Parlement bicaméral (Assemblée Nationale et Sénat) doté de compétences législatives et de contrôle de l'action gouvernementale."
            ]
          },
          {
            lead: "2. Deuxième Partie du Plan (II) : La prééminence constitutionnelle substantielle du Chef de l'État",
            sub: [
              "a) Sous-partie A : La concentration des pouvoirs normatifs d'exception (Article 9 : état d'urgence, état d'exception ; Article 28 : législation par voie d'ordonnances).",
              "b) Sous-partie B : Le contrôle de l'appareil juridictionnel (Présidence du Conseil Supérieur de la Magistrature et nomination des membres du Conseil Constitutionnel)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Commentaire de Décision Constitutionnelle",
        points: "7 points",
        context: "SUJET 2 (Alternative) : Commentaire d'un extrait de décision du Conseil Constitutionnel du Cameroun.",
        items: [
          {
            lead: "Texte de la décision soumise à commentaire :",
            sub: [
              "« Considérant qu'aux termes de l'article 46 de la Constitution, le Conseil Constitutionnel est l'organe régulateur du fonctionnement des institutions ; qu'il statue souverainement sur la constitutionnalité des lois, des traités internationaux et veille à la régularité des élections nationales ; Considérant que les actes préparatoires aux scrutins relèvent de la légalité administrative sous réserve du contentieux de l'éligibilité... »"
            ]
          },
          {
            lead: "Questions directrices de commentaire :",
            sub: [
              "a) Dégager la fiche d'arrêt : juridiction, date, faits, procédure antérieure, prétentions des requérants et problème de droit constitutionnel posé.",
              "b) Analyser la portée de la compétence consultative vs juridictionnelle du Conseil Constitutionnel.",
              "c) Discuter de l'autorité absolue de chose jugée qui s'attache aux décisions du Conseil Constitutionnel aux termes de l'article 50 de la Constitution."
            ]
          }
        ]
      }
    ]
  },

  // ─── 12. IUT Douala Concours Maths & Logique ──────────────────────────────
  {
    id: 'concours-iut-douala-2023',
    title: "Concours IUT de Douala 2023 — Épreuve de Mathématiques & Logique (DUT)",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaire',
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie A : Trigonométrie & Nombres Complexes",
        points: "6 points",
        context: "Applications aux signaux alternatifs sinusoïdaux et à la géométrie plane dans le génie industriel.",
        items: [
          {
            lead: "1. Équations trigonométriques :",
            sub: [
              "a) Résoudre dans l'intervalle [0, 2*pi] l'équation : cos(2x) + racine(3)*sin(2x) = racine(2).",
              "b) Transformer l'expression f(t) = 3*cos(omega*t) - 4*sin(omega*t) sous la forme A*cos(omega*t - phi). Calculer l'amplitude A et le déphasage phi."
            ]
          },
          {
            lead: "2. Nombres complexes et impédances :",
            sub: [
              "Soit le nombre complexe Z = (1 + i*racine(3)) / (1 - i).",
              "a) Mettre Z sous forme algébrique a + i*b.",
              "b) Déterminer le module |Z| et un argument principal arg(Z).",
              "c) En déduire les valeurs exactes de cos(7*pi/12) et sin(7*pi/12)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie B : Analyse Fonctionnelle & Optimisation Industrielle",
        points: "7 points",
        context: "Une unité de production de l'IUT de Douala fabrique des pièces métalliques. Le coût total de production en milliers de FCFA est modélisé par C(x) = x^3 - 12x^2 + 60x + 100 pour x dans [1, 10] (x en centaines d'unités).",
        items: [
          {
            lead: "1. Étude des fonctions de coût :",
            sub: [
              "a) Exprimer le coût marginal Cm(x) = C'(x) et le coût moyen CM(x) = C(x) / x.",
              "b) Étudier les variations de la fonction de coût moyen CM(x) sur l'intervalle [1, 10].",
              "c) Déterminer la quantité x_opt qui minimise le coût moyen de production. Vérifier qu'en ce point : Cm(x_opt) = CM(x_opt)."
            ]
          },
          {
            lead: "2. Calcul intégral et surplus du producteur :",
            sub: [
              "a) Si le prix unitaire du marché se fixe à P = 45 milliers de FCFA, calculer la quantité d'équilibre offerte.",
              "b) Calculer le surplus du producteur par intégration de la fonction d'offre entre 0 et la quantité d'équilibre."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie C : Suites Numériques & Raisonnement Logique",
        points: "7 points",
        context: "Modélisation de l'usure d'un parc d'ordinateurs et test de logique algorithmique séquentielle.",
        items: [
          {
            lead: "1. Suite arithmético-géométrique :",
            sub: [
              "Le parc informatique de l'IUT compte initialement 200 postes opérationnels. Chaque année, 10% des machines tombent en panne irréparable et 30 nouveaux postes sont acquis.",
              "a) Exprimer le nombre de machines u_(n+1) en fonction de u_n.",
              "b) Déterminer le point fixe de la suite et expliciter le terme général u_n en fonction de n.",
              "c) Calculer la limite de u_n quand n tend vers +infini. Le parc dépassera-t-il un jour 350 machines ?"
            ]
          },
          {
            lead: "2. Épreuve de logique combinatoire :",
            sub: [
              "Quatre techniciens A, B, C, D doivent intervenir sur 4 serveurs 1, 2, 3, 4. Sachant que A ne peut pas intervenir sur 1 ni sur 3, B intervient obligatoirement sur un serveur pair, et C intervient sur le serveur immédiatement après celui de D :",
              "Déterminer par déduction logique l'affectation unique de chaque technicien à son serveur."
            ]
          }
        ]
      }
    ]
  },

  // ─── 13. IUT GI 101 SN ────────────────────────────────────────────────────
  {
    id: 'sn-iut-gi101-2024',
    title: "Session Normale (SN) — GI 101 : Algorithmique et Langage C (DUT Génie Informatique L1)",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaire',
    subject: 'Algorithmique et Programmation C',
    level: 'DUT 1ère année',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie 1 : Architecture Système, Binaire & Opérateurs Bitwise",
        points: "6 points",
        context: "Programmation bas niveau de microcontrôleurs industriels au laboratoire de génie informatique.",
        codeBlock: "unsigned char reg = 0x3A; // 0011 1010 en binaire\nreg |= (1 << 2);          // Mise a 1 du bit 2\nreg &= ~(1 << 5);         // Mise a 0 du bit 5\nreg ^= 0x01;              // Inversion du bit 0",
        items: [
          {
            lead: "1. Manipulation de registres binaires :",
            sub: [
              "a) Donner la valeur binaire et hexadécimale de la variable 'reg' après l'exécution de chaque ligne de code ci-dessus.",
              "b) Écrire une macro C nommée CHECK_BIT(reg, n) qui retourne 1 si le n-ième bit de reg est à 1 et 0 sinon.",
              "c) Expliquer le principe de la représentation des entiers négatifs en complément à deux sur 8 bits pour la valeur -42."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie 2 : Algorithmes sur Tableaux Dynamiques & Matrices Creuses",
        points: "7 points",
        context: "Représentation compressée CSR (Compressed Sparse Row) pour le calcul haute performance sur cartes embarquées.",
        codeBlock: "typedef struct CSRMatrix {\n    int num_rows;\n    int num_cols;\n    int nnz;        // Nombre d'elements non nuls\n    double *values; // Tableau des valeurs\n    int *col_idx;   // Indices des colonnes\n    int *row_ptr;   // Pointeurs de debut de lignes\n} CSRMatrix;",
        items: [
          {
            lead: "1. Fonctions de manipulation de matrice creuse :",
            sub: [
              "a) Écrire la fonction CSRMatrix* init_csr(int rows, int cols, int nnz) allouant dynamiquement les 3 tableaux.",
              "b) Écrire la fonction void mat_vec_mul(const CSRMatrix *A, const double *x, double *y) réalisant le produit y = A * x.",
              "c) Calculer le gain d'espace mémoire en octets pour une matrice 1000x1000 ne contenant que 5000 éléments non nuls par rapport à un tableau 2D standard double M[1000][1000]."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie 3 : Mini-Projet - Traitement Sécurisé de Trames Réseau",
        points: "7 points",
        context: "Décodage de paquets de capteurs IoT industriels transitant par le port série sous Linux.",
        items: [
          {
            lead: "1. Spécification de la trame :",
            sub: [
              "Format de la trame reçue : '$START,<id_capteur>,<temperature>,<pression>,<checksum>*END'.",
              "Exemple : '$START,CAP_04,28.75,1013.2,8B*END'."
            ]
          },
          {
            lead: "2. Écriture du parser en langage C :",
            sub: [
              "a) Écrire la fonction int parse_frame(const char *raw, char *id, float *temp, float *press) extrayant les données avec vérification de format.",
              "b) Écrire la fonction unsigned char compute_checksum(const char *data) calculant le XOR de tous les octets entre '$START,' et ',<checksum>'.",
              "c) Comment se prémunir contre les failles de dépassement de tampon (buffer overflow) lors de la manipulation de chaînes avec strcpy vs strncpy ?"
            ]
          }
        ]
      }
    ]
  },

  // ─── 14. ENS Yaoundé Maths Concours ───────────────────────────────────────
  {
    id: 'concours-ens-maths-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : Mathématiques (1er Cycle)",
    university: 'ENS Yaoundé',
    faculty: "Sciences de l'Éducation (ENS)",
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Problème I : Arithmétique dans Z & Théorie des Groupes Finis",
        points: "6 points",
        context: "Structures algébriques, anneaux quotients Z/nZ et cryptosystème de Fermat-Euler.",
        items: [
          {
            lead: "1. Théorème des restes chinois :",
            sub: [
              "a) Énoncer le théorème des restes chinois pour des entiers m1, m2, ..., mk deux à deux premiers entre eux.",
              "b) Résoudre dans Z le système de congruences suivant : x = 2 [5] ; x = 4 [7] ; x = 5 [11].",
              "c) Déterminer la plus petite solution strictement positive."
            ]
          },
          {
            lead: "2. Ordre d'un élément et théorème de Lagrange :",
            sub: [
              "a) Calculer l'indicatrice d'Euler phi(35). Énumérer les éléments inversibles du groupe multiplicatif (Z/35Z)*.",
              "b) Déterminer l'ordre multiplicatif de 3 dans (Z/35Z)*. En déduire le reste de la division euclidienne de 3^2023 par 35."
            ]
          }
        ]
      },
      {
        sectionTitle: "Problème II : Polynômes Orthogonaux de Tchebychev",
        points: "7 points",
        context: "Pour tout n entier naturel et tout réel theta, on définit les polynômes de Tchebychev de première espèce par : T_n(cos(theta)) = cos(n*theta).",
        items: [
          {
            lead: "1. Propriétés récurrentes et degrés :",
            sub: [
              "a) Expliciter les polynômes T_0(X), T_1(X), T_2(X) et T_3(X).",
              "b) En utilisant les formules de Simpson sur cos((n+1)theta) + cos((n-1)theta), démontrer la relation de récurrence : T_(n+1)(X) = 2X*T_n(X) - T_(n-1)(X).",
              "c) Démontrer par récurrence que T_n est un polynôme de degré n dont le coefficient dominant est 2^(n-1) pour n >= 1."
            ]
          },
          {
            lead: "2. Zéros et orthogonalité :",
            sub: [
              "a) Déterminer les n racines réelles distinctes de T_n(X) dans l'intervalle ouvert ]-1, 1[.",
              "b) Démontrer que la famille (T_n) est orthogonale sur [-1, 1] pour le produit scalaire à poids <P, Q> = Integrale de -1 a 1 de (P(t)*Q(t) / racine(1 - t^2)) dt."
            ]
          }
        ]
      },
      {
        sectionTitle: "Problème III : Intégrales de Wallis & Formule de Stirling",
        points: "7 points",
        context: "Soit la suite d'intégrales définie pour tout n dans N par : W_n = Integrale de 0 a pi/2 de (sin(t))^n dt.",
        items: [
          {
            lead: "1. Propriétés de la suite de Wallis :",
            sub: [
              "a) Calculer W_0 et W_1. Montrer que la suite (W_n) est strictement décroissante et strictement positive.",
              "b) À l'aide d'une intégration par parties, établir la relation de récurrence : W_n = ((n - 1) / n) * W_(n-2) pour tout n >= 2.",
              "c) Démontrer que pour tout n >= 0 : (n + 1) * W_(n+1) * W_n = pi / 2."
            ]
          },
          {
            lead: "2. Équivalent asymptotique et formule de Stirling :",
            sub: [
              "a) Montrer que W_(n+1) / W_n tend vers 1 quand n tend vers +infini. En déduire que W_n équivaut asymptotiquement à racine(pi / (2n)).",
              "b) En déduire l'équivalent asymptotique de la factorielle n! (formule de Stirling : n! ~ (n/e)^n * racine(2*pi*n))."
            ]
          }
        ]
      }
    ]
  },

  // ─── 15. ENS Yaoundé SVT Concours ─────────────────────────────────────────
  {
    id: 'concours-ens-svt-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : SVT (1er Cycle)",
    university: 'ENS Yaoundé',
    faculty: "Sciences de l'Éducation (ENS)",
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Géodynamique Interne & Ligne Volcanique du Cameroun",
        points: "7 points",
        context: "Pétrologie et tectonique mégastructurale de la Ligne du Cameroun (du Mont Cameroun au Lac Tchad).",
        items: [
          {
            lead: "1. Contexte géodynamique et volcanologique :",
            sub: [
              "a) Décrire l'extension géographique et morphologique de la Ligne du Cameroun (secteur océanique et secteur continental).",
              "b) Discuter les deux modèles géodynamiques proposés pour son origine : panache mantellique fixe (point chaud) vs réactivation de failles panafricaines dans la plaque lithosphérique.",
              "c) Caractériser la série magmatique alcaline associée : basaltes alcalins, hawaiites, trachytes et rhyolites."
            ]
          },
          {
            lead: "2. Risque volcanique et limnique :",
            sub: [
              "Expliquer la catastrophe limnique du lac Nyos (1986) : origine du CO2 mantellique dissous, stratification thermique et mécanisme du dégazage soudain."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Physiologie Végétale & Métabolisme Photosynthétique",
        points: "6 points",
        context: "Adaptation écophysiologique des végétaux face au stress hydrique dans les écosystèmes camerounais.",
        items: [
          {
            lead: "1. Voies métaboliques C3, C4 et CAM :",
            sub: [
              "a) Décrire le cycle de Calvin-Benson chez les plantes en C3 et préciser le rôle catalytique de la Rubisco.",
              "b) Expliquer le phénomène de photorespiration et ses conséquences sur le rendement énergétique de la biomasse.",
              "c) Décrire l'anatomie foliaire de type Kranz chez les graminées en C4 (maïs, mil) et expliquer comment la PEP-carboxylase supprime la photorespiration en milieu aride.",
              "d) Quel est le mécanisme d'ouverture stomatique nocturne des plantes CAM (plantes succulentes) ?"
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Génétique des Populations & Évolution",
        points: "7 points",
        context: "Équilibre panmictique de Hardy-Weinberg et sélection équilibrante dans les populations humaines tropicales.",
        items: [
          {
            lead: "1. Loi de Hardy-Weinberg :",
            sub: [
              "a) Énoncer les 5 conditions d'équilibre d'une population idéale au sens de Hardy-Weinberg.",
              "b) Dans une population du Nord-Cameroun de 10 000 individus, la fréquence des homozygotes drépanocytaires SS est de 4% (q^2 = 0.04). Calculer les fréquences alléliques p (HbA) et q (HbS).",
              "c) Déterminer le pourcentage attendu d'individus hétérozygotes AS sains porteurs du trait."
            ]
          },
          {
            lead: "2. Forces évolutives et spéciation :",
            sub: [
              "a) Définir la dérive génétique et expliquer pourquoi son effet est décuplé lors d'un goulot d'étranglement de population.",
              "b) Distinguer la spéciation allopatrique de la spéciation sympatrique."
            ]
          }
        ]
      }
    ]
  },

  // ─── 16. ENAM Culture Générale Concours ───────────────────────────────────
  {
    id: 'concours-enam-cg-2023',
    title: "Concours ENAM 2023 — Dissertation de Culture Générale (Division Administrative)",
    university: 'ENAM',
    faculty: 'Administration & Magistrature (ENAM)',
    subject: 'Culture Générale Concours',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Épreuve Officielle : Sujet Unique de Dissertation",
        points: "20 points",
        context: "Épreuve d'admissibilité pour les cycles A et B de la Division Administrative (Administration Générale, Travail, Douanes, Impôts). Durée : 4 heures.",
        items: [
          {
            lead: "SUJET DE DISSERTATION :",
            sub: [
              "« La décentralisation et le renforcement des compétences des Collectivités Territoriales Décentralisées (CTD) : simple transfert de charges de l'État ou véritable levier d'accélération de l'émergence économique du Cameroun à l'horizon 2035 ? »"
            ]
          },
          {
            lead: "Consignes officielles du jury de l'ENAM :",
            sub: [
              "Le candidat veillera à structurer sa copie selon les canons rigoureux de la dissertation administrative : Introduction complète, Plan bipartite équilibré (I. A / B - II. A / B), Transitions explicites et Conclusion prospective.",
              "L'argumentation devra mobiliser le cadre législatif camerounais (Loi n° 2019/024 portant Code Général des CTD), l'histoire des institutions politiques et les enjeux socio-économiques contemporains."
            ]
          }
        ]
      },
      {
        sectionTitle: "Cadrage Méthodologique & Grille d'Analyse Sectorielle",
        points: "Barème indicatif",
        context: "Éléments doctrinaux et pistes de réflexion attendues par la commission de correction de l'ENAM.",
        items: [
          {
            lead: "1. Axe I : La décentralisation comme moteur endogène de développement local",
            sub: [
              "a) Rapprochement de la décision publique des citoyens et démocratie participative locale.",
              "b) Valorisation des potentialités agro-pastorales, minières et touristiques propres à chaque région.",
              "c) Le statut spécial accordé aux Régions du Nord-Ouest et du Sud-Ouest comme modalité d'apaisement et de reconstruction."
            ]
          },
          {
            lead: "2. Axe II : Les contraintes structurelles et les défis de la gouvernance financière",
            sub: [
              "a) La modicité des ressources financières transférées et la dépendance vis-à-vis de la Dotation Générale de Décentralisation (DGD).",
              "b) Le déficit d'expertise managériale et technique au sein des exécutifs communaux et régionaux.",
              "c) La persistance de la tutelle de l'État (préfets et gouverneurs) et le risque de duplication bureaucratique."
            ]
          }
        ]
      },
      {
        sectionTitle: "Grille d'Évaluation Officielle & Critères d'Excellence",
        points: "Barème du Jury",
        context: "Barème officiel d'évaluation de la Division Administrative de l'ENAM.",
        table: {
          headers: ["Critère d'évaluation", "Points", "Indicateurs d'appréciation"],
          rows: [
            ["Introduction & Problématique", "4 pts", "Accroche, délimitation conceptuelle, problématique féconde, annonce de plan"],
            ["Cohérence de l'argumentation (Partie I)", "6 pts", "Richesse des exemples camerounais, citation des lois, pertinence des thèses"],
            ["Profondeur analytique (Partie II)", "6 pts", "Esprit critique, examen des limites réelles, hauteur de vue régalienne"],
            ["Style, vocabulaire & Syntaxe", "2 pts", "Qualité de la langue administrative, propreté de la copie, zéro faute"],
            ["Conclusion & Recommandations", "2 pts", "Synthèse dynamique, ouverture prospective vers la Vision Cameroun 2035"]
          ]
        },
        items: [
          {
            lead: "Recommandations finales de la commission :",
            sub: [
              "Éviter les prises de position purement partisanes ou polémiques. Le futur administrateur civil doit démontrer le sens de l'État, la neutralité du service public et le respect des valeurs républicaines."
            ]
          }
        ]
      }
    ]
  },

  // ─── 17. ESSEC Douala Concours Maths ──────────────────────────────────────
  {
    id: 'concours-essec-maths-2023',
    title: "Concours ESSEC Douala 2023 — Mathématiques Appliquées à la Gestion",
    university: 'ESSEC Douala',
    faculty: 'Management & Commerce (ESSEC)',
    subject: 'Microéconomie',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie I : Mathématiques Financières & Évaluation de Projets",
        points: "6 points",
        context: "Décision d'investissement industriel pour une PME agro-alimentaire installée dans la zone portuaire de Douala-Bonabéri.",
        items: [
          {
            lead: "1. Amortissement d'emprunt bancaire :",
            sub: [
              "L'entreprise souscrit un emprunt de 100 000 000 FCFA remboursable en 5 annuités constantes au taux d'intérêt composé de 9% par an.",
              "a) Calculer le montant de l'annuité constante de remboursement A.",
              "b) Dresser les deux premières lignes du tableau d'amortissement de l'emprunt (Capital restant dû en début de période, Intérêts, Amortissement du capital, Annuité).",
              "c) Quel est le montant total des intérêts payés à la banque au terme des 5 ans ?"
            ]
          },
          {
            lead: "2. Critères de rentabilité d'investissement :",
            sub: [
              "Le projet génère des flux nets de trésorerie (cash-flows) de 30 millions par an pendant 5 ans. Coût du capital k = 10%.",
              "a) Calculer la Valeur Actuelle Nette (VAN) du projet. L'investissement est-il rentable ?",
              "b) Déterminer par interpolation linéaire le Taux de Rendement Interne (TRI)."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie II : Recherche Opérationnelle & Programmation Linéaire",
        points: "7 points",
        context: "Optimisation de la production hebdomadaire d'une biscuiterie de Douala fabriquant deux types de gâteaux G1 et G2.",
        table: {
          headers: ["Ressource disponible", "Consommation par G1", "Consommation par G2", "Capacité hebdomadaire"],
          rows: [
            ["Farine de blé", "2 kg", "4 kg", "800 kg"],
            ["Sucre raffiné", "3 kg", "1 kg", "600 kg"],
            ["Temps de four", "1 heure", "2 heures", "360 heures"],
            ["Marge unitaire nette", "3 000 FCFA", "4 000 FCFA", "Maximiser le profit Z"]
          ]
        },
        items: [
          {
            lead: "1. Modélisation et résolution graphique :",
            sub: [
              "a) Poser le programme linéaire complet sous forme canonique (fonction objectif et contraintes d'inégalités).",
              "b) Représenter graphiquement le polygone des solutions admissibles dans le repère (x1, x2).",
              "c) Déterminer les coordonnées du sommet optimal et calculer le profit maximum hebdomadaire Z*."
            ]
          },
          {
            lead: "2. Résolution par l'algorithme du Simplexe :",
            sub: [
              "Écrire la forme standard avec les variables d'écart e1, e2, e3 et dresser le tableau initial du simplexe."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie III : Chaînes de Markov & Prévision de Parts de Marché",
        points: "7 points",
        context: "Dynamique concurrentielle entre deux opérateurs de téléphonie mobile au Cameroun (Opérateur A et Opérateur B).",
        items: [
          {
            lead: "1. Matrice de transition stochastique :",
            sub: [
              "Chaque mois, 15% des abonnés de A migrent vers B, tandis que 25% des abonnés de B migrent vers A.",
              "a) Écrire la matrice de transition P du système stochastique.",
              "b) Si au départ A détient 70% et B détient 30% du marché (vecteur initial pi_0 = [0.7, 0.3]), calculer la répartition pi_1 après un mois et pi_2 après deux mois."
            ]
          },
          {
            lead: "2. État stationnaire à long terme :",
            sub: [
              "a) Déterminer la distribution limite stationnaire pi = [pi_A, pi_B] vérifiant pi * P = pi et pi_A + pi_B = 1.",
              "b) Interpréter économiquement ce résultat pour la stratégie marketing de chaque opérateur."
            ]
          }
        ]
      }
    ]
  },

  // ─── 18. MINSANTE Concours IDE Santé ──────────────────────────────────────
  {
    id: 'concours-ide-sante-2023',
    title: "Concours National IDE 2023 — Biologie Médicale, Santé & Hygiène (MINSANTE)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    pages: [
      {
        sectionTitle: "Partie 1 : Santé Publique & Grandes Endémies Tropicales",
        points: "6 points",
        context: "Épidémiologie des maladies transmissibles au Cameroun et protocoles de prévention du Ministère de la Santé Publique.",
        items: [
          {
            lead: "1. Paludisme et lutte antivectorielle :",
            sub: [
              "a) Identifier l'agent pathogène principal du paludisme grave au Cameroun et son vecteur biologique.",
              "b) Énumérer 4 signes cliniques de gravité du paludisme chez l'enfant de moins de 5 ans selon les critères de l'OMS (convulsions, coma, anémie sévère, détresse respiratoire).",
              "c) Décrire les mesures préventives recommandées : moustiquaires imprégnées d'insecticide à longue durée d'action (MILDA) et chimio-prévention du paludisme saisonnier (CPS)."
            ]
          },
          {
            lead: "2. Hygiène hospitalière et infections associées aux soins :",
            sub: [
              "a) Définir une infection nosocomiale et citer les deux modes principaux de transmission (contact direct vs aéroportée).",
              "b) Décrire la technique standard du lavage simple des mains et de la friction hydro-alcoolique selon l'OMS."
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie 2 : Pharmacologie Pratique & Calculs de Débits de Perfusion",
        points: "7 points",
        context: "Sécurité d'administration des thérapeutiques médicamenteuses en unité de soins intensifs pédiatriques.",
        items: [
          {
            lead: "1. La règle des 5 B :",
            sub: [
              "Citer et expliciter les 5 vérifications fondamentales de l'infirmier : Bon patient, Bon médicament, Bonne dose, Bonne voie, Bon moment."
            ]
          },
          {
            lead: "2. Exercices pratiques de calculs de doses :",
            sub: [
              "a) Prescription 1 : Administrer 1 000 mL de sérum glucosé à 5% en 8 heures par perfusion intraveineuse par gravité. Sachant qu'un perfuseur standard délivre 20 gouttes par mL, calculer le débit exact en gouttes par minute.",
              "b) Prescription 2 : Un enfant pesant 15 kg doit recevoir du paracétamol à la dose de 15 mg/kg par prise toutes les 6 heures. Quelle est la dose en mg par prise ? Quelle est la dose totale journalière ?",
              "c) Prescription 3 : Ampicilline injectable dosée à 1 g en flacon de poudre. On dissout la poudre dans 10 mL d'eau pour préparation injectable. Combien de mL faut-il prélever pour administrer une dose de 250 mg ?"
            ]
          }
        ]
      },
      {
        sectionTitle: "Partie 3 : Démarche de Soins & Cas Clinique Infirmier",
        points: "7 points",
        context: "Prise en charge d'un patient reçu au centre de santé intégré de district.",
        items: [
          {
            lead: "1. Situation clinique :",
            sub: [
              "Vous recevez en garde un nourrisson de 14 mois présentant depuis 48 heures des selles liquides fréquentes (6 à 8 par jour) et des vomissements. À l'examen : enfant léthargique, yeux enfoncés, pli cutané s'effaçant très lentement (> 2 secondes), soif vive, température à 38.5°C."
            ]
          },
          {
            lead: "2. Démarche clinique et interventions infirmières :",
            sub: [
              "a) Poser le diagnostic infirmier principal en utilisant la classification des 14 besoins fondamentaux de Virginia Henderson.",
              "b) Selon le protocole PCIME de prise en charge intégrée des maladies de l'enfant, quel est le plan de réhydratation indiqué (Plan A, B ou C) ?",
              "c) Détailler la préparation et l'administration des Sels de Réhydratation Orale (SRO) et la supplémentation en Zinc.",
              "d) Quels paramètres vitaux l'infirmier doit-il surveiller en priorité au cours des 4 premières heures ?"
            ]
          }
        ]
      }
    ]
  }
];

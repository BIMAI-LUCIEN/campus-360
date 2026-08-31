/**
 * Academic Stage Report Standards & Rich Diagram Generator
 * Provides standard university templates, vector SVG schemas, and formatting utilities.
 */

export const SVG_DIAGRAMS = {
  architecture: `
    <div class="figure-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">
      <svg width="100%" height="260" viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" style="max-width: 650px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <defs>
          <linearGradient id="gradClient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="100%" stop-color="#0284C7"/>
          </linearGradient>
          <linearGradient id="gradApi" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#818CF8"/>
            <stop offset="100%" stop-color="#4F46E5"/>
          </linearGradient>
          <linearGradient id="gradDb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34D399"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
          <linearGradient id="gradAi" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F472B6"/>
            <stop offset="100%" stop-color="#DB2777"/>
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B"/>
          </marker>
        </defs>

        <!-- Client Tier -->
        <rect x="30" y="40" width="160" height="170" rx="8" fill="url(#gradClient)" />
        <text x="110" y="70" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Couche Client Mobile</text>
        <rect x="45" y="90" width="130" height="35" rx="4" fill="#FFFFFF" fill-opacity="0.2"/>
        <text x="110" y="112" font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">React Native / Expo</text>
        <rect x="45" y="135" width="130" height="35" rx="4" fill="#FFFFFF" fill-opacity="0.2"/>
        <text x="110" y="157" font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">TipTap & PDF Engine</text>

        <!-- Arrow Client to API -->
        <line x1="190" y1="125" x2="260" y2="125" stroke="#64748B" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow)"/>
        <text x="225" y="115" font-family="'Segoe UI', Arial, sans-serif" font-size="9" fill="#64748B" text-anchor="middle">HTTPS / REST</text>

        <!-- Server Tier -->
        <rect x="270" y="40" width="170" height="170" rx="8" fill="url(#gradApi)" />
        <text x="355" y="70" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Passerelle & Backend</text>
        <rect x="285" y="90" width="140" height="35" rx="4" fill="#FFFFFF" fill-opacity="0.2"/>
        <text x="355" y="112" font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">Next.js 15 App Router</text>
        <rect x="285" y="135" width="140" height="35" rx="4" fill="#FFFFFF" fill-opacity="0.2"/>
        <text x="355" y="157" font-family="'Segoe UI', Arial, sans-serif" font-size="11" fill="#FFFFFF" text-anchor="middle">Better Auth & Session JWT</text>

        <!-- Arrow Server to DB -->
        <line x1="440" y1="95" x2="500" y2="95" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>
        <text x="470" y="85" font-family="'Segoe UI', Arial, sans-serif" font-size="9" fill="#64748B" text-anchor="middle">SQL Pool</text>

        <!-- Database Tier -->
        <rect x="510" y="40" width="160" height="80" rx="8" fill="url(#gradDb)" />
        <text x="590" y="70" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">PostgreSQL Database</text>
        <text x="590" y="95" font-family="'Segoe UI', Arial, sans-serif" font-size="10" fill="#E6FFFA" text-anchor="middle">Documents & Sections DB</text>

        <!-- Arrow Server to AI -->
        <line x1="440" y1="165" x2="500" y2="165" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>
        <text x="470" y="155" font-family="'Segoe UI', Arial, sans-serif" font-size="9" fill="#64748B" text-anchor="middle">OpenRouter</text>

        <!-- AI Cloud Tier -->
        <rect x="510" y="130" width="160" height="80" rx="8" fill="url(#gradAi)" />
        <text x="590" y="160" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Moteur IA Générative</text>
        <text x="590" y="185" font-family="'Segoe UI', Arial, sans-serif" font-size="10" fill="#FDF2F8" text-anchor="middle">GPT-4o-mini & MiniMax</text>
      </svg>
      <div style="font-size: 10pt; font-style: italic; color: #475569; margin-top: 8px;"><strong>Figure 1.1 :</strong> Architecture Globale en 3-Tiers du Système Campus 360</div>
    </div>
  `,
  useCase: `
    <div class="figure-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">
      <svg width="100%" height="240" viewBox="0 0 650 240" xmlns="http://www.w3.org/2000/svg" style="max-width: 620px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
        <!-- Boundary -->
        <rect x="160" y="20" width="460" height="200" rx="10" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5" stroke-dasharray="6,4"/>
        <text x="180" y="42" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#0284C7">Système Campus 360 - Rédaction de Documents</text>

        <!-- Actor Student -->
        <circle cx="60" cy="90" r="18" fill="#38BDF8"/>
        <line x1="60" y1="108" x2="60" y2="150" stroke="#0F172A" stroke-width="2.5"/>
        <line x1="35" y1="125" x2="85" y2="125" stroke="#0F172A" stroke-width="2.5"/>
        <line x1="60" y1="150" x2="40" y2="185" stroke="#0F172A" stroke-width="2.5"/>
        <line x1="60" y1="150" x2="80" y2="185" stroke="#0F172A" stroke-width="2.5"/>
        <text x="60" y="208" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle">Étudiant / Rédacteur</text>

        <!-- Use Cases -->
        <ellipse cx="280" cy="80" rx="95" ry="24" fill="#F0F9FF" stroke="#0284C7" stroke-width="1.5"/>
        <text x="280" y="85" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#0C4A6E" text-anchor="middle">Initialiser le document (IA Chat)</text>

        <ellipse cx="280" cy="150" rx="95" ry="24" fill="#F0F9FF" stroke="#0284C7" stroke-width="1.5"/>
        <text x="280" y="155" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#0C4A6E" text-anchor="middle">Éditer et Structurer les sections</text>

        <ellipse cx="500" cy="80" rx="95" ry="24" fill="#FAF5FF" stroke="#9333EA" stroke-width="1.5"/>
        <text x="500" y="85" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#581C87" text-anchor="middle">&lt;&lt;include&gt;&gt; Rédaction GPT-4o-mini</text>

        <ellipse cx="500" cy="150" rx="95" ry="24" fill="#ECFDF5" stroke="#059669" stroke-width="1.5"/>
        <text x="500" y="155" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#064E3B" text-anchor="middle">Exporter en PDF Universitaire</text>

        <!-- Association Lines -->
        <line x1="85" y1="120" x2="185" y2="85" stroke="#334155" stroke-width="1.5"/>
        <line x1="85" y1="130" x2="185" y2="150" stroke="#334155" stroke-width="1.5"/>
        <line x1="375" y1="80" x2="405" y2="80" stroke="#9333EA" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="375" y1="150" x2="405" y2="150" stroke="#059669" stroke-width="1.5"/>
      </svg>
      <div style="font-size: 10pt; font-style: italic; color: #475569; margin-top: 8px;"><strong>Figure 2.1 :</strong> Diagramme de Cas d'Utilisation UML du Module de Rédaction</div>
    </div>
  `,
  databaseSchema: `
    <div class="figure-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">
      <svg width="100%" height="220" viewBox="0 0 650 220" xmlns="http://www.w3.org/2000/svg" style="max-width: 620px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
        <!-- Table app_documents -->
        <rect x="40" y="30" width="240" height="150" rx="6" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5"/>
        <rect x="40" y="30" width="240" height="32" rx="6" fill="#0284C7"/>
        <text x="160" y="52" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">app_documents (Rapport)</text>
        <text x="55" y="80" font-family="monospace" font-size="11" fill="#0F172A">PK  id : UUID</text>
        <text x="55" y="100" font-family="monospace" font-size="11" fill="#475569">FK  user_id : UUID</text>
        <text x="55" y="120" font-family="monospace" font-size="11" fill="#475569">    title : VARCHAR(200)</text>
        <text x="55" y="140" font-family="monospace" font-size="11" fill="#475569">    cover_data : JSONB</text>
        <text x="55" y="160" font-family="monospace" font-size="11" fill="#475569">    template_type : VARCHAR(50)</text>

        <!-- Relation 1 to N -->
        <line x1="280" y1="105" x2="370" y2="105" stroke="#0F172A" stroke-width="2"/>
        <text x="295" y="95" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="bold" fill="#0F172A">1</text>
        <text x="350" y="95" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="bold" fill="#0F172A">1..*</text>

        <!-- Table app_document_sections -->
        <rect x="370" y="30" width="240" height="150" rx="6" fill="#FFFFFF" stroke="#4F46E5" stroke-width="1.5"/>
        <rect x="370" y="30" width="240" height="32" rx="6" fill="#4F46E5"/>
        <text x="490" y="52" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">app_document_sections</text>
        <text x="385" y="80" font-family="monospace" font-size="11" fill="#0F172A">PK  id : UUID</text>
        <text x="385" y="100" font-family="monospace" font-size="11" fill="#475569">FK  document_id : UUID</text>
        <text x="385" y="120" font-family="monospace" font-size="11" fill="#475569">    title : VARCHAR(200)</text>
        <text x="385" y="140" font-family="monospace" font-size="11" fill="#475569">    content_html : TEXT</text>
        <text x="385" y="160" font-family="monospace" font-size="11" fill="#475569">    sort_order : INTEGER</text>
      </svg>
      <div style="font-size: 10pt; font-style: italic; color: #475569; margin-top: 8px;"><strong>Figure 3.1 :</strong> Modèle Relationnel de Données (MCD / MLD) des Rapports et Sections</div>
    </div>
  `,
};

export const ACADEMIC_TABLE_SAMPLE = `
  <div style="margin: 20px 0; overflow-x: auto; page-break-inside: avoid;">
    <table style="width: 100%; border-collapse: collapse; font-size: 10pt; text-align: left; background: #FFFFFF; border: 1px solid #CBD5E1;">
      <thead>
        <tr style="background: #0F172A; color: #FFFFFF;">
          <th style="padding: 10px 14px; border: 1px solid #334155; font-weight: bold;">Critère Technique</th>
          <th style="padding: 10px 14px; border: 1px solid #334155; font-weight: bold;">Approche Traditionnelle</th>
          <th style="padding: 10px 14px; border: 1px solid #334155; font-weight: bold;">Solution Campus 360 IA</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #F8FAFC;">
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Temps de Rédaction Moyen</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">3 à 4 semaines</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: 600;">2 à 3 jours (Gain ~80%)</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Conformité Académique</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">Variable selon l'étudiant</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: 600;">100% conforme aux normes CAMES / Univ</td>
        </tr>
        <tr style="background: #F8FAFC;">
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Exportation PDF Haute Fidélité</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">Mise en page manuelle complexe</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; color: #059669; font-weight: 600;">Génération vectorielle automatique A4</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 9pt; font-style: italic; color: #64748B; margin-top: 6px; text-align: center;"><strong>Tableau 1.1 :</strong> Analyse Comparative des Performances et de la Rigueur de Rédaction</div>
  </div>
`;

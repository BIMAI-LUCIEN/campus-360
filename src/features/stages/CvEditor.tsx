import React from 'react';
import { View } from 'react-native';

import type { OfficialCvData } from '../../types';
import { AddButton, Field, fieldStyles, ItemCard, linesToList, ListField, Section } from '../profile/cvFields';

// Field-by-field editor for the generated CV: every change goes straight into
// the OfficialCvData that the preview, the PDF and the sent application use.

type Props = {
  cv: OfficialCvData;
  onChange: (cv: OfficialCvData) => void;
};

export function CvEditor({ cv, onChange }: Props) {
  const patch = (partial: Partial<OfficialCvData>) => onChange({ ...cv, ...partial });
  const details = cv.detailsPersonnels;
  const { experiences, formations, langues, competences } = cv;

  return (
    <View>
      <Section title="En-tête" defaultOpen>
        <Field label="Titre du CV" value={cv.titrePoste} onChangeText={(titrePoste) => patch({ titrePoste })} />
        <Field label="Profil" value={cv.profil ?? ''} onChangeText={(profil) => patch({ profil })} multiline />
      </Section>

      <Section title="Coordonnées">
        <View style={fieldStyles.row}>
          <View style={fieldStyles.half}>
            <Field label="Prénom" value={details.prenom} onChangeText={(prenom) => patch({ detailsPersonnels: { ...details, prenom } })} />
          </View>
          <View style={fieldStyles.half}>
            <Field label="Nom" value={details.nom} onChangeText={(nom) => patch({ detailsPersonnels: { ...details, nom } })} />
          </View>
        </View>
        <Field label="E-mail" value={details.email} onChangeText={(email) => patch({ detailsPersonnels: { ...details, email } })} />
        <Field label="Téléphone" value={details.telephone} onChangeText={(telephone) => patch({ detailsPersonnels: { ...details, telephone } })} />
        <Field label="Adresse" value={details.adresse ?? ''} onChangeText={(adresse) => patch({ detailsPersonnels: { ...details, adresse } })} />
      </Section>

      <Section title="Expériences" count={experiences.length} defaultOpen>
        {experiences.map((exp, i) => {
          const update = (p: Partial<typeof exp>) => patch({ experiences: experiences.map((e, j) => (j === i ? { ...e, ...p } : e)) });
          return (
            <ItemCard key={i} title={exp.poste || `Expérience ${i + 1}`} onRemove={() => patch({ experiences: experiences.filter((_, j) => j !== i) })}>
              <Field label="Poste" value={exp.poste} onChangeText={(poste) => update({ poste })} />
              <Field label="Entreprise" value={exp.entreprise} onChangeText={(entreprise) => update({ entreprise })} />
              <View style={fieldStyles.row}>
                <View style={fieldStyles.half}>
                  <Field label="Ville" value={exp.ville} onChangeText={(ville) => update({ ville })} />
                </View>
                <View style={fieldStyles.half}>
                  <Field label="Période" value={exp.periode} onChangeText={(periode) => update({ periode })} />
                </View>
              </View>
              <Field label="Missions" value={exp.missions.join('\n')} onChangeText={(v) => update({ missions: linesToList(v) })} placeholder="Une mission par ligne" multiline />
            </ItemCard>
          );
        })}
        <AddButton label="Ajouter une expérience" onPress={() => patch({ experiences: [...experiences, { poste: '', entreprise: '', ville: '', periode: '', missions: [] }] })} />
      </Section>

      <Section title="Formations" count={formations.length}>
        {formations.map((f, i) => {
          const update = (p: Partial<typeof f>) => patch({ formations: formations.map((e, j) => (j === i ? { ...e, ...p } : e)) });
          return (
            <ItemCard key={i} title={f.diplome || `Formation ${i + 1}`} onRemove={() => patch({ formations: formations.filter((_, j) => j !== i) })}>
              <Field label="Diplôme" value={f.diplome} onChangeText={(diplome) => update({ diplome })} />
              <Field label="Établissement" value={f.etablissement} onChangeText={(etablissement) => update({ etablissement })} />
              <View style={fieldStyles.row}>
                <View style={fieldStyles.half}>
                  <Field label="Ville" value={f.ville} onChangeText={(ville) => update({ ville })} />
                </View>
                <View style={fieldStyles.half}>
                  <Field label="Période" value={f.periode} onChangeText={(periode) => update({ periode })} />
                </View>
              </View>
            </ItemCard>
          );
        })}
        <AddButton label="Ajouter une formation" onPress={() => patch({ formations: [...formations, { diplome: '', etablissement: '', ville: '', periode: '' }] })} />
      </Section>

      <Section title="Compétences">
        <ListField
          label="Compétences professionnelles"
          items={competences.professionnelles}
          onChange={(professionnelles) => patch({ competences: { ...competences, professionnelles } })}
        />
        <ListField
          label="Qualités"
          items={competences.habilitesRelationnelles}
          onChange={(habilitesRelationnelles) => patch({ competences: { ...competences, habilitesRelationnelles } })}
        />
        <ListField
          label="Logiciels et outils"
          items={competences.logiciels.flatMap((c) => c.items)}
          onChange={(items) => patch({ competences: { ...competences, logiciels: items.length ? [{ categorie: 'Outils', items }] : [] } })}
        />
      </Section>

      <Section title="Langues" count={langues.length}>
        {langues.map((l, i) => {
          const update = (p: Partial<typeof l>) => patch({ langues: langues.map((e, j) => (j === i ? { ...e, ...p } : e)) });
          return (
            <ItemCard key={i} title={l.langue || `Langue ${i + 1}`} onRemove={() => patch({ langues: langues.filter((_, j) => j !== i) })}>
              <View style={fieldStyles.row}>
                <View style={fieldStyles.half}>
                  <Field label="Langue" value={l.langue} onChangeText={(langue) => update({ langue })} />
                </View>
                <View style={fieldStyles.half}>
                  <Field label="Niveau" value={l.niveau} onChangeText={(niveau) => update({ niveau })} />
                </View>
              </View>
            </ItemCard>
          );
        })}
        <AddButton label="Ajouter une langue" onPress={() => patch({ langues: [...langues, { langue: '', niveau: '' }] })} />
      </Section>

      <Section title="Loisirs" count={cv.loisirs.length}>
        <ListField label="Loisirs" items={cv.loisirs} onChange={(loisirs) => patch({ loisirs })} />
      </Section>
    </View>
  );
}

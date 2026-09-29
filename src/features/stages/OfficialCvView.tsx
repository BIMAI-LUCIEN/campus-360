import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OfficialCvData } from '../../types';
import { fontFamilies } from '../../theme/stitch';

interface OfficialCvViewProps {
  cv: OfficialCvData;
}

export function OfficialCvView({ cv }: OfficialCvViewProps) {
  const nom = (cv.detailsPersonnels.nom || 'KAMENI').toUpperCase();
  const prenom = cv.detailsPersonnels.prenom || 'Dave Lionel';

  return (
    <View style={styles.officialCvBox}>
      {/* En-tête avec nom et photo */}
      <View style={styles.officialCvHeaderRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.officialCvFullName}>{nom} {prenom}</Text>
          <Text style={styles.officialCvJobTitle}>{cv.titrePoste}</Text>
        </View>
        <View style={styles.officialCvPhotoFrame}>
          <Text style={styles.officialCvPhotoInitials}>
            {nom.slice(0, 1)}{prenom.slice(0, 1)}
          </Text>
        </View>
      </View>

      <View style={styles.officialCvBlueDivider} />

      {/* 1. Détails personnels */}
      <Text style={styles.officialCvSectionHeader}>Détails personnels</Text>
      <View style={styles.officialCvTwoCols}>
        <View style={{ flex: 1 }}>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Nom : </Text>{cv.detailsPersonnels.nom}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Prénom : </Text>{cv.detailsPersonnels.prenom}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Nationalité : </Text>{cv.detailsPersonnels.nationalite}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Âge : </Text>{cv.detailsPersonnels.age}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.officialCvField} numberOfLines={1}>
            <Text style={styles.officialCvLabel}>Email : </Text>{cv.detailsPersonnels.email}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Tél : </Text>{cv.detailsPersonnels.telephone}
          </Text>
          <Text style={styles.officialCvField}>
            <Text style={styles.officialCvLabel}>Adresse : </Text>{cv.detailsPersonnels.adresse}
          </Text>
        </View>
      </View>

      {/* 2. Expérience professionnelle */}
      <Text style={styles.officialCvSectionHeader}>Expérience professionnelle</Text>
      {cv.experiences.map((exp, idx) => (
        <View key={idx} style={styles.officialCvBlock}>
          <Text style={styles.officialCvItemTitle}>{exp.poste}</Text>
          <View style={styles.officialCvRowBetween}>
            <Text style={styles.officialCvItemSubtitle}>{exp.entreprise}, {exp.ville}</Text>
            <Text style={styles.officialCvItemDate}>{exp.periode}</Text>
          </View>
          {exp.missions.map((m, mIdx) => (
            <Text key={mIdx} style={styles.officialCvBullet}>• {m}</Text>
          ))}
        </View>
      ))}

      {/* 3. Formation */}
      <Text style={styles.officialCvSectionHeader}>Formation</Text>
      {cv.formations.map((form, idx) => (
        <View key={idx} style={styles.officialCvBlock}>
          <View style={styles.officialCvRowBetween}>
            <Text style={styles.officialCvItemTitle}>{form.diplome}</Text>
            <Text style={styles.officialCvItemDate}>{form.periode}</Text>
          </View>
          <Text style={styles.officialCvItemSubtitle}>{form.etablissement}, {form.ville}</Text>
        </View>
      ))}

      {/* 4. Compétences */}
      <Text style={styles.officialCvSectionHeader}>Compétences</Text>
      <Text style={styles.officialCvSubheading}>Compétences professionnelles</Text>
      {cv.competences.professionnelles.map((comp, idx) => (
        <Text key={idx} style={styles.officialCvBullet}>• {comp}</Text>
      ))}

      <Text style={styles.officialCvSubheading}>Habilités personnelles et relationnelles :</Text>
      <Text style={styles.officialCvInlineText}>
        {cv.competences.habilitesRelationnelles.join(', ')}
      </Text>

      <Text style={styles.officialCvSubheading}>Maîtrise des logiciels</Text>
      {cv.competences.logiciels.map((log, idx) => (
        <Text key={idx} style={styles.officialCvBullet}>
          • {log.categorie ? `${log.categorie} : ` : ''}{log.items.join(', ')}
        </Text>
      ))}

      {/* 5. Langues */}
      <Text style={styles.officialCvSectionHeader}>Langues</Text>
      {cv.langues.map((l, idx) => (
        <Text key={idx} style={styles.officialCvInlineText}>
          {l.langue}: {l.niveau}
        </Text>
      ))}

      {/* 6. Autres informations importantes */}
      <Text style={styles.officialCvSectionHeader}>Autres informations importantes</Text>
      <Text style={styles.officialCvInlineText}>
        Loisirs : {cv.loisirs.join(', ')}
      </Text>

      <Text style={styles.officialCvPageNumber}>1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  officialCvBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  officialCvHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  officialCvFullName: {
    fontFamily: fontFamilies.outfit,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  officialCvJobTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 2,
  },
  officialCvPhotoFrame: {
    width: 48,
    height: 58,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  officialCvPhotoInitials: {
    fontFamily: fontFamilies.outfit,
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  officialCvBlueDivider: {
    height: 2,
    backgroundColor: '#005691',
    marginVertical: 10,
  },
  officialCvSectionHeader: {
    fontFamily: fontFamilies.outfit,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#005691',
    borderBottomWidth: 1,
    borderBottomColor: '#005691',
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 6,
  },
  officialCvTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  officialCvField: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    color: '#1F2937',
    marginBottom: 3,
  },
  officialCvLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  officialCvBlock: {
    marginBottom: 6,
  },
  officialCvRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  officialCvItemTitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
  },
  officialCvItemSubtitle: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    fontStyle: 'italic',
    color: '#4B5563',
  },
  officialCvItemDate: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#6B7280',
  },
  officialCvBullet: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#374151',
    marginLeft: 4,
    marginBottom: 2,
  },
  officialCvSubheading: {
    fontFamily: fontFamilies.inter,
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  officialCvInlineText: {
    fontFamily: fontFamilies.inter,
    fontSize: 9.5,
    color: '#374151',
    marginBottom: 4,
  },
  officialCvPageNumber: {
    textAlign: 'center',
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 12,
  },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { AppStatus, StageApplication } from '../../types';
import { stitchColors } from '../../theme/stitch';
import { sendApplicationReminder, updateApplicationStatus } from './stagesApi';

type Step = 'confirm' | 'notSent' | 'question' | 'outcome' | 'next';

const OUTCOMES: { status: AppStatus; label: string }[] = [
  { status: 'REVIEWING', label: 'Réponse reçue' },
  { status: 'INTERVIEW', label: 'Entretien' },
  { status: 'ACCEPTED', label: 'Acceptée' },
  { status: 'REJECTED', label: 'Refusée' },
];

type Props = {
  application: StageApplication;
  onChanged: (patch: Partial<StageApplication>) => void;
  onOpenOffers?: () => void;
};

/**
 * The follow-up of one application, as the server decided it (contexte.md §21): first
 * « did you get a reply? », then the reminder. Nothing shows as sent before the server says so.
 */
export function ApplicationFollowup({ application, onChanged, onOpenOffers }: Props) {
  const followup = application.followup;
  const state = followup?.state ?? 'none';
  const company = application.job?.company?.name?.trim() || "l'entreprise";
  // A student's own send (mailbox, WhatsApp) stays PENDING: they confirm it before a reminder.
  const firstStep: Step = state === 'due' && application.status === 'PENDING' ? 'confirm' : 'question';

  const [step, setStep] = useState<Step>(firstStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStep(firstStep);
    setError(null);
  }, [application.id, firstStep]);

  if (state === 'unconfirmed') {
    return (
      <View style={styles.box} testID={`followup-unconfirmed-${application.id}`}>
        <Text style={styles.title}>Envoi non confirmé</Text>
        <Text style={styles.body}>
          Nous n'avons pas reçu la confirmation de cet envoi. Aucune relance n'est proposée tant qu'il n'est pas sûr que ta
          candidature soit partie.
        </Text>
      </View>
    );
  }
  if (state !== 'due' && state !== 'ask' && state !== 'exhausted') return null;

  const reportOutcome = async (status: AppStatus) => {
    setBusy(true);
    setError(null);
    const result = await updateApplicationStatus(application.id, status);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Statut non enregistré. Réessaie.');
      return;
    }
    onChanged({ status, followup: { state: 'none', reminderCount: followup?.reminderCount ?? 0 } });
  };

  const sendReminder = async () => {
    setBusy(true);
    setError(null);
    const result = await sendApplicationReminder(application.id, application.status === 'PENDING');
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onChanged({
      lastRemindedAt: result.lastRemindedAt,
      followup: { state: 'waiting', reminderCount: result.reminderCount, recipient: followup?.recipient },
    });
  };

  const copyMessage = () => {
    const message = followup?.message || '';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      setError(null);
      navigator.clipboard.writeText(message).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        },
        () => setError('Copie impossible ici : sélectionne le message à la main.'),
      );
    } else {
      // No clipboard module in this build: the share sheet lets the student copy or send it.
      void Share.share({ message });
    }
  };

  const renderNext = () => {
    if (state === 'exhausted') {
      return (
        <>
          <Text style={styles.body}>Pas de réponse après 2 relances : mieux vaut passer à d'autres offres.</Text>
          {onOpenOffers ? (
            <Action label="Voir d'autres offres" onPress={onOpenOffers} testID={`followup-offers-${application.id}`} />
          ) : null}
        </>
      );
    }
    if (state === 'ask' && !followup?.recipient) {
      return (
        <>
          <Text style={styles.body}>
            Cette entreprise n'a pas d'adresse e-mail : la relance ne peut pas partir d'ici. Voici un message à lui envoyer toi-même.
          </Text>
          <Text style={styles.message}>{followup?.message}</Text>
          <Action
            label={copied ? 'Message copié' : 'Copier le message'}
            onPress={copyMessage}
            testID={`followup-copy-${application.id}`}
          />
        </>
      );
    }
    if (state === 'ask') {
      return <Text style={styles.body}>Cette offre a expiré : pas de relance à envoyer.</Text>;
    }
    return (
      <>
        <Text style={styles.label}>Destinataire</Text>
        <Text style={styles.recipient} numberOfLines={2}>{followup?.recipient}</Text>
        <Text style={styles.label}>Message</Text>
        <Text style={styles.message}>{followup?.message}</Text>
        <Action
          label={error ? 'Réessayer' : 'Envoyer par e-mail'}
          onPress={sendReminder}
          busy={busy}
          testID={`followup-send-${application.id}`}
        />
        <Text style={styles.hint}>Le recruteur te répondra directement sur ton adresse e-mail.</Text>
      </>
    );
  };

  return (
    <View style={styles.box} testID={`followup-${application.id}`}>
      {state === 'exhausted' ? <Text style={styles.title}>Sans réponse</Text> : null}

      {step === 'confirm' ? (
        <>
          <Text style={styles.title}>Ta candidature à {company} est-elle bien partie ?</Text>
          <Text style={styles.body}>Depuis ta messagerie ou WhatsApp : l'app ne peut pas le vérifier.</Text>
          <View style={styles.row}>
            <Action label="Oui, envoyée" onPress={() => setStep('question')} testID={`followup-sent-yes-${application.id}`} />
            <Action label="Non" secondary onPress={() => setStep('notSent')} testID={`followup-sent-no-${application.id}`} />
          </View>
        </>
      ) : null}

      {step === 'notSent' ? (
        <>
          <Text style={styles.body}>Envoie d'abord ta candidature depuis le dossier : une relance n'aurait pas de sens avant.</Text>
          <Action label="Finalement, si" secondary onPress={() => setStep('question')} testID={`followup-sent-back-${application.id}`} />
        </>
      ) : null}

      {step === 'question' ? (
        <>
          <Text style={styles.title}>Tu as eu une réponse de {company} ?</Text>
          <View style={styles.row}>
            <Action label="Oui" onPress={() => setStep('outcome')} testID={`followup-reply-yes-${application.id}`} />
            <Action label="Pas encore" secondary onPress={() => setStep('next')} testID={`followup-reply-no-${application.id}`} />
          </View>
        </>
      ) : null}

      {step === 'outcome' ? (
        <>
          <Text style={styles.title}>Où en es-tu avec {company} ?</Text>
          <View style={styles.wrapRow}>
            {OUTCOMES.map((outcome) => (
              <Action
                key={outcome.status}
                label={outcome.label}
                secondary
                busy={busy}
                onPress={() => reportOutcome(outcome.status)}
                testID={`followup-outcome-${outcome.status}-${application.id}`}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 'next' ? renderNext() : null}

      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

function Action({
  label,
  onPress,
  secondary,
  busy,
  testID,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.action, secondary && styles.actionSecondary, (pressed || busy) && styles.actionPressed]}
    >
      {busy && !secondary ? (
        <ActivityIndicator size="small" color={stitchColors.white} />
      ) : (
        <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 0.5,
    borderColor: stitchColors.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  title: { fontSize: 13.5, fontWeight: '600', color: stitchColors.ink, lineHeight: 19 },
  body: { fontSize: 12.5, color: stitchColors.inkMuted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '500', color: stitchColors.inkSubtle },
  recipient: { fontSize: 13, fontWeight: '600', color: stitchColors.ink },
  message: {
    fontSize: 12.5,
    color: stitchColors.ink,
    lineHeight: 18,
    backgroundColor: stitchColors.background,
    borderRadius: 8,
    padding: 10,
  },
  hint: { fontSize: 11.5, color: stitchColors.inkSubtle, lineHeight: 16 },
  error: { fontSize: 12.5, color: stitchColors.corailInk, fontWeight: '500', lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: stitchColors.primary,
  },
  actionSecondary: {
    backgroundColor: stitchColors.background,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
  },
  actionPressed: { opacity: 0.8 },
  actionText: { fontSize: 13, fontWeight: '600', color: stitchColors.white },
  actionTextSecondary: { color: stitchColors.ink },
});

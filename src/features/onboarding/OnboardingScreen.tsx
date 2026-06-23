import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView } from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Trouve tes cours 📚',
    description: 'Accède aux PDF, épreuves et corrigés de toutes les universités et filières du Cameroun.',
    color: '#EFF6FF',
    icon: '🔍',
  },
  {
    id: '2',
    title: 'Débloque facilement 🪙',
    description: 'Recharge ton Wallet avec MTN MoMo ou Orange Money et accède au contenu en un clic.',
    color: '#F4FBF8',
    icon: '💳',
  },
  {
    id: '3',
    title: 'Révise avec l\'IA 🤖',
    description: 'Pose tes questions à notre assistant intelligent, génère des résumés et des quiz sur tes PDF.',
    color: '#F7F6FF',
    icon: '🧠',
  },
];

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onFinish();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      <View style={[styles.slideContent, { backgroundColor: slide.color }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlide === index ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={nextSlide}>
          <Text style={styles.buttonText}>
            {currentSlide === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    padding: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2563EB',
  },
  button: {
    backgroundColor: '#2563EB',
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

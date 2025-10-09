// app/contact.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const CONTACT = {
  name: 'Eva Mounoussamy',
  email: 'mounoussamyeva672@gmail.com',
  phoneDisplay: '+262 693 46 46 76',
  phoneDial: '+262693464676', // pour le lien "tel:"
};

export default function ContactScreen() {
  const handleEmailPress = useCallback(async () => {
    try {
      const url = `mailto:${CONTACT.email}?subject=Contact depuis l'app A La Case Nout Gramoun`;
      console.log('📧 Tentative d\'ouverture email:', url);
      
      // Essayer d'ouvrir directement d'abord
      try {
        await Linking.openURL(url);
        console.log('✅ Email ouvert avec succès');
        return;
      } catch (directError) {
        console.log('❌ Ouverture directe échouée, vérification canOpenURL...');
      }
      
      // Fallback avec canOpenURL
      const can = await Linking.canOpenURL(url);
      console.log('📧 CanOpenURL result:', can);
      
      if (can) {
        await Linking.openURL(url);
        console.log('✅ Email ouvert avec succès (fallback)');
      } else {
        console.log('❌ Impossible d\'ouvrir l\'email');
        Alert.alert(
          "Aucune application e-mail", 
          "Vous pouvez nous contacter directement à :\n\n" + CONTACT.email,
          [
            { text: "Copier l'email", onPress: async () => {
              await Clipboard.setStringAsync(CONTACT.email);
              Alert.alert("✅ Email copié", "L'adresse email a été copiée dans le presse-papiers");
            }},
            { text: "OK" }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur handleEmailPress:', error);
      Alert.alert(
        "Erreur", 
        "Impossible d'ouvrir l'application e-mail.\n\nVous pouvez nous contacter à :\n" + CONTACT.email,
        [
          { text: "Copier l'email", onPress: async () => {
            await Clipboard.setStringAsync(CONTACT.email);
            Alert.alert("✅ Email copié", "L'adresse email a été copiée dans le presse-papiers");
          }},
          { text: "OK" }
        ]
      );
    }
  }, []);

  const handlePhonePress = useCallback(async () => {
    try {
      const url = `tel:${CONTACT.phoneDial}`;
      console.log('📞 Tentative d\'ouverture téléphone:', url);
      
      const can = await Linking.canOpenURL(url);
      console.log('📞 CanOpenURL result:', can);
      
      if (can) {
        await Linking.openURL(url);
        console.log('✅ Téléphone ouvert avec succès');
      } else {
        console.log('❌ Impossible d\'ouvrir le téléphone');
        Alert.alert(
          "Aucune application téléphone", 
          "Vous pouvez nous appeler au :\n\n" + CONTACT.phoneDisplay,
          [
            { text: "Copier le numéro", onPress: () => {
              Alert.alert("Téléphone", CONTACT.phoneDisplay);
            }},
            { text: "OK" }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur handlePhonePress:', error);
      Alert.alert("Erreur", "Impossible d'ouvrir l'application téléphone.\n\nVous pouvez nous appeler au :\n" + CONTACT.phoneDisplay);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* Avatar + nom */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>EM</Text>
        </View>
        <Text style={styles.title}>👋 Contact</Text>
        <Text style={styles.name}>{CONTACT.name}</Text>

        {/* Lignes d'infos */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color={Colors.light.primary} />
            <Text style={styles.infoLabel}>Téléphone</Text>
            <TouchableOpacity onPress={handlePhonePress} style={styles.infoAction} activeOpacity={0.8}>
              <Text style={styles.infoValue}>{CONTACT.phoneDisplay}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color={Colors.light.primary} />
            <Text style={styles.infoLabel}>E-mail</Text>
            <TouchableOpacity onPress={handleEmailPress} style={styles.infoAction} activeOpacity={0.8}>
              <Text style={styles.infoValue}>{CONTACT.email}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handlePhonePress} style={[styles.cta, styles.ctaPrimary]} activeOpacity={0.9}>
            <Text style={styles.ctaText}>📞 Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEmailPress} style={[styles.cta, styles.ctaSecondary]} activeOpacity={0.9}>
            <Text style={styles.ctaText}>✉️ Écrire</Text>
          </TouchableOpacity>
        </View>

        {/* Petit footer */}
        <Text style={styles.footer}>Nous revenons vers vous au plus vite 💬</Text>
      </View>
    </SafeAreaView>
  );
}

const R = 52;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16, justifyContent: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#eef1f4',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  avatar: {
    width: R, height: R, borderRadius: R / 2,
    backgroundColor: '#f0f8ff', // Couleur de fond claire
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: { color: Colors.light.primary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },

  title: { fontSize: 22, fontWeight: '800', color: '#1f2d3d', marginTop: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#5b6b7b', marginBottom: 16, marginTop: 2 },

  infoBox: {
    width: '100%',
    backgroundColor: '#fafbff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef1f4',
    padding: 12,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { color: '#6b7682', fontSize: 13, width: 78 },
  infoAction: { flex: 1, alignItems: 'flex-end' },
  infoValue: { color: Colors.light.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#eef1f4', marginVertical: 10 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  cta: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  ctaPrimary: { backgroundColor: Colors.light.primary },
  ctaSecondary: { backgroundColor: '#1f2d3d' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footer: { marginTop: 12, color: '#8b97a3', fontSize: 12, textAlign: 'center' },
});
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'; // On importe les types pour les styles

// ✅ On type les props du composant
const SkeletonPiece = ({ style }: { style: StyleProp<ViewStyle> }) => <View style={[styles.skeleton, style]} />;

export const ProfileCardSkeleton = () => {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <SkeletonPiece style={styles.profilePhoto} />
        <View style={styles.profileInfo}>
          <SkeletonPiece style={{ width: '70%', height: 20, marginBottom: 8 }} />
          <SkeletonPiece style={{ width: '50%', height: 16 }} />
        </View>
      </View>
      <SkeletonPiece style={{ width: '100%', height: 14, marginTop: 5 }} />
      <SkeletonPiece style={{ width: '80%', height: 14, marginTop: 8 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
});
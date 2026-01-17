import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Profile {
  id: string;
  name: string;
  age: number;
  maturity_level: string;
  blocked_sites: string[];
  whitelisted_sites: string[];
}

export default function Profiles() {
  const { token } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    maturity_level: 'moderate',
  });
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [whitelistedSites, setWhitelistedSites] = useState<string[]>([]);
  const [newBlockedSite, setNewBlockedSite] = useState('');
  const [newWhitelistedSite, setNewWhitelistedSite] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfiles(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormData({ name: '', age: '', maturity_level: 'moderate' });
    setBlockedSites([]);
    setWhitelistedSites([]);
    setModalVisible(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      age: profile.age.toString(),
      maturity_level: profile.maturity_level,
    });
    setBlockedSites(profile.blocked_sites || []);
    setWhitelistedSites(profile.whitelisted_sites || []);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.age) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const age = parseInt(formData.age);
    if (age < 1 || age > 18) {
      Alert.alert('Error', 'Age must be between 1 and 18');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        age,
        maturity_level: formData.maturity_level,
        blocked_sites: blockedSites,
        whitelisted_sites: whitelistedSites,
      };

      if (editingProfile) {
        await axios.put(`${API_URL}/api/profiles/${editingProfile.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        await axios.post(`${API_URL}/api/profiles`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Alert.alert('Success', 'Profile created successfully');
      }

      setModalVisible(false);
      loadProfiles();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    }
  };

  const handleDelete = (profile: Profile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${profile.name}'s profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/profiles/${profile.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Profile deleted');
              loadProfiles();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  const getMaturityColor = (level: string) => {
    switch (level) {
      case 'strict':
        return '#ef4444';
      case 'moderate':
        return '#f59e0b';
      case 'lenient':
        return '#10b981';
      default:
        return '#6366f1';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Child Profiles</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {profiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-add" size={64} color="#64748b" />
            <Text style={styles.emptyText}>No profiles yet</Text>
            <Text style={styles.emptySubtext}>Create a profile for your child to get started</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={32} color="#6366f1" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileAge}>{profile.age} years old</Text>
                <View
                  style={[
                    styles.maturityBadge,
                    { backgroundColor: getMaturityColor(profile.maturity_level) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.maturityText,
                      { color: getMaturityColor(profile.maturity_level) },
                    ]}
                  >
                    {profile.maturity_level.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(profile)}
                >
                  <Ionicons name="create" size={20} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(profile)}
                >
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProfile ? 'Edit Profile' : 'Create Profile'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Child's name"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={formData.age}
                onChangeText={(text) => setFormData({ ...formData, age: text })}
                placeholder="Age"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Safety Level</Text>
              <View style={styles.segmentedControl}>
                {['strict', 'moderate', 'lenient'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.segment,
                      formData.maturity_level === level && styles.segmentActive,
                    ]}
                    onPress={() => setFormData({ ...formData, maturity_level: level })}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        formData.maturity_level === level && styles.segmentTextActive,
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Blocked Sites</Text>
              <View style={styles.addSiteContainer}>
                <TextInput
                  style={[styles.input, styles.siteInput]}
                  value={newBlockedSite}
                  onChangeText={setNewBlockedSite}
                  placeholder="e.g., badsite.com"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addSiteButton}
                  onPress={() => {
                    if (newBlockedSite && !blockedSites.includes(newBlockedSite)) {
                      setBlockedSites([...blockedSites, newBlockedSite]);
                      setNewBlockedSite('');
                    }
                  }}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {blockedSites.map((site, index) => (
                <View key={index} style={styles.siteItem}>
                  <Text style={styles.siteText}>{site}</Text>
                  <TouchableOpacity onPress={() => setBlockedSites(blockedSites.filter((s) => s !== site))}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Whitelisted Sites</Text>
              <View style={styles.addSiteContainer}>
                <TextInput
                  style={[styles.input, styles.siteInput]}
                  value={newWhitelistedSite}
                  onChangeText={setNewWhitelistedSite}
                  placeholder="e.g., globalschool.edu"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addSiteButton}
                  onPress={() => {
                    if (newWhitelistedSite && !whitelistedSites.includes(newWhitelistedSite)) {
                      setWhitelistedSites([...whitelistedSites, newWhitelistedSite]);
                      setNewWhitelistedSite('');
                    }
                  }}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {whitelistedSites.map((site, index) => (
                <View key={index} style={styles.siteItem}>
                  <Text style={styles.siteText}>{site}</Text>
                  <TouchableOpacity onPress={() => setWhitelistedSites(whitelistedSites.filter((s) => s !== site))}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{editingProfile ? 'Update' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f120',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  profileAge: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  maturityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  maturityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    color: '#f1f5f9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  addSiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteInput: {
    flex: 1,
    marginRight: 8,
  },
  addSiteButton: {
    backgroundColor: '#6366f1',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  siteText: {
    color: '#f1f5f9',
    fontSize: 14,
  },
  segmentActive: {
    backgroundColor: '#6366f1',
  },
  segmentText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

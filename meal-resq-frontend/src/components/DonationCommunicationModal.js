import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Linking, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/apiService';

export function DonationCommunicationModal({ visible, type, item, onClose, currentUser }) {
  const { colors } = useTheme();

  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const chatScrollRef = useRef(null);

  // Message Edit & Delete State
  const [selectedMsgForAction, setSelectedMsgForAction] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  useEffect(() => {
    if (visible && item) {
      const msgs = apiService.getChatMessages(item.id);
      setChatMessages(msgs);
      apiService.markChatAsRead(item.id, currentUser?.role || 'user');
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, item]);


  if (!visible || !item) return null;

  const isDonorUser = currentUser?.role === 'donor';

  const targetName = isDonorUser
    ? (item.claimed_by_name || 'Food Claimer')
    : (item.donor_name || 'Food Donor');

  const targetPhone = item.phone || (isDonorUser ? (item.claimed_by_phone || '+91 8688294029') : (item.donor_phone || '+91 8688294029'));


  const handleCallNumber = () => {
    if (Platform.OS === 'web') {
      Linking.openURL(`tel:${targetPhone}`).catch(() => {
        alert(`📞 Calling ${targetName} at ${targetPhone}...`);
      });
    } else {
      Linking.openURL(`tel:${targetPhone}`);
    }
  };

  const handleSendChat = () => {
    if (!inputMsg.trim()) return;
    const roleStr = currentUser?.role || 'user';
    const nameStr = currentUser?.name || 'User';

    if (editingMsgId) {
      const updated = apiService.editDonationChatMessage(item.id, editingMsgId, inputMsg.trim());
      setChatMessages([...updated]);
      setEditingMsgId(null);
    } else {
      const updated = apiService.sendChatMessage(item.id, roleStr, nameStr, inputMsg.trim(), false);
      setChatMessages([...updated]);
    }
    setInputMsg('');
  };

  const canEditMessage = (msg) => {
    if (!msg || msg.isVoice) return false;
    const isSender = currentUser?.role
      ? (msg.senderRole === currentUser.role)
      : (msg.senderName === currentUser?.name);

    if (!isSender) return false;

    const now = Date.now();
    const msgTime = msg.timestamp || now;

    // Until receiver sees it -> can edit
    if (!msg.seenByReceiver && !msg.seenAtTimestamp) {
      return true;
    }

    // After receiver has seen it -> up to 5 minutes (300,000 ms) from seen time
    const seenTime = msg.seenAtTimestamp || msgTime;
    const elapsedMs = now - seenTime;
    return elapsedMs <= 5 * 60 * 1000;
  };

  const handleOpenMsgAction = (msg) => {
    setSelectedMsgForAction(msg);
    setActionModalVisible(true);
  };


  const handleStartEditMsg = () => {
    if (!selectedMsgForAction) return;
    setInputMsg(selectedMsgForAction.text);
    setEditingMsgId(selectedMsgForAction.id);
    setActionModalVisible(false);
  };

  const handleDeleteMsg = () => {
    if (!selectedMsgForAction) return;
    const updated = apiService.deleteDonationChatMessage(item.id, selectedMsgForAction.id);
    setChatMessages([...updated]);
    if (editingMsgId === selectedMsgForAction.id) {
      setEditingMsgId(null);
      setInputMsg('');
    }
    setActionModalVisible(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasVoiceNote(true);
      setVoiceNotice('🎙️ Voice note recorded successfully! (0:12 sec)');
    } else {
      setIsRecording(true);
      setVoiceNotice('🔴 Recording voice note... Speak clearly now');
    }
  };

  const handlePlayVoice = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setVoiceNotice('⏸️ Voice note paused.');
    } else {
      setIsPlaying(true);
      setVoiceNotice('▶️ Playing recorded voice message (0:12)...');
      setTimeout(() => {
        setIsPlaying(false);
        setVoiceNotice('✅ Voice note playback finished.');
      }, 3000);
    }
  };

  const handleSendVoiceNote = () => {
    const roleStr = currentUser?.role || 'user';
    const nameStr = currentUser?.name || 'User';
    const updated = apiService.sendChatMessage(item.id, roleStr, nameStr, '🎙️ Voice Note (0:12 sec)', true);
    setChatMessages([...updated]);
    alert(`🎙️ Voice note sent directly to ${targetName} (${targetPhone})!`);
    setHasVoiceNote(false);
    setIsRecording(false);
  };



  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {type === 'call' ? '📞 Direct Phone Call' : type === 'chat' ? '💬 Live Chat' : '🎙️ Voice Message'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
            Item: <Text style={{ fontWeight: '800', color: colors.primary }}>{item.food_name || 'Surplus Meal'}</Text>
          </Text>

          {/* CALL MODAL CONTENT */}
          {type === 'call' && (
            <View style={styles.contentBox}>
              <Text style={{ fontSize: 48, textAlign: 'center', marginVertical: 16 }}>📞</Text>
              <Text style={[styles.label, { color: colors.textPrimary, textAlign: 'center', fontSize: 16 }]}>
                {targetName}
              </Text>
              <Text style={[styles.phoneNumber, { color: colors.primary, textAlign: 'center' }]}>
                {targetPhone}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginVertical: 12 }}>
                Click below to initiate direct phone call for pickup coordination:
              </Text>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0284c7' }]} onPress={handleCallNumber}>
                <Text style={styles.actionBtnText}>📞 Call {targetPhone}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CHAT MODAL CONTENT */}
          {type === 'chat' && (
            <View style={styles.contentBox}>
              <ScrollView ref={chatScrollRef} style={styles.chatScroll} contentContainerStyle={{ paddingVertical: 10 }}>
                {chatMessages.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textSecondary, marginVertical: 20, fontSize: 13 }}>
                    💬 No messages yet. Send a message to start direct 1-on-1 chat!
                  </Text>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = currentUser?.role ? (msg.senderRole === currentUser.role) : (msg.senderName === currentUser?.name || msg.senderRole === 'user');
                    return (
                      <TouchableOpacity
                        key={msg.id}
                        activeOpacity={0.8}
                        onPress={() => handleOpenMsgAction(msg)}
                        style={[
                          styles.chatBubble,
                          isMe
                            ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                            : { alignSelf: 'flex-start', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.surfaceBorder },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isMe ? '#FFF' : colors.primary, marginBottom: 2 }}>
                          {isMe ? 'You' : `${msg.senderName || 'Member'} (${(msg.senderRole || 'User').toUpperCase()})`} • {msg.time} {msg.edited ? '(edited)' : ''}
                        </Text>
                        <Text style={{ fontSize: 13, color: isMe ? '#FFF' : colors.textPrimary }}>{msg.text}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}

              </ScrollView>

              {editingMsgId ? (
                <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: 6, borderRadius: 6, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#3b82f6', fontWeight: '800', fontSize: 11 }}>✏️ Editing Message...</Text>
                  <TouchableOpacity onPress={() => { setEditingMsgId(null); setInputMsg(''); }}>
                    <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 11 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.surfaceBorder }]}
                  placeholder={editingMsgId ? "Edit message..." : "Type your message..."}
                  placeholderTextColor={colors.textMuted}
                  value={inputMsg}
                  onChangeText={setInputMsg}
                />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: editingMsgId ? '#3b82f6' : colors.primary }]} onPress={handleSendChat}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>{editingMsgId ? 'Save' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}



          {/* VOICE NOTE MODAL CONTENT */}
          {type === 'voice' && (
            <View style={styles.contentBox}>
              <Text style={{ fontSize: 44, textAlign: 'center', marginTop: 10 }}>🎙️</Text>
              
              {voiceNotice ? (
                <Text style={{ color: isRecording ? '#ef4444' : colors.primary, textAlign: 'center', fontWeight: '700', marginVertical: 10, fontSize: 13 }}>
                  {voiceNotice}
                </Text>
              ) : (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 10, fontSize: 13 }}>
                  Record a quick audio message to explain pickup coordinates or food packaging details:
                </Text>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 12 }}>
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: isRecording ? '#ef4444' : '#8b5cf6' }]}
                  onPress={toggleRecording}
                >
                  <Text style={styles.actionBtnText}>{isRecording ? '⏹️ Stop Recording' : '🎙️ Record Voice Note'}</Text>
                </TouchableOpacity>

                {hasVoiceNote ? (
                  <TouchableOpacity style={[styles.recordBtn, { backgroundColor: '#10b981' }]} onPress={handlePlayVoice}>
                    <Text style={styles.actionBtnText}>{isPlaying ? '⏸️ Pause' : '▶️ Listen Note'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {hasVoiceNote ? (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={handleSendVoiceNote}>
                  <Text style={styles.actionBtnText}>🚀 Send Voice Message</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

        </View>
      </View>

      {/* Message Action Modal (Edit / Delete) */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, maxWidth: 320, padding: 16 }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
              {selectedMsgForAction?.isVoice ? '🎙️ Voice Note Options' : '💬 Message Options'}
            </Text>

            {canEditMessage(selectedMsgForAction) ? (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }} onPress={handleStartEditMsg}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#3b82f6' }}>Edit Message (Valid for 5 mins after seen)</Text>
              </TouchableOpacity>
            ) : null}



            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }} onPress={handleDeleteMsg}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ef4444' }}>
                {selectedMsgForAction?.isVoice ? 'Delete Voice Note' : 'Delete Message'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 }} onPress={() => setActionModalVisible(false)}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  subTitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  contentBox: {
    marginTop: 6,
  },
  phoneNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  chatScroll: {
    maxHeight: 220,
    marginBottom: 12,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  recordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
});

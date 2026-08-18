import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { useTheme } from '../../context/ThemeContext';
import { apiService } from '../../services/apiService';


export function ChatScreen({ user, onLogout }) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [playingMsgId, setPlayingMsgId] = useState(null);

  // Message Edit & Delete State
  const [selectedMsgForAction, setSelectedMsgForAction] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    fetchCommunityMessages();
    const unsub = apiService.subscribeToDonations(() => fetchCommunityMessages());
    const interval = setInterval(() => {
      fetchCommunityMessages();
    }, 3000);
    return () => {
      if (unsub) unsub();
      if (interval) clearInterval(interval);
    };
  }, []);


  const fetchCommunityMessages = () => {
    const commMsgs = apiService.getCommunityChatMessages();
    setMessages([...commMsgs]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    if (editingMsgId) {
      apiService.editCommunityChatMessage(editingMsgId, inputText.trim());
      setEditingMsgId(null);
    } else {
      apiService.sendCommunityChatMessage(user, inputText.trim(), false);
    }
    setInputText('');
    fetchCommunityMessages();
  };

  const handleToggleRecordVoice = () => {
    if (!isRecording) {
      setIsRecording(true);
      setVoiceNotice('🎙️ Recording voice message...');
    } else {
      setIsRecording(false);
      setVoiceNotice('');
      apiService.sendCommunityChatMessage(user, '🎙️ Voice Note (0:07)', true);
      fetchCommunityMessages();
    }
  };

  const handlePlayVoice = (msgId) => {
    if (playingMsgId === msgId) {
      setPlayingMsgId(null);
    } else {
      setPlayingMsgId(msgId);
      setTimeout(() => {
        setPlayingMsgId(null);
      }, 3000);
    }
  };

  const canEditMessage = (msg) => {
    if (!msg || msg.isVoice) return false;
    const isMe = user?.name ? (msg.senderName === user.name) : (msg.senderRole === user?.role);
    if (!isMe) return false;

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
    setInputText(selectedMsgForAction.text);
    setEditingMsgId(selectedMsgForAction.id);
    setActionModalVisible(false);
  };

  const handleDeleteMsg = () => {
    if (!selectedMsgForAction) return;
    apiService.deleteCommunityChatMessage(selectedMsgForAction.id);
    if (editingMsgId === selectedMsgForAction.id) {
      setEditingMsgId(null);
      setInputText('');
    }
    setActionModalVisible(false);
    fetchCommunityMessages();
  };

  // Group messages date-wise
  const groupMessagesByDay = () => {
    const grouped = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    messages.forEach(msg => {
      const d = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dStr = d.toDateString();
      let label = msg.dateStr || d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (dStr === todayStr) label = 'TODAY';
      else if (dStr === yesterdayStr) label = 'YESTERDAY';

      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(msg);
    });
    return grouped;
  };

  const groupedMsgs = groupMessagesByDay();
  const dayKeys = Object.keys(groupedMsgs);

  return (
    <MobileAppFrame>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 75 }}>
        <UserProfileHeader user={user} onLogout={onLogout} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>💬 Live Rescue Community Chat</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect and communicate live across all registered members (Tap any message to Edit/Delete)
          </Text>
        </View>

        {voiceNotice ? (
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 8, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>{voiceNotice}</Text>
          </View>
        ) : null}

        {editingMsgId ? (
          <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: 8, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#3b82f6', fontWeight: '800', fontSize: 12 }}>✏️ Editing Message...</Text>
            <TouchableOpacity onPress={() => { setEditingMsgId(null); setInputText(''); }}>
              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>Cancel Edit</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Chat Messages Scroll */}
        <ScrollView
          ref={scrollRef}
          style={[styles.chatBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {dayKeys.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Community Messages Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Send a text message below to broadcast live to all donors, NGOs, volunteers, and community members!
              </Text>
            </View>
          ) : (
            dayKeys.map((dayLabel) => (
              <View key={dayLabel} style={{ marginBottom: 16 }}>
                <View style={styles.dayBadgeBox}>
                  <Text style={styles.dayBadgeText}>📅 {dayLabel}</Text>
                </View>

                {groupedMsgs[dayLabel].map((msg) => {
                  const isMe = user?.name ? (msg.senderName === user.name) : (msg.senderRole === user?.role);

                  return (
                    <TouchableOpacity
                      key={msg.id}
                      activeOpacity={0.8}
                      onPress={() => handleOpenMsgAction(msg)}
                      style={[
                        styles.bubble,
                        isMe
                          ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                          : { alignSelf: 'flex-start', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.surfaceBorder },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isMe ? '#FFF' : colors.primary, marginBottom: 2 }}>
                        {isMe ? 'You' : `${msg.senderName} (${(msg.senderRole || 'User').toUpperCase()})`} • {msg.time} {msg.edited ? '(edited)' : ''}
                      </Text>

                      <Text style={{ fontSize: 13, color: isMe ? '#FFF' : colors.textPrimary, fontWeight: '500' }}>
                        {msg.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Bar elevated above bottom navigation tab bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            placeholder={editingMsgId ? "Edit your message..." : "Type live community message..."}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
          />

          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: editingMsgId ? '#3b82f6' : colors.primary }]} onPress={handleSendMessage}>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{editingMsgId ? 'Save' : 'Send'}</Text>

          </TouchableOpacity>
        </View>
      </View>

      {/* Message Action Modal (Edit / Delete) */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
              {selectedMsgForAction?.isVoice ? '🎙️ Voice Note Options' : '💬 Message Options'}
            </Text>

            {canEditMessage(selectedMsgForAction) ? (
              <TouchableOpacity style={styles.actionRowBtn} onPress={handleStartEditMsg}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
                <Text style={[styles.actionRowText, { color: '#3b82f6' }]}>Edit Message (Valid for 5 mins after seen)</Text>
              </TouchableOpacity>
            ) : null}



            <TouchableOpacity style={styles.actionRowBtn} onPress={handleDeleteMsg}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
              <Text style={[styles.actionRowText, { color: '#ef4444' }]}>
                {selectedMsgForAction?.isVoice ? 'Delete Voice Note' : 'Delete Message'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRowBtn, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 }]} onPress={() => setActionModalVisible(false)}>
              <Text style={[styles.actionRowText, { color: colors.textMuted, width: '100%', textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </MobileAppFrame>
  );
}



const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    marginBottom: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  chatBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
  },

  emptyBox: {
    alignItems: 'center',
    justify: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  dayBadgeBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 14,
  },
  voiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '800',
  },
});




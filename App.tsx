import * as React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Animated,
} from 'react-native';
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  BarVisualizer,
  useLocalParticipant,
  TrackReference,
  useRoom,
} from '@livekit/react-native';
import { Track, LocalParticipant } from 'livekit-client';
import { Audio } from 'expo-av';

// registerGlobals must be called prior to using LiveKit.
registerGlobals();

type ConnectionDetails = {
  participantToken: string;
  serverUrl: string;
};

type AgentState = 'disconnected' | 'connecting' | 'connected';

const LIVEKIT_URL = "wss://expo-ai-chatbot-jq0ubnkf.livekit.cloud";

function VoiceAssistant({ 
  onStateChange, 
  onDisconnect 
}: { 
  onStateChange: (state: AgentState) => void;
  onDisconnect: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [audioTrack, setAudioTrack] = useState<TrackReference | undefined>();
  const [state, setState] = useState<AgentState>('disconnected');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (localParticipant) {
      const publications = (localParticipant as LocalParticipant).getTrackPublications();
      const pub = publications.find(p => p.kind === Track.Kind.Audio);
      setState('connected');
      if (pub?.track) {
        setAudioTrack({
          participant: localParticipant,
          publication: pub,
          source: Track.Source.Microphone,
        });
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } else {
      setState('disconnected');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [localParticipant, fadeAnim]);

  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  return (
    <Animated.View style={[styles.visualizerContainer, { opacity: fadeAnim }]}>
      <BarVisualizer
        trackRef={audioTrack}
        barCount={5}
        style={styles.visualizer}
        options={{ minHeight: 24 }}
      />
      {state === 'connected' && (
        <TouchableOpacity 
          style={styles.disconnectButton}
          onPress={onDisconnect}
        >
          <Text style={styles.disconnectButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function App() {
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>();
  const [agentState, setAgentState] = useState<AgentState>('disconnected');
  const buttonFadeAnim = useRef(new Animated.Value(1)).current;

  const onConnectButtonClicked = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant microphone permission to start a conversation');
        return;
      }

      Animated.timing(buttonFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const connectionDetailsData = {
        serverUrl: LIVEKIT_URL,
        participantToken: await generateToken()
      };
      setConnectionDetails(connectionDetailsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
      console.error(error);
    }
  }, [buttonFadeAnim]);

  console.log('hey');
  // Helper function to generate a temporary token
  async function generateToken() {
    try {
      // Replace with your token server endpoint
      const response = await fetch('http://localhost:3001/api/connection-details');
      const { participantToken } = await response.json();
      console.log('token', participantToken);
      return participantToken;
    } catch (error) {
      // Fallback to a temporary token for testing
      console.log('error', error);
      return "eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tIjoidm9pY2VfYXNzaXN0YW50X3Jvb21fODQwNiIsInJvb21Kb2luIjp0cnVlLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5QdWJsaXNoRGF0YSI6dHJ1ZSwiY2FuU3Vic2NyaWJlIjp0cnVlfSwiaXNzIjoiQVBJZGNyQWM2eTN0N29pIiwiZXhwIjoxNzM5ODMyMTY2LCJuYmYiOjAsInN1YiI6InZvaWNlX2Fzc2lzdGFudF91c2VyXzcwMzgifQ.ztrqQu4zIDRk3RAb_3cIjftUutZ4zuwBY7yfGadUTVk";
    }
  }

  // Start the audio session first.
  useEffect(() => {
    let start = async () => {
      await AudioSession.startAudioSession();
    };

    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View style={styles.container}>
      {!connectionDetails ? (
        <Animated.View style={{ opacity: buttonFadeAnim }}>
          <TouchableOpacity 
            style={styles.connectButton} 
            onPress={onConnectButtonClicked}
          >
            <Text style={styles.buttonText}>Start a conversation</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <LiveKitRoom
          serverUrl={connectionDetails.serverUrl}
          token={connectionDetails.participantToken}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => {
            setAgentState('connected');
            console.log('room connected');
          }}
          onDisconnected={() => {
            setConnectionDetails(undefined);
            setAgentState('disconnected');
            Animated.timing(buttonFadeAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }).start();
            console.log('room disconnected');
          }}
        >
          <VoiceAssistant 
            onStateChange={setAgentState} 
            onDisconnect={() => setConnectionDetails(undefined)} 
          />
        </LiveKitRoom>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  connectButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  visualizerContainer: {
    height: 300,
    width: '90%',
    alignSelf: 'center',
  },
  visualizer: {
    flex: 1,
  },
  disconnectButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButtonText: {
    fontSize: 24,
    color: '#000',
  },
});
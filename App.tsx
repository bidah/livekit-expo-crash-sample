import * as React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useEffect, useCallback, useState } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  registerGlobals,
  useParticipants,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { MediaDeviceFailure } from 'livekit-client';

// registerGlobals must be called prior to using LiveKit.
registerGlobals();

type ConnectionDetails = {
  participantToken: string;
  serverUrl: string;
};

const LIVEKIT_URL = "wss://expo-ai-chatbot-jq0ubnkf.livekit.cloud";

export default function App() {
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>();
  const [agentState, setAgentState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const onConnectButtonClicked = useCallback(async () => {
    try {
      // For development, using hardcoded connection details
      // In production, this should come from your server
      const connectionDetailsData = {
        serverUrl: LIVEKIT_URL,
        // Generate a token using LiveKit CLI or server SDK
        participantToken: await generateToken()
      };
      setConnectionDetails(connectionDetailsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
      console.error(error);
    }
  }, []);

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
        <TouchableOpacity 
          style={styles.connectButton} 
          onPress={onConnectButtonClicked}
        >
          <Text style={styles.buttonText}>Start a conversation</Text>
        </TouchableOpacity>
      ) : (
        <LiveKitRoom
          serverUrl={connectionDetails.serverUrl}
          token={connectionDetails.participantToken}
          connect={true}
          options={{
            adaptiveStream: { pixelDensity: 'screen' },
          }}
          audio={true}
          video={false}
          onConnected={() => {
            setAgentState('connected');
            console.log('room connected');
          }}
          onDisconnected={() => {
            setConnectionDetails(undefined);
            setAgentState('disconnected');
            console.log('room disconnected');
          }}
        >
          <RoomContent onStateChange={setAgentState} />
        </LiveKitRoom>
      )}
    </View>
  );
}

const RoomContent = ({ 
  onStateChange 
}: { 
  onStateChange: (state: 'disconnected' | 'connecting' | 'connected') => void 
}) => {
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera]);

  const renderTrack: ListRenderItem<TrackReferenceOrPlaceholder> = ({item}) => {
    if(isTrackReference(item)) {
      return (<VideoTrack trackRef={item} style={styles.participantView} />)
    } else {
      return (<View style={styles.participantView} />)
    }
  };

  return (
    <View style={styles.roomContent}>
      <FlatList
        data={tracks}
        renderItem={renderTrack}
      />
    </View>
  );
};

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
  roomContent: {
    flex: 1,
    width: '100%',
  },
  participantView: {
    height: 300,
  },
});